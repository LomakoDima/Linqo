export const EMAIL_VERIFICATION_SCHEMA = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email TEXT;
  -- Preserve historical access without falsely asserting email ownership.
  -- Existing rows keep FALSE; every new account gets the final TRUE default.
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_required BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE users ALTER COLUMN email_verification_required SET DEFAULT true;
  ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS email TEXT;
  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL, current_email TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('registration','email_change')),
    token_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS email_verification_expiry_idx ON email_verification_tokens(expires_at);
`;
