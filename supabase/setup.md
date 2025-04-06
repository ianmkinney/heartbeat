# Setting Up Supabase for Heartbeat

Follow these steps to set up the Supabase database for the Heartbeat application:

## 1. Prerequisites

- A Supabase account
- Access to your Supabase project dashboard

## 2. Run Schema Setup Script

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Navigate to the SQL Editor in the left sidebar
4. Click "New Query"
5. Copy the entire contents of the `schema.sql` file from this directory
6. Paste it into the SQL Editor
7. Click "Run" to execute the script

## 3. Verify Setup

After running the script, you should see these tables created:

- `heartbeat_users` - For storing user information
- `pulses` - For storing pulse surveys
- `responses` - For storing anonymous responses
- `analyses` - For storing AI analyses

You can verify by running this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Alternatively, you can run the `npm run test:supabase` command to verify the connection and check if the tables are working properly.

## 4. Troubleshooting

If you encounter errors:

### UUID Extension Error

If you see an error about the UUID extension:

```
ERROR: extension "uuid-ossp" does not exist
```

You can run this command first:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Table Already Exists

If any tables already exist and you want to start fresh:

You can run the `reset.sql` script in this directory to drop all tables and start over:

1. Navigate to the SQL Editor in your Supabase dashboard
2. Click "New Query"
3. Copy the entire contents of the `reset.sql` file from this directory
4. Paste it into the SQL Editor
5. Click "Run" to execute the script

This will drop all Heartbeat tables and allow you to run the schema script again.

## 5. Update Environment Variables

Make sure your `.env` file includes:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Replace with your actual Supabase URL and anon key from the API settings in your Supabase dashboard. 