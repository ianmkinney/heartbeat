-- Reset script for Heartbeat Supabase database
-- Run this script to drop all tables and start fresh

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS analyses;
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS pulses;
DROP TABLE IF EXISTS heartbeat_users;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All Heartbeat tables have been dropped successfully.';
  RAISE NOTICE 'You can now run the schema.sql script to recreate the tables.';
END $$; 