-- Health metrics (daily scalar values: VO2 max, resting HR, HRV, etc.)
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'alec-santiago',
  metric_name TEXT NOT NULL,
  value FLOAT NOT NULL,
  units TEXT NOT NULL,
  date DATE NOT NULL,
  source_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, metric_name, date)
);

-- Health workouts (discrete workout events from Apple Health)
CREATE TABLE IF NOT EXISTS health_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'alec-santiago',
  source_id TEXT,
  workout_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INT,
  distance_meters FLOAT,
  avg_heart_rate FLOAT,
  max_heart_rate FLOAT,
  active_energy_kcal FLOAT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, source_id)
);

-- Enable RLS
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_workouts ENABLE ROW LEVEL SECURITY;

-- anon can read (for frontend display)
CREATE POLICY "anon_select_health_metrics" ON health_metrics
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_health_workouts" ON health_workouts
  FOR SELECT TO anon USING (true);
