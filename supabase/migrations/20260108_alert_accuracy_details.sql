-- Add JSONB columns for detailed missing/stale alert data
-- Created: January 8, 2026
-- Purpose: Store actual alert details for discrepancy analysis

-- Add columns to store the actual missing and stale alert objects
ALTER TABLE alert_accuracy_logs 
ADD COLUMN IF NOT EXISTS missing_alerts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stale_alerts JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN alert_accuracy_logs.missing_alerts IS 'Array of alert objects that are in TTC API but missing from frontend';
COMMENT ON COLUMN alert_accuracy_logs.stale_alerts IS 'Array of alert objects that are in frontend but not in TTC API';

-- Example of missing_alerts data:
-- [{"route": "512", "ttc_title": "512 St Clair: Regular service has resumed", "ttc_effect": "Service Resumed"}]

-- Example of stale_alerts data:
-- [{"route": "504", "frontend_title": "504 King: Detour at River St", "frontend_status": "Detour"}]
