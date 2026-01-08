-- Alert Accuracy Monitoring Tables
-- Created: January 8, 2026
-- Purpose: Track accuracy of frontend alerts vs TTC API

-- Table: alert_accuracy_logs
-- Stores summary metrics for each monitoring check (every 5 minutes)
CREATE TABLE IF NOT EXISTS alert_accuracy_logs (
  id SERIAL PRIMARY KEY,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Counts
  ttc_alert_count INTEGER NOT NULL DEFAULT 0,
  frontend_alert_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metrics (percentages: 95.5 = 95.5%)
  completeness DECIMAL(5,2) DEFAULT 0,
  precision DECIMAL(5,2) DEFAULT 0,
  
  -- Summary counts
  missing_count INTEGER DEFAULT 0,
  stale_count INTEGER DEFAULT 0,
  
  -- Status classification
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical')),
  
  -- Duration of check in milliseconds
  duration_ms INTEGER DEFAULT 0,
  
  -- Error message if check failed
  error_message TEXT DEFAULT NULL
);

-- Index for dashboard queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_accuracy_logs_checked_at ON alert_accuracy_logs(checked_at DESC);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_accuracy_logs_status ON alert_accuracy_logs(status);

-- Table: alert_accuracy_reports
-- Stores metadata about daily JSON reports (the actual reports are in R2/Storage)
CREATE TABLE IF NOT EXISTS alert_accuracy_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Daily summary metrics
  total_checks INTEGER DEFAULT 0,
  avg_completeness DECIMAL(5,2) DEFAULT 0,
  avg_precision DECIMAL(5,2) DEFAULT 0,
  total_missing_instances INTEGER DEFAULT 0,
  total_stale_instances INTEGER DEFAULT 0,
  unique_missing_alerts INTEGER DEFAULT 0,
  unique_stale_alerts INTEGER DEFAULT 0,
  
  -- Storage location
  report_url TEXT,
  
  -- Size of report file in bytes
  file_size_bytes INTEGER DEFAULT 0
);

-- Index for fetching reports by date
CREATE INDEX IF NOT EXISTS idx_accuracy_reports_date ON alert_accuracy_reports(report_date DESC);

-- Grant access to service role (for Edge Functions)
GRANT ALL ON alert_accuracy_logs TO service_role;
GRANT ALL ON alert_accuracy_reports TO service_role;
GRANT USAGE, SELECT ON SEQUENCE alert_accuracy_logs_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE alert_accuracy_reports_id_seq TO service_role;

-- Comment on tables
COMMENT ON TABLE alert_accuracy_logs IS 'Stores summary metrics for each monitoring check (every 5 minutes)';
COMMENT ON TABLE alert_accuracy_reports IS 'Metadata about daily JSON reports stored in R2/Storage';
