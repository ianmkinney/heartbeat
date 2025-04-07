-- Add email tracking columns to pulses table
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS pending_emails JSONB;
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS sent_emails JSONB;

-- Convert existing emails to track sent status
-- For existing records, assume all emails have been sent already
UPDATE pulses
SET sent_emails = emails,
    pending_emails = '[]'::jsonb
WHERE sent_emails IS NULL; 