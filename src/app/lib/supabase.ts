import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Console log Supabase configuration status (with privacy protection)
if (typeof window !== 'undefined') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase not fully configured!', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseAnonKey 
    });
  } else {
    console.log('Supabase configuration present', { 
      urlPrefix: supabaseUrl.substring(0, 12) + '...' 
    });
  }
}

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  { 
    auth: { 
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-application-name': 'heartbeat' }
    }
  }
);

// Helper function to handle database operations with fallback to localStorage
export async function withFallback<T>(
  dbOperation: () => Promise<T>,
  fallbackOperation: () => T,
  errorMessage = 'Database operation failed'
): Promise<T> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, using localStorage fallback');
    return fallbackOperation();
  }

  try {
    return await dbOperation();
  } catch (error) {
    console.error(errorMessage, error);
    return fallbackOperation();
  }
}

export const checkSchema = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    console.log('Supabase not configured, skipping schema check');
    return false;
  }
  
  try {
    // First check if the pulses table exists
    const { data: tables, error: tableError } = await supabase
      .rpc('check_table_exists', { table_name: 'pulses' });
      
    if (tableError) {
      console.error('Error checking if tables exist:', tableError);
      return false;
    }
    
    // If pulses table doesn't exist, schema needs setup
    if (!tables) {
      console.warn('Pulses table not found. Please run the schema setup script.');
      return false;
    }
    
    // Check if the name column exists in pulses table
    const { data, error } = await supabase
      .from('pulses')
      .select('name')
      .limit(1);
      
    if (error) {
      console.error('Error checking schema columns:', error);
      
      // If the error indicates missing columns
      if (error.message && error.message.includes('column "name" does not exist')) {
        console.warn('The pulses table is missing the name column. Please run the migration.');
        return false;
      }
      
      // For other errors (like no data found), assume schema is ok
      return true;
    }
    
    // If we got data, the columns exist
    return true;
    
  } catch (err) {
    console.error('Failed to check schema:', err);
    // In case of errors, assume schema is ok to avoid blocking the app
    return true;
  }
}; 