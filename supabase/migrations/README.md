# Database Migrations

This directory contains SQL migration scripts to update the database schema.

## Running Migrations

To run a migration:

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Navigate to the SQL Editor in the left sidebar
4. Click "New Query"
5. Copy the contents of the migration file you want to run (e.g., `add_name_column.sql`)
6. Paste it into the SQL Editor
7. Click "Run" to execute the script

## Recommended Migration Order

For best results, run the migrations in this order:

1. `add_helper_functions.sql` - Creates helper functions for schema checks
2. `add_name_column.sql` - Adds the `name` column to the `pulses` table
3. `add_email_tracking_columns.sql` - Adds email tracking columns to the `pulses` table

## Available Migrations

- `add_name_column.sql` - Adds the `name` column to the `pulses` table for storing pulse names.
- `add_email_tracking_columns.sql` - Adds the `pending_emails` and `sent_emails` columns to the `pulses` table for tracking email status.

## Important! Required Migrations

If you're encountering errors with pulse creation, you need to run the following migrations:

1. First run `add_helper_functions.sql` to create database helper functions
2. Then run `add_email_tracking_columns.sql` to add the required email tracking columns

## After Running Migrations

After applying migrations, restart your Next.js development server to ensure the changes take effect:

```bash
npm run dev
``` 