-- Add custom_questions column to pulses table
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'::jsonb;
