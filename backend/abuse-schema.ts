// Kept separate so the same migration is exercised against isolated Postgres
// in tests. The users table is created by the main application schema first.
export const ABUSE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS app_secrets (name TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS abuse_counters (key TEXT PRIMARY KEY, hits BIGINT NOT NULL, expires_at TIMESTAMPTZ NOT NULL);
  CREATE INDEX IF NOT EXISTS abuse_counters_expiry_idx ON abuse_counters(expires_at);
  CREATE TABLE IF NOT EXISTS registration_challenges (
    id UUID PRIMARY KEY, nonce TEXT NOT NULL, difficulty INT NOT NULL,
    network_key TEXT NOT NULL, browser_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS registration_challenges_expiry_idx ON registration_challenges(expires_at);
  CREATE TABLE IF NOT EXISTS publication_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL, campaign_hash TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS publication_events_owner_idx ON publication_events(owner_id,created_at);
  CREATE INDEX IF NOT EXISTS publication_events_campaign_idx ON publication_events(campaign_hash,created_at);
`;
