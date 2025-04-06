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