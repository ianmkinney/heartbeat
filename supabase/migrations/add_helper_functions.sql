-- Migration to add helper functions for schema checks

-- Create function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name text) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    exists_val boolean;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = table_name
    ) INTO exists_val;
    
    RETURN exists_val;
END;
$$; 