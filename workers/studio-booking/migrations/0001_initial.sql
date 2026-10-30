PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS studio_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS studio_appointments (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  style TEXT NOT NULL,
  idea TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  privacy_notice_version TEXT NOT NULL,
  privacy_accepted_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'confirmed', 'cancelled', 'rejected', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_interaction_at TEXT NOT NULL,
  cancelled_at TEXT,
  completed_at TEXT,
  expires_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_appointments_active_fingerprint
  ON studio_appointments(fingerprint)
  WHERE status IN ('requested', 'confirmed');
CREATE INDEX IF NOT EXISTS studio_appointments_schedule
  ON studio_appointments(status, preferred_date, preferred_time);
CREATE INDEX IF NOT EXISTS studio_appointments_customer
  ON studio_appointments(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS studio_appointments_expiry
  ON studio_appointments(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS studio_slot_locks (
  slot_id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL REFERENCES studio_appointments(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS studio_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS studio_rate_limits_expiry ON studio_rate_limits(reset_at);
