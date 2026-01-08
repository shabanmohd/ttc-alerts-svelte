<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/supabase";
  import Header from "$lib/components/layout/Header.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { RefreshCw, CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, Download, Calendar } from "lucide-svelte";

  interface AccuracyLog {
    id: number;
    checked_at: string;
    ttc_alert_count: number;
    frontend_alert_count: number;
    matched_count: number;
    completeness: number;
    precision: number;
    missing_count: number;
    stale_count: number;
    status: 'healthy' | 'warning' | 'critical';
    error_message: string | null;
    missing_alerts?: unknown;
    stale_alerts?: unknown;
  }

  interface DailyReport {
    id: number;
    report_date: string;
    total_checks: number;
    avg_completeness: number;
    avg_precision: number;
    total_missing_instances: number;
    total_stale_instances: number;
  }

  let latestLog: AccuracyLog | null = $state(null);
  let recentLogs: AccuracyLog[] = $state([]);
  let todayReport: DailyReport | null = $state(null);
  let selectedReport: DailyReport | null = $state(null);
  let selectedDateLogs: AccuracyLog[] = $state([]);
  let isLoading = $state(true);
  let isRefreshing = $state(false);
  let isLoadingDate = $state(false);
  let error = $state<string | null>(null);
  
  // Date selection - default to today
  let selectedDate = $state(new Date().toISOString().split('T')[0]);
  let availableDates: string[] = $state([]);
  let isViewingHistory = $state(false);

  async function fetchData() {
    try {
      // Fetch latest log
      const { data: latest, error: latestError } = await supabase
        .from('alert_accuracy_logs')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      if (latestError && latestError.code !== 'PGRST116') throw latestError;
      latestLog = latest;

      // Fetch last 24 hours of logs for trend
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: logs, error: logsError } = await supabase
        .from('alert_accuracy_logs')
        .select('*')
        .gte('checked_at', twentyFourHoursAgo)
        .order('checked_at', { ascending: true });

      if (logsError) throw logsError;
      recentLogs = logs || [];

      // Fetch today's report
      const today = new Date().toISOString().split('T')[0];
      const { data: report, error: reportError } = await supabase
        .from('alert_accuracy_reports')
        .select('*')
        .eq('report_date', today)
        .single();

      if (reportError && reportError.code !== 'PGRST116') throw reportError;
      todayReport = report;
      
      // Fetch available dates (for date picker)
      const { data: dates, error: datesError } = await supabase
        .from('alert_accuracy_reports')
        .select('report_date')
        .order('report_date', { ascending: false })
        .limit(30);
      
      if (!datesError && dates) {
        availableDates = (dates as { report_date: string }[]).map(d => d.report_date);
      }

    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch data';
    } finally {
      isLoading = false;
    }
  }
  
  async function fetchDateData(date: string) {
    isLoadingDate = true;
    try {
      // Fetch report for selected date
      const { data: report, error: reportError } = await supabase
        .from('alert_accuracy_reports')
        .select('*')
        .eq('report_date', date)
        .single();
      
      if (reportError && reportError.code !== 'PGRST116') throw reportError;
      selectedReport = report;
      
      // Fetch all logs for that date
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      
      const { data: logs, error: logsError } = await supabase
        .from('alert_accuracy_logs')
        .select('*')
        .gte('checked_at', startOfDay)
        .lte('checked_at', endOfDay)
        .order('checked_at', { ascending: true });
      
      if (logsError) throw logsError;
      selectedDateLogs = logs || [];
      
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch date data';
    } finally {
      isLoadingDate = false;
    }
  }
  
  function handleDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedDate = target.value;
    const today = new Date().toISOString().split('T')[0];
    isViewingHistory = selectedDate !== today;
    
    if (isViewingHistory) {
      fetchDateData(selectedDate);
    }
  }
  
  function downloadReport() {
    const dataToExport = isViewingHistory ? {
      date: selectedDate,
      report: selectedReport,
      logs: selectedDateLogs.map(log => ({
        checked_at: log.checked_at,
        ttc_alert_count: log.ttc_alert_count,
        frontend_alert_count: log.frontend_alert_count,
        matched_count: log.matched_count,
        completeness: log.completeness,
        precision: log.precision,
        missing_count: log.missing_count,
        stale_count: log.stale_count,
        status: log.status,
        missing_alerts: log.missing_alerts,
        stale_alerts: log.stale_alerts,
        error_message: log.error_message
      }))
    } : {
      date: new Date().toISOString().split('T')[0],
      report: todayReport,
      logs: recentLogs.map(log => ({
        checked_at: log.checked_at,
        ttc_alert_count: log.ttc_alert_count,
        frontend_alert_count: log.frontend_alert_count,
        matched_count: log.matched_count,
        completeness: log.completeness,
        precision: log.precision,
        missing_count: log.missing_count,
        stale_count: log.stale_count,
        status: log.status,
        missing_alerts: log.missing_alerts,
        stale_alerts: log.stale_alerts,
        error_message: log.error_message
      }))
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accuracy-report-${selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function triggerManualCheck() {
    isRefreshing = true;
    try {
      const response = await fetch(
        `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/monitor-alert-accuracy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to run check');
      
      // Refresh data after check
      await fetchData();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to trigger check';
    } finally {
      isRefreshing = false;
    }
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    
    return date.toLocaleDateString();
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      default: return AlertTriangle;
    }
  }

  // Calculate trend (comparing last hour to previous hour)
  let completnessTrend = $derived.by(() => {
    if (recentLogs.length < 24) return 0; // Need at least 2 hours of data
    
    const lastHour = recentLogs.slice(-12);
    const previousHour = recentLogs.slice(-24, -12);
    
    const lastAvg = lastHour.reduce((sum, l) => sum + l.completeness, 0) / lastHour.length;
    const prevAvg = previousHour.reduce((sum, l) => sum + l.completeness, 0) / previousHour.length;
    
    return Math.round((lastAvg - prevAvg) * 10) / 10;
  });

  onMount(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>Alert Accuracy Monitor | TTC Alerts</title>
</svelte:head>

<div class="min-h-screen bg-background">
  <Header />
  
  <main class="container mx-auto px-4 py-6 max-w-6xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Alert Accuracy Monitor</h1>
        <p class="text-muted-foreground text-sm">
          Compares TTC API alerts vs frontend display
        </p>
      </div>
      
      <div class="flex flex-wrap items-center gap-2">
        <!-- Date Picker -->
        <div class="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1.5">
          <Calendar class="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            bind:value={selectedDate}
            onchange={handleDateChange}
            max={new Date().toISOString().split('T')[0]}
            class="bg-transparent text-sm border-none focus:outline-none focus:ring-0"
          />
        </div>
        
        <!-- Download JSON -->
        <Button 
          variant="outline" 
          size="sm"
          onclick={downloadReport}
          disabled={isLoading || (isViewingHistory && selectedDateLogs.length === 0)}
        >
          <Download class="w-4 h-4 mr-2" />
          Export JSON
        </Button>
        
        <!-- Manual Check (only show for today) -->
        {#if !isViewingHistory}
          <Button 
            variant="outline" 
            size="sm" 
            onclick={triggerManualCheck}
            disabled={isRefreshing}
          >
            <RefreshCw class="w-4 h-4 mr-2 {isRefreshing ? 'animate-spin' : ''}" />
            {isRefreshing ? 'Checking...' : 'Run Check'}
          </Button>
        {/if}
      </div>
    </div>
    
    <!-- History Banner -->
    {#if isViewingHistory}
      <div class="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg mb-4 flex items-center justify-between">
        <span class="text-sm">
          Viewing history for <strong>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>
        </span>
        <Button 
          variant="ghost" 
          size="sm"
          onclick={() => {
            selectedDate = new Date().toISOString().split('T')[0];
            isViewingHistory = false;
          }}
        >
          Back to Today
        </Button>
      </div>
    {/if}

    {#if isLoading || isLoadingDate}
      <div class="flex items-center justify-center py-12">
        <RefreshCw class="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    {:else if isViewingHistory}
      <!-- Historical View -->
      {#if selectedReport || selectedDateLogs.length > 0}
        <!-- Day Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Avg Completeness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-3xl font-bold">
                {selectedReport?.avg_completeness?.toFixed(1) ?? '—'}%
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                Average for the day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Avg Precision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-3xl font-bold">
                {selectedReport?.avg_precision?.toFixed(1) ?? '—'}%
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                Average for the day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Total Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-3xl font-bold">
                {selectedReport?.total_checks ?? selectedDateLogs.length}
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                Checks performed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Issues Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-3xl font-bold {(selectedReport?.total_missing_instances ?? 0) + (selectedReport?.total_stale_instances ?? 0) > 0 ? 'text-amber-600' : ''}">
                {(selectedReport?.total_missing_instances ?? 0) + (selectedReport?.total_stale_instances ?? 0)}
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                Missing + stale alerts
              </p>
            </CardContent>
          </Card>
        </div>

        <!-- Day Timeline -->
        <Card class="mb-6">
          <CardHeader>
            <CardTitle class="text-sm font-medium">Day Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {#if selectedDateLogs.length > 0}
              <div class="h-24 flex items-end gap-px">
                {#each selectedDateLogs as log}
                  {@const height = Math.max(10, log.completeness)}
                  {@const bgColor = log.status === 'healthy' ? 'bg-green-500' : 
                                    log.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}
                  <div 
                    class="flex-1 {bgColor} rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                    style="height: {height}%"
                    title="{formatTime(log.checked_at)}: {log.completeness}% complete"
                  ></div>
                {/each}
              </div>
              <div class="flex justify-between text-xs text-muted-foreground mt-2">
                <span>12:00 AM</span>
                <span>11:59 PM</span>
              </div>
            {:else}
              <div class="text-center text-muted-foreground py-8">
                No data for this date
              </div>
            {/if}
          </CardContent>
        </Card>

        <!-- Historical Checks Table -->
        <Card>
          <CardHeader>
            <CardTitle class="text-sm font-medium">All Checks ({selectedDateLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto max-h-96">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-background">
                  <tr class="border-b">
                    <th class="text-left py-2 px-2 font-medium">Time</th>
                    <th class="text-right py-2 px-2 font-medium">TTC</th>
                    <th class="text-right py-2 px-2 font-medium">Frontend</th>
                    <th class="text-right py-2 px-2 font-medium">Matched</th>
                    <th class="text-right py-2 px-2 font-medium">Complete</th>
                    <th class="text-right py-2 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each selectedDateLogs.slice().reverse() as log}
                    {@const LogStatusIcon = getStatusIcon(log.status)}
                    <tr class="border-b border-border/50 hover:bg-muted/50">
                      <td class="py-2 px-2 text-muted-foreground">
                        {formatTime(log.checked_at)}
                      </td>
                      <td class="py-2 px-2 text-right">{log.ttc_alert_count}</td>
                      <td class="py-2 px-2 text-right">{log.frontend_alert_count}</td>
                      <td class="py-2 px-2 text-right">{log.matched_count}</td>
                      <td class="py-2 px-2 text-right">{log.completeness}%</td>
                      <td class="py-2 px-2 text-right">
                        <span class="inline-flex items-center gap-1 {getStatusColor(log.status)}">
                          <LogStatusIcon class="w-3 h-3" />
                          <span class="capitalize">{log.status}</span>
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      {:else}
        <div class="text-center py-12">
          <div class="text-muted-foreground">No data available for this date</div>
        </div>
      {/if}
    {:else}
      <!-- Current Status Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <!-- Completeness -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">
              Completeness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold">
                {latestLog?.completeness?.toFixed(1) ?? '—'}%
              </span>
              {#if completnessTrend !== 0}
                <span class="text-sm {completnessTrend > 0 ? 'text-green-600' : 'text-red-600'} flex items-center">
                  {#if completnessTrend > 0}
                    <TrendingUp class="w-3 h-3 mr-1" />
                  {:else}
                    <TrendingDown class="w-3 h-3 mr-1" />
                  {/if}
                  {completnessTrend > 0 ? '+' : ''}{completnessTrend}%
                </span>
              {/if}
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              TTC alerts shown in frontend
            </p>
          </CardContent>
        </Card>

        <!-- Precision -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">
              Precision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">
              {latestLog?.precision?.toFixed(1) ?? '—'}%
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              Frontend alerts that are real
            </p>
          </CardContent>
        </Card>

        <!-- Missing -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">
              Missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold {(latestLog?.missing_count ?? 0) > 0 ? 'text-amber-600' : ''}">
              {latestLog?.missing_count ?? 0}
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              TTC alerts not in frontend
            </p>
          </CardContent>
        </Card>

        <!-- Stale -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium text-muted-foreground">
              Stale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold {(latestLog?.stale_count ?? 0) > 0 ? 'text-red-600' : ''}">
              {latestLog?.stale_count ?? 0}
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              Frontend alerts not in TTC
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Status & Last Check -->
      <div class="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            {#if latestLog}
              {@const StatusIcon = getStatusIcon(latestLog.status)}
              <div class="flex items-center gap-3">
                <StatusIcon class="w-8 h-8 {getStatusColor(latestLog.status)}" />
                <div>
                  <div class="font-semibold capitalize {getStatusColor(latestLog.status)}">
                    {latestLog.status}
                  </div>
                  <div class="text-sm text-muted-foreground">
                    Last check: {formatTimeAgo(latestLog.checked_at)}
                  </div>
                </div>
              </div>
            {:else}
              <div class="text-muted-foreground">No data yet</div>
            {/if}
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm font-medium">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {#if todayReport}
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div class="text-muted-foreground">Checks</div>
                  <div class="font-semibold">{todayReport.total_checks}</div>
                </div>
                <div>
                  <div class="text-muted-foreground">Avg Completeness</div>
                  <div class="font-semibold">{todayReport.avg_completeness?.toFixed(1)}%</div>
                </div>
                <div>
                  <div class="text-muted-foreground">Missing Instances</div>
                  <div class="font-semibold">{todayReport.total_missing_instances}</div>
                </div>
                <div>
                  <div class="text-muted-foreground">Stale Instances</div>
                  <div class="font-semibold">{todayReport.total_stale_instances}</div>
                </div>
              </div>
            {:else}
              <div class="text-muted-foreground">No data for today</div>
            {/if}
          </CardContent>
        </Card>
      </div>

      <!-- 24-Hour Timeline -->
      <Card class="mb-6">
        <CardHeader>
          <CardTitle class="text-sm font-medium">24-Hour Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {#if recentLogs.length > 0}
            <div class="h-24 flex items-end gap-px">
              {#each recentLogs.slice(-96) as log}
                {@const height = Math.max(10, log.completeness)}
                {@const bgColor = log.status === 'healthy' ? 'bg-green-500' : 
                                  log.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}
                <div 
                  class="flex-1 {bgColor} rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  style="height: {height}%"
                  title="{formatTime(log.checked_at)}: {log.completeness}% complete"
                ></div>
              {/each}
            </div>
            <div class="flex justify-between text-xs text-muted-foreground mt-2">
              <span>24h ago</span>
              <span>Now</span>
            </div>
          {:else}
            <div class="text-center text-muted-foreground py-8">
              Not enough data for timeline yet
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Recent Checks Table -->
      <Card>
        <CardHeader>
          <CardTitle class="text-sm font-medium">Recent Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b">
                  <th class="text-left py-2 px-2 font-medium">Time</th>
                  <th class="text-right py-2 px-2 font-medium">TTC</th>
                  <th class="text-right py-2 px-2 font-medium">Frontend</th>
                  <th class="text-right py-2 px-2 font-medium">Matched</th>
                  <th class="text-right py-2 px-2 font-medium">Complete</th>
                  <th class="text-right py-2 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {#each recentLogs.slice(-20).reverse() as log}
                  {@const LogStatusIcon = getStatusIcon(log.status)}
                  <tr class="border-b border-border/50 hover:bg-muted/50">
                    <td class="py-2 px-2 text-muted-foreground">
                      {formatTime(log.checked_at)}
                    </td>
                    <td class="py-2 px-2 text-right">{log.ttc_alert_count}</td>
                    <td class="py-2 px-2 text-right">{log.frontend_alert_count}</td>
                    <td class="py-2 px-2 text-right">{log.matched_count}</td>
                    <td class="py-2 px-2 text-right">{log.completeness}%</td>
                    <td class="py-2 px-2 text-right">
                      <span class="inline-flex items-center gap-1 {getStatusColor(log.status)}">
                        <LogStatusIcon class="w-3 h-3" />
                        <span class="capitalize">{log.status}</span>
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    {/if}
  </main>
</div>
