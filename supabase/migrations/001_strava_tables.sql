-- Strava OAuth tokens (service_role only, no anon access)
CREATE TABLE IF NOT EXISTS strava_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL DEFAULT 'alec-santiago',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  athlete_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Strava activities (synced runs)
CREATE TABLE IF NOT EXISTS strava_activities (
  id BIGINT PRIMARY KEY,  -- Strava activity ID
  user_id TEXT NOT NULL DEFAULT 'alec-santiago',
  activity_type TEXT NOT NULL,
  distance_meters FLOAT NOT NULL,
  moving_time_seconds INT,
  start_date TIMESTAMPTZ NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;

-- strava_tokens: NO anon policies (only service_role can access)

-- strava_activities: anon can read
CREATE POLICY "anon_select_activities" ON strava_activities
  FOR SELECT TO anon USING (true);
