# Email Tracking Fields Migration

This project requires database schema updates to support new email tracking features. 

## Database Schema Updates Required

The application now sends emails one at a time and tracks which emails have been sent. This requires two new columns in the `pulses` table:

1. `pending_emails` - Stores emails that are waiting to be sent
2. `sent_emails` - Stores emails that have been successfully sent

## How to Apply the Migration

Run the following SQL statements in the Supabase SQL Editor:

```sql
-- Add email tracking columns to pulses table
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS pending_emails JSONB;
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS sent_emails JSONB;

-- Convert existing emails to track sent status
-- For existing records, assume all emails have been sent already
UPDATE pulses
SET sent_emails = emails,
    pending_emails = '[]'::jsonb
WHERE sent_emails IS NULL;
```

## Verifying the Migration

After applying the migration, restart the application. If the schema update was successful, you should no longer see a red warning banner at the top of the application indicating schema issues.

## Using the New Email Features

Once the migration is applied, the pulse results page will:

1. Show all email recipients with their status (sent or pending)
2. Allow you to send emails one at a time using the "Send Next Email" button
3. Track email sending progress 