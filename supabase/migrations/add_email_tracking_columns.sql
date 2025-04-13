-- Migration to add email tracking columns to the pulses table

-- Add pending_emails column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pulses' 
        AND column_name = 'pending_emails'
    ) THEN
        ALTER TABLE pulses ADD COLUMN pending_emails JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added pending_emails column to pulses table';
    ELSE
        RAISE NOTICE 'pending_emails column already exists in pulses table';
    END IF;
END
$$;

-- Add sent_emails column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pulses' 
        AND column_name = 'sent_emails'
    ) THEN
        ALTER TABLE pulses ADD COLUMN sent_emails JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added sent_emails column to pulses table';
    ELSE
        RAISE NOTICE 'sent_emails column already exists in pulses table';
    END IF;
END
$$; 