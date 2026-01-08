<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/supabase";
  import Header from "$lib/components/layout/Header.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import {
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    XCircle,
    TrendingUp,
    TrendingDown,
    Download,
    Calendar,
    ArrowLeftRight,
    X,
    Eye,
  } from "lucide-svelte";

  interface MissingAlert {
    route: string;
    ttc_title?: string;
    ttc_effect?: string;
  }

  interface StaleAlert {
    route: string;
    frontend_title?: string;
    frontend_status?: string;
  }

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
    status: "healthy" | "warning" | "critical";
    error_message: string | null;
    missing_alerts?: MissingAlert[];
    stale_alerts?: StaleAlert[];
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

  interface TTCAlert {
    route: string;
    title: string;
    effect: string;
  }

  interface FrontendAlert {
    route: string;
    title: string;
    status: string;
  }

  interface ComparisonResult {
    ttc_alerts: TTCAlert[];
    frontend_alerts: FrontendAlert[];
    matched: number;
    missing: { route: string; ttc_title?: string; ttc_effect?: string }[];
    stale: {
      route: string;
      frontend_title?: string;
      frontend_status?: string;
    }[];
    completeness: number;
    precision: number;
    timestamp: string;
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

  // Comparison view state
  let showComparison = $state(false);
  let isLoadingComparison = $state(false);
  let comparisonResult: ComparisonResult | null = $state(null);
  let comparisonError = $state<string | null>(null);

  // Check details modal state
  let showCheckDetails = $state(false);
  let selectedCheckLog: AccuracyLog | null = $state(null);

  // Date selection - default to today
  let selectedDate = $state(new Date().toISOString().split("T")[0]);
  let availableDates: string[] = $state([]);
  let isViewingHistory = $state(false);

  async function fetchData() {
    try {
      // Fetch latest log
      const { data: latest, error: latestError } = await supabase
        .from("alert_accuracy_logs")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      if (latestError && latestError.code !== "PGRST116") throw latestError;
      latestLog = latest;

      // Fetch last 24 hours of logs for trend
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: logs, error: logsError } = await supabase
        .from("alert_accuracy_logs")
        .select("*")
        .gte("checked_at", twentyFourHoursAgo)
        .order("checked_at", { ascending: true });

      if (logsError) throw logsError;
      recentLogs = logs || [];

      // Fetch today's report
      const today = new Date().toISOString().split("T")[0];
      const { data: report, error: reportError } = await supabase
        .from("alert_accuracy_reports")
        .select("*")
        .eq("report_date", today)
        .single();

      if (reportError && reportError.code !== "PGRST116") throw reportError;
      todayReport = report;

      // Fetch available dates (for date picker)
      const { data: dates, error: datesError } = await supabase
        .from("alert_accuracy_reports")
        .select("report_date")
        .order("report_date", { ascending: false })
        .limit(30);

      if (!datesError && dates) {
        availableDates = (dates as { report_date: string }[]).map(
          (d) => d.report_date
        );
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to fetch data";
    } finally {
      isLoading = false;
    }
  }

  async function fetchDateData(date: string) {
    isLoadingDate = true;
    try {
      // Fetch report for selected date
      const { data: report, error: reportError } = await supabase
        .from("alert_accuracy_reports")
        .select("*")
        .eq("report_date", date)
        .single();

      if (reportError && reportError.code !== "PGRST116") throw reportError;
      selectedReport = report;

      // Fetch all logs for that date
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const { data: logs, error: logsError } = await supabase
        .from("alert_accuracy_logs")
        .select("*")
        .gte("checked_at", startOfDay)
        .lte("checked_at", endOfDay)
        .order("checked_at", { ascending: true });

      if (logsError) throw logsError;
      selectedDateLogs = logs || [];
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to fetch date data";
    } finally {
      isLoadingDate = false;
    }
  }

  function handleDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedDate = target.value;
    const today = new Date().toISOString().split("T")[0];
    isViewingHistory = selectedDate !== today;

    if (isViewingHistory) {
      fetchDateData(selectedDate);
    }
  }

  function downloadReport() {
    const dataToExport = isViewingHistory
      ? {
          date: selectedDate,
          report: selectedReport,
          logs: selectedDateLogs.map((log) => ({
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
            error_message: log.error_message,
          })),
        }
      : {
          date: new Date().toISOString().split("T")[0],
          report: todayReport,
          logs: recentLogs.map((log) => ({
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
            error_message: log.error_message,
          })),
        };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accuracy-report-${selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function fetchComparison() {
    isLoadingComparison = true;
    comparisonError = null;

    try {
      const response = await fetch(
        `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/monitor-alert-accuracy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch comparison");

      const data = await response.json();
      comparisonResult = data;
      showComparison = true;

      // Also refresh the main data
      await fetchData();
    } catch (e) {
      comparisonError =
        e instanceof Error ? e.message : "Failed to fetch comparison";
    } finally {
      isLoadingComparison = false;
    }
  }

  function closeComparison() {
    showComparison = false;
    comparisonResult = null;
  }

  function showCheckDetailsModal(log: AccuracyLog) {
    selectedCheckLog = log;
    showCheckDetails = true;
  }

  function closeCheckDetails() {
    showCheckDetails = false;
    selectedCheckLog = null;
  }

  async function triggerManualCheck() {
    isRefreshing = true;
    try {
      const response = await fetch(
        `https://wmchvmegxcpyfjcuzqzk.supabase.co/functions/v1/monitor-alert-accuracy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to run check");

      // Refresh data after check
      await fetchData();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to trigger check";
    } finally {
      isRefreshing = false;
    }
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;

    return date.toLocaleDateString();
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-amber-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "healthy":
        return CheckCircle;
      case "warning":
        return AlertTriangle;
      case "critical":
        return XCircle;
      default:
        return AlertTriangle;
    }
  }

  // Calculate trend (comparing last hour to previous hour)
  let completnessTrend = $derived.by(() => {
    if (recentLogs.length < 24) return 0; // Need at least 2 hours of data

    const lastHour = recentLogs.slice(-12);
    const previousHour = recentLogs.slice(-24, -12);

    const lastAvg =
      lastHour.reduce((sum, l) => sum + l.completeness, 0) / lastHour.length;
    const prevAvg =
      previousHour.reduce((sum, l) => sum + l.completeness, 0) /
      previousHour.length;

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
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
    >
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
            max={new Date().toISOString().split("T")[0]}
            class="bg-transparent text-sm border-none focus:outline-none focus:ring-0"
          />
        </div>

        <!-- Download JSON -->
        <Button
          variant="outline"
          size="sm"
          onclick={downloadReport}
          disabled={isLoading ||
            (isViewingHistory && selectedDateLogs.length === 0)}
        >
          <Download class="w-4 h-4 mr-2" />
          Export JSON
        </Button>

        <!-- Compare Side-by-Side (only show for today) -->
        {#if !isViewingHistory}
          <Button
            variant="outline"
            size="sm"
            onclick={fetchComparison}
            disabled={isLoadingComparison}
          >
            <ArrowLeftRight
              class="w-4 h-4 mr-2 {isLoadingComparison ? 'animate-pulse' : ''}"
            />
            {isLoadingComparison ? "Loading..." : "Compare"}
          </Button>
        {/if}

        <!-- Manual Check (only show for today) -->
        {#if !isViewingHistory}
          <Button
            variant="outline"
            size="sm"
            onclick={triggerManualCheck}
            disabled={isRefreshing}
          >
            <RefreshCw
              class="w-4 h-4 mr-2 {isRefreshing ? 'animate-spin' : ''}"
            />
            {isRefreshing ? "Checking..." : "Run Check"}
          </Button>
        {/if}
      </div>
    </div>

    <!-- History Banner -->
    {#if isViewingHistory}
      <div
        class="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg mb-4 flex items-center justify-between"
      >
        <span class="text-sm">
          Viewing history for <strong
            >{new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}</strong
          >
        </span>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => {
            selectedDate = new Date().toISOString().split("T")[0];
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
                {selectedReport?.avg_completeness?.toFixed(1) ?? "—"}%
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
                {selectedReport?.avg_precision?.toFixed(1) ?? "—"}%
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
              <p class="text-xs text-muted-foreground mt-1">Checks performed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">
                Issues Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                class="text-3xl font-bold {(selectedReport?.total_missing_instances ??
                  0) +
                  (selectedReport?.total_stale_instances ?? 0) >
                0
                  ? 'text-amber-600'
                  : ''}"
              >
                {(selectedReport?.total_missing_instances ?? 0) +
                  (selectedReport?.total_stale_instances ?? 0)}
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
                  {@const bgColor =
                    log.status === "healthy"
                      ? "bg-green-500"
                      : log.status === "warning"
                        ? "bg-amber-500"
                        : "bg-red-500"}
                  <div
                    class="flex-1 {bgColor} rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                    style="height: {height}%"
                    title="{formatTime(
                      log.checked_at
                    )}: {log.completeness}% complete"
                  ></div>
                {/each}
              </div>
              <div
                class="flex justify-between text-xs text-muted-foreground mt-2"
              >
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
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle class="text-sm font-medium"
              >All Checks ({selectedDateLogs.length})</CardTitle
            >
            <Button
              variant="outline"
              size="sm"
              onclick={fetchComparison}
              disabled={isLoadingComparison}
            >
              <ArrowLeftRight
                class="w-4 h-4 mr-2 {isLoadingComparison
                  ? 'animate-pulse'
                  : ''}"
              />
              {isLoadingComparison ? "Loading..." : "Compare Now (Live)"}
            </Button>
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
                    <th class="text-center py-2 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each selectedDateLogs.slice().reverse() as log}
                    {@const LogStatusIcon = getStatusIcon(log.status)}
                    <tr class="border-b border-border/50 hover:bg-muted/50">
                      <td class="py-2 px-2 text-muted-foreground">
                        {formatTime(log.checked_at)}
                      </td>
                      <td class="py-2 px-2 text-right">{log.ttc_alert_count}</td
                      >
                      <td class="py-2 px-2 text-right"
                        >{log.frontend_alert_count}</td
                      >
                      <td class="py-2 px-2 text-right">{log.matched_count}</td>
                      <td class="py-2 px-2 text-right">{log.completeness}%</td>
                      <td class="py-2 px-2 text-right">
                        <span
                          class="inline-flex items-center gap-1 {getStatusColor(
                            log.status
                          )}"
                        >
                          <LogStatusIcon class="w-3 h-3" />
                          <span class="capitalize">{log.status}</span>
                        </span>
                      </td>
                      <td class="py-2 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-7 px-2"
                          onclick={() => showCheckDetailsModal(log)}
                        >
                          <Eye class="w-4 h-4" />
                        </Button>
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
          <div class="text-muted-foreground">
            No data available for this date
          </div>
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
                {latestLog?.completeness?.toFixed(1) ?? "—"}%
              </span>
              {#if completnessTrend !== 0}
                <span
                  class="text-sm {completnessTrend > 0
                    ? 'text-green-600'
                    : 'text-red-600'} flex items-center"
                >
                  {#if completnessTrend > 0}
                    <TrendingUp class="w-3 h-3 mr-1" />
                  {:else}
                    <TrendingDown class="w-3 h-3 mr-1" />
                  {/if}
                  {completnessTrend > 0 ? "+" : ""}{completnessTrend}%
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
              {latestLog?.precision?.toFixed(1) ?? "—"}%
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
            <div
              class="text-3xl font-bold {(latestLog?.missing_count ?? 0) > 0
                ? 'text-amber-600'
                : ''}"
            >
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
            <div
              class="text-3xl font-bold {(latestLog?.stale_count ?? 0) > 0
                ? 'text-red-600'
                : ''}"
            >
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
                <StatusIcon
                  class="w-8 h-8 {getStatusColor(latestLog.status)}"
                />
                <div>
                  <div
                    class="font-semibold capitalize {getStatusColor(
                      latestLog.status
                    )}"
                  >
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
                  <div class="font-semibold">
                    {todayReport.avg_completeness?.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div class="text-muted-foreground">Missing Instances</div>
                  <div class="font-semibold">
                    {todayReport.total_missing_instances}
                  </div>
                </div>
                <div>
                  <div class="text-muted-foreground">Stale Instances</div>
                  <div class="font-semibold">
                    {todayReport.total_stale_instances}
                  </div>
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
                {@const bgColor =
                  log.status === "healthy"
                    ? "bg-green-500"
                    : log.status === "warning"
                      ? "bg-amber-500"
                      : "bg-red-500"}
                <div
                  class="flex-1 {bgColor} rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  style="height: {height}%"
                  title="{formatTime(
                    log.checked_at
                  )}: {log.completeness}% complete"
                ></div>
              {/each}
            </div>
            <div
              class="flex justify-between text-xs text-muted-foreground mt-2"
            >
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
        <CardHeader class="flex flex-row items-center justify-between">
          <CardTitle class="text-sm font-medium">Recent Checks</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onclick={fetchComparison}
            disabled={isLoadingComparison}
          >
            <ArrowLeftRight
              class="w-4 h-4 mr-2 {isLoadingComparison ? 'animate-pulse' : ''}"
            />
            {isLoadingComparison ? "Loading..." : "Compare Now"}
          </Button>
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
                  <th class="text-center py-2 px-2 font-medium">Actions</th>
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
                    <td class="py-2 px-2 text-right"
                      >{log.frontend_alert_count}</td
                    >
                    <td class="py-2 px-2 text-right">{log.matched_count}</td>
                    <td class="py-2 px-2 text-right">{log.completeness}%</td>
                    <td class="py-2 px-2 text-right">
                      <span
                        class="inline-flex items-center gap-1 {getStatusColor(
                          log.status
                        )}"
                      >
                        <LogStatusIcon class="w-3 h-3" />
                        <span class="capitalize">{log.status}</span>
                      </span>
                    </td>
                    <td class="py-2 px-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-7 px-2"
                        onclick={() => showCheckDetailsModal(log)}
                      >
                        <Eye class="w-4 h-4" />
                      </Button>
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

<!-- Side-by-Side Comparison Modal -->
{#if showComparison && comparisonResult}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    onclick={closeComparison}
    role="button"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="bg-zinc-900 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-700"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
      tabindex="-1"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-zinc-700 bg-zinc-800"
      >
        <div>
          <h2 class="text-xl font-bold text-white">Side-by-Side Comparison</h2>
          <p class="text-sm text-zinc-400">
            {new Date(comparisonResult.timestamp).toLocaleString()} •
            <span class="text-green-400"
              >{comparisonResult.matched} matched</span
            >
            •
            <span
              class={comparisonResult.missing.length > 0
                ? "text-amber-400"
                : "text-zinc-400"}
              >{comparisonResult.missing.length} missing</span
            >
            •
            <span
              class={comparisonResult.stale.length > 0
                ? "text-red-400"
                : "text-zinc-400"}>{comparisonResult.stale.length} stale</span
            >
          </p>
        </div>
        <Button variant="ghost" size="sm" onclick={closeComparison}>
          <X class="w-5 h-5" />
        </Button>
      </div>

      <!-- Comparison Content -->
      <div class="flex-1 overflow-auto p-6 bg-zinc-900">
        <div class="grid md:grid-cols-2 gap-6">
          <!-- TTC API Alerts -->
          <div>
            <h3 class="font-semibold mb-3 flex items-center gap-2 text-white">
              <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
              TTC API Alerts ({comparisonResult.ttc_alerts.length})
            </h3>
            <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {#each comparisonResult.ttc_alerts as alert}
                {@const isMissing = comparisonResult.missing.some(
                  (m) => m.route === alert.route && m.ttc_title === alert.title
                )}
                <div
                  class="p-3 rounded-lg border {isMissing
                    ? 'bg-amber-900/50 border-amber-700'
                    : 'bg-zinc-800 border-zinc-700'}"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div
                        class="font-semibold text-sm flex items-center gap-2"
                      >
                        <span
                          class="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold"
                        >
                          {alert.route}
                        </span>
                        <span
                          class="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300"
                        >
                          {alert.effect}
                        </span>
                      </div>
                      <p
                        class="text-sm text-zinc-400 mt-1 truncate"
                        title={alert.title}
                      >
                        {alert.title}
                      </p>
                    </div>
                    {#if isMissing}
                      <span
                        class="text-xs text-amber-300 bg-amber-900/70 px-2 py-0.5 rounded whitespace-nowrap"
                      >
                        Missing in Frontend
                      </span>
                    {:else}
                      <span
                        class="text-xs text-green-300 bg-green-900/70 px-2 py-0.5 rounded whitespace-nowrap"
                      >
                        ✓ Matched
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
              {#if comparisonResult.ttc_alerts.length === 0}
                <div class="text-center text-zinc-500 py-8">
                  No alerts from TTC API
                </div>
              {/if}
            </div>
          </div>

          <!-- Frontend Alerts -->
          <div>
            <h3 class="font-semibold mb-3 flex items-center gap-2 text-white">
              <span class="w-3 h-3 bg-green-500 rounded-full"></span>
              Frontend Alerts ({comparisonResult.frontend_alerts.length})
            </h3>
            <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {#each comparisonResult.frontend_alerts as alert}
                {@const isStale = comparisonResult.stale.some(
                  (s) =>
                    s.route === alert.route && s.frontend_title === alert.title
                )}
                <div
                  class="p-3 rounded-lg border {isStale
                    ? 'bg-red-900/50 border-red-700'
                    : 'bg-zinc-800 border-zinc-700'}"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div
                        class="font-semibold text-sm flex items-center gap-2"
                      >
                        <span
                          class="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold"
                        >
                          {alert.route}
                        </span>
                        <span
                          class="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300"
                        >
                          {alert.status}
                        </span>
                      </div>
                      <p
                        class="text-sm text-zinc-400 mt-1 truncate"
                        title={alert.title}
                      >
                        {alert.title}
                      </p>
                    </div>
                    {#if isStale}
                      <span
                        class="text-xs text-red-300 bg-red-900/70 px-2 py-0.5 rounded whitespace-nowrap"
                      >
                        Not in TTC API
                      </span>
                    {:else}
                      <span
                        class="text-xs text-green-300 bg-green-900/70 px-2 py-0.5 rounded whitespace-nowrap"
                      >
                        ✓ Matched
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
              {#if comparisonResult.frontend_alerts.length === 0}
                <div class="text-center text-zinc-500 py-8">
                  No alerts in frontend
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Summary Stats -->
        <div
          class="mt-6 pt-6 border-t border-zinc-700 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div class="text-center">
            <div class="text-2xl font-bold text-white">
              {comparisonResult.completeness.toFixed(1)}%
            </div>
            <div class="text-sm text-zinc-400">Completeness</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-white">
              {comparisonResult.precision.toFixed(1)}%
            </div>
            <div class="text-sm text-zinc-400">Precision</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-amber-400">
              {comparisonResult.missing.length}
            </div>
            <div class="text-sm text-zinc-400">Missing from Frontend</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-400">
              {comparisonResult.stale.length}
            </div>
            <div class="text-sm text-zinc-400">Stale in Frontend</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex justify-end gap-2 px-6 py-4 border-t border-zinc-700 bg-zinc-800"
      >
        <Button variant="outline" onclick={closeComparison}>Close</Button>
        <Button onclick={fetchComparison} disabled={isLoadingComparison}>
          <RefreshCw
            class="w-4 h-4 mr-2 {isLoadingComparison ? 'animate-spin' : ''}"
          />
          Refresh
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Check Details Modal -->
{#if showCheckDetails && selectedCheckLog}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    onclick={closeCheckDetails}
    role="button"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="bg-zinc-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-zinc-700"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="check-details-title"
      tabindex="-1"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-zinc-700 bg-zinc-800"
      >
        <div>
          <h2 id="check-details-title" class="text-lg font-bold text-white">
            Check Details
          </h2>
          <p class="text-sm text-zinc-400">
            {new Date(selectedCheckLog.checked_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onclick={closeCheckDetails}
          class="text-zinc-400 hover:text-white"
        >
          <X class="w-5 h-5" />
        </Button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        {#if selectedCheckLog}
          {@const StatusIcon = getStatusIcon(selectedCheckLog.status)}

          <!-- Status Badge -->
          <div
            class="flex items-center justify-center gap-2 py-3 px-4 rounded-lg {selectedCheckLog.status ===
            'healthy'
              ? 'bg-emerald-500/20 text-emerald-400'
              : selectedCheckLog.status === 'warning'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400'}"
          >
            <StatusIcon class="w-5 h-5" />
            <span class="font-semibold capitalize"
              >{selectedCheckLog.status}</span
            >
          </div>
        {/if}

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-zinc-800 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-white">
              {selectedCheckLog.ttc_alert_count}
            </div>
            <div class="text-xs text-zinc-400">TTC API Alerts</div>
          </div>
          <div class="bg-zinc-800 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-white">
              {selectedCheckLog.frontend_alert_count}
            </div>
            <div class="text-xs text-zinc-400">Frontend Alerts</div>
          </div>
          <div class="bg-zinc-800 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-emerald-400">
              {selectedCheckLog.matched_count}
            </div>
            <div class="text-xs text-zinc-400">Matched</div>
          </div>
          <div class="bg-zinc-800 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-400">
              {selectedCheckLog.completeness}%
            </div>
            <div class="text-xs text-zinc-400">Completeness</div>
          </div>
          <div class="bg-zinc-800 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-amber-400">
              {selectedCheckLog.missing_count}
            </div>
            <div class="text-xs text-zinc-400">Missing Alerts</div>
          </div>
          <div class="bg-zinc-800 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-400">
              {selectedCheckLog.stale_count}
            </div>
            <div class="text-xs text-zinc-400">Stale Alerts</div>
          </div>
        </div>

        <!-- Precision -->
        <div class="bg-zinc-800 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-purple-400">
            {selectedCheckLog.precision}%
          </div>
          <div class="text-xs text-zinc-400">Precision (Non-Stale Rate)</div>
        </div>

        {#if selectedCheckLog.error_message}
          <div class="bg-red-500/20 text-red-400 rounded-lg p-3 text-sm">
            <strong>Error:</strong>
            {selectedCheckLog.error_message}
          </div>
        {/if}

        <!-- Missing Alerts Details -->
        {#if selectedCheckLog.missing_alerts && Array.isArray(selectedCheckLog.missing_alerts) && selectedCheckLog.missing_alerts.length > 0}
          <div class="border-t border-zinc-700 pt-4">
            <h4 class="text-sm font-medium text-amber-400 mb-2">
              Missing Alerts ({selectedCheckLog.missing_alerts.length})
            </h4>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              {#each selectedCheckLog.missing_alerts as alert}
                <div
                  class="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-xs"
                >
                  <span class="font-semibold text-amber-300">{alert.route}</span
                  >
                  <span class="text-zinc-400 ml-2">{alert.ttc_effect}</span>
                  <p class="text-zinc-300 mt-1">{alert.ttc_title}</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Stale Alerts Details -->
        {#if selectedCheckLog.stale_alerts && Array.isArray(selectedCheckLog.stale_alerts) && selectedCheckLog.stale_alerts.length > 0}
          <div class="border-t border-zinc-700 pt-4">
            <h4 class="text-sm font-medium text-red-400 mb-2">
              Stale Alerts ({selectedCheckLog.stale_alerts.length})
            </h4>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              {#each selectedCheckLog.stale_alerts as alert}
                <div
                  class="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs"
                >
                  <span class="font-semibold text-red-300">{alert.route}</span>
                  <span class="text-zinc-400 ml-2">{alert.frontend_status}</span
                  >
                  <p class="text-zinc-300 mt-1">{alert.frontend_title}</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="flex justify-between gap-2 px-6 py-4 border-t border-zinc-700 bg-zinc-800"
      >
        <Button variant="outline" onclick={closeCheckDetails}>Close</Button>
        <Button
          onclick={() => {
            closeCheckDetails();
            fetchComparison();
          }}
          disabled={isLoadingComparison}
        >
          <ArrowLeftRight class="w-4 h-4 mr-2" />
          Compare Live
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Comparison Error Toast -->
{#if comparisonError}
  <div
    class="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
  >
    {comparisonError}
    <button
      class="ml-2 text-white/80 hover:text-white"
      onclick={() => (comparisonError = null)}>×</button
    >
  </div>
{/if}
