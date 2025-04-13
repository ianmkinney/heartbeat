-- Migration to add the name column to the pulses table if it doesn't exist

-- Check if name column exists, add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pulses' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE pulses ADD COLUMN name TEXT;
        RAISE NOTICE 'Added name column to pulses table';
    ELSE
        RAISE NOTICE 'name column already exists in pulses table';
    END IF;
END
$$; 