import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

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
  if (!isSupabaseConfigured) return false;
  
  try {
    // Check if the pending_emails and sent_emails columns exist
    const { data, error } = await supabase
      .from('pulses')
      .select('pending_emails, sent_emails')
      .limit(1);
      
    if (error) {
      console.error('Error checking schema:', error);
      
      // If the error indicates missing columns
      if (error.message && (
        error.message.includes('column "pending_emails" does not exist') ||
        error.message.includes('column "sent_emails" does not exist')
      )) {
        console.warn('The pulses table is missing email tracking columns. Please run the migration.');
        return false;
      }
      
      // For other errors, assume schema is ok to avoid blocking the app
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