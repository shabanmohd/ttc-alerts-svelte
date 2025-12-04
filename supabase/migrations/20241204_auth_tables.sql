-- WebAuthn Custom Auth System Migration
-- Run this in Supabase SQL Editor or via migrations

-- ============================================
-- 1. Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Username must be lowercase alphanumeric with underscores, 3-30 chars
ALTER TABLE public.users 
  ADD CONSTRAINT users_username_format 
  CHECK (username ~ '^[a-z0-9_]{3,30}$');

CREATE INDEX idx_users_username ON public.users(username);

-- ============================================
-- 2. WebAuthn Credentials Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id TEXT PRIMARY KEY, -- credential ID from WebAuthn
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL, -- base64 encoded public key
  counter INTEGER DEFAULT 0,
  device_name TEXT,
  transports TEXT[], -- e.g., ['internal', 'hybrid']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);

-- ============================================
-- 3. Recovery Codes Table (hashed)
-- ============================================
CREATE TABLE IF NOT EXISTS public.recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- bcrypt hash of recovery code
  used_at TIMESTAMPTZ, -- NULL if not used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recovery_codes_user_id ON public.recovery_codes(user_id);

-- ============================================
-- 4. Device Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL, -- unique device identifier
  session_token TEXT UNIQUE NOT NULL, -- random token for auth
  device_name TEXT,
  user_agent TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_device_sessions_user_id ON public.device_sessions(user_id);
CREATE INDEX idx_device_sessions_token ON public.device_sessions(session_token);

-- ============================================
-- 5. WebAuthn Challenges Table (temporary)
-- ============================================
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL for registration
  username TEXT, -- For registration flow
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);

-- Auto-cleanup expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM public.webauthn_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. User Preferences Table (updated schema)
-- ============================================
-- Drop existing if different schema
DROP TABLE IF EXISTS public.user_preferences_new;

CREATE TABLE IF NOT EXISTS public.user_preferences_v2 (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  selected_routes TEXT[] DEFAULT '{}',
  transport_modes TEXT[] DEFAULT ARRAY['subway', 'bus', 'streetcar'],
  alert_types TEXT[] DEFAULT ARRAY['SERVICE_DISRUPTION', 'DELAY', 'DIVERSION'],
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  quiet_days INTEGER[] DEFAULT '{}', -- 0=Sunday, 6=Saturday
  push_enabled BOOLEAN DEFAULT false,
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences_v2 ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access to users"
  ON public.users FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to webauthn_credentials"
  ON public.webauthn_credentials FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to recovery_codes"
  ON public.recovery_codes FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to device_sessions"
  ON public.device_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to webauthn_challenges"
  ON public.webauthn_challenges FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to user_preferences_v2"
  ON public.user_preferences_v2 FOR ALL
  USING (auth.role() = 'service_role');

-- Anonymous users can read public user info (just username existence check)
CREATE POLICY "Anyone can check username existence"
  ON public.users FOR SELECT
  USING (true);

-- ============================================
-- 8. Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_preferences_v2_updated_at
  BEFORE UPDATE ON public.user_preferences_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 9. Performance Indexes for Alerts
-- ============================================
CREATE INDEX IF NOT EXISTS idx_alert_cache_created_at ON public.alert_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_cache_is_active ON public.alert_cache(is_active);
CREATE INDEX IF NOT EXISTS idx_incident_threads_updated_at ON public.incident_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_threads_is_resolved ON public.incident_threads(is_resolved);

-- ============================================
-- 10. Enable Realtime
-- ============================================
-- Run these in Supabase Dashboard > Database > Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE alert_cache;
-- ALTER PUBLICATION supabase_realtime ADD TABLE incident_threads;
