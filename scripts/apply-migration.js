// Script to apply migration to Supabase database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  try {
    console.log('Applying migration for email tracking fields...');
    
    // SQL for adding email tracking columns
    const sql = `
      -- Add email tracking columns to pulses table
      ALTER TABLE pulses ADD COLUMN IF NOT EXISTS pending_emails JSONB;
      ALTER TABLE pulses ADD COLUMN IF NOT EXISTS sent_emails JSONB;

      -- Convert existing emails to track sent status
      -- For existing records, assume all emails have been sent already
      UPDATE pulses
      SET sent_emails = emails,
          pending_emails = '[]'::jsonb
      WHERE sent_emails IS NULL;
    `;
    
    // Execute SQL directly using Supabase's RPC
    const { error } = await supabase.rpc('pgmigration', { sql });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Migration successfully applied!');
    
  } catch (err) {
    console.error('❌ Error applying migration:', err);
    
    if (err.message && err.message.includes('function "pgmigration" does not exist')) {
      console.error('The "pgmigration" RPC function is not available on your Supabase instance.');
      console.error('Please run this SQL directly in the Supabase SQL editor instead.');
    }
  }
}

applyMigration(); 