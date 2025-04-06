// Pulses module for storing and retrieving pulse data
// Uses Supabase with localStorage fallback
import { supabase, withFallback, isSupabaseConfigured } from './supabase';

export interface PulseData {
  id: string;
  user_id?: number;
  createdAt: string;
  emails: string[];
  responseCount?: number;
  lastChecked?: string;
  hasAnalysis?: boolean;
  analysisContent?: string;
}

// Initialize store from localStorage (client-side only)
const getPulsesFromStorage = (): Record<string, PulseData> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem('heartbeat_pulses');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Failed to parse pulses from localStorage', e);
    return {};
  }
};

// Save pulses to localStorage (client-side only)
const savePulsesToStorage = (pulses: Record<string, PulseData>) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('heartbeat_pulses', JSON.stringify(pulses));
  } catch (e) {
    console.error('Failed to save pulses to localStorage', e);
  }
};

// Delete a pulse from localStorage (client-side only)
const deletePulseFromStorage = (id: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const pulses = getPulsesFromStorage();
    
    // Check if pulse exists
    if (!pulses[id]) return false;
    
    // Delete pulse
    delete pulses[id];
    
    // Save updated pulses
    savePulsesToStorage(pulses);
    return true;
  } catch (e) {
    console.error('Failed to delete pulse from localStorage', e);
    return false;
  }
};

// Default user ID for now
const DEFAULT_USER_ID = 1;

// Create a new pulse
export const createPulse = async (id: string, emails: string[], userId: number = DEFAULT_USER_ID) => {
  const newPulse: PulseData = {
    id,
    user_id: userId,
    createdAt: new Date().toISOString(),
    emails,
    responseCount: 0,
    lastChecked: new Date().toISOString()
  };
  
  return withFallback(
    async () => {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('pulses')
        .insert({
          id: newPulse.id,
          user_id: newPulse.user_id,
          created_at: newPulse.createdAt,
          emails: newPulse.emails,
          response_count: newPulse.responseCount,
          last_checked: newPulse.lastChecked,
          has_analysis: false
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Convert from Supabase format to our app format
      return {
        id: data.id,
        user_id: data.user_id,
        createdAt: data.created_at,
        emails: data.emails,
        responseCount: data.response_count,
        lastChecked: data.last_checked,
        hasAnalysis: data.has_analysis
      } as PulseData;
    },
    () => {
      // Fallback to localStorage
      const pulses = getPulsesFromStorage();
      pulses[id] = newPulse;
      savePulsesToStorage(pulses);
      return newPulse;
    },
    'Failed to create pulse in database'
  );
};

// Get all pulses, sorted by most recent first
export const getAllPulses = async (userId: number = DEFAULT_USER_ID): Promise<PulseData[]> => {
  return withFallback(
    async () => {
      // Get from Supabase
      const { data, error } = await supabase
        .from('pulses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Convert from Supabase format to our app format
      return data.map(pulse => ({
        id: pulse.id,
        user_id: pulse.user_id,
        createdAt: pulse.created_at,
        emails: pulse.emails,
        responseCount: pulse.response_count,
        lastChecked: pulse.last_checked,
        hasAnalysis: pulse.has_analysis
      })) as PulseData[];
    },
    () => {
      // Fallback to localStorage
      const pulses = getPulsesFromStorage();
      return Object.values(pulses).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    'Failed to fetch pulses from database'
  );
};

// Get a specific pulse by ID
export const getPulseById = async (id: string, userId: number = DEFAULT_USER_ID): Promise<PulseData | undefined> => {
  return withFallback(
    async () => {
      // Get from Supabase
      const { data, error } = await supabase
        .from('pulses')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      
      // Convert from Supabase format to our app format
      return {
        id: data.id,
        user_id: data.user_id,
        createdAt: data.created_at,
        emails: data.emails,
        responseCount: data.response_count,
        lastChecked: data.last_checked,
        hasAnalysis: data.has_analysis
      } as PulseData;
    },
    () => {
      // Fallback to localStorage
      const pulses = getPulsesFromStorage();
      return pulses[id];
    },
    `Failed to fetch pulse with ID ${id} from database`
  );
};

// Update a pulse with new data
export const updatePulse = async (id: string, data: Partial<PulseData>, userId: number = DEFAULT_USER_ID) => {
  const updateData = {
    ...data,
    lastChecked: new Date().toISOString()
  };
  
  return withFallback(
    async () => {
      // Convert to Supabase format
      const supabaseData: any = {};
      if (updateData.responseCount !== undefined) supabaseData.response_count = updateData.responseCount;
      if (updateData.hasAnalysis !== undefined) supabaseData.has_analysis = updateData.hasAnalysis;
      if (updateData.lastChecked !== undefined) supabaseData.last_checked = updateData.lastChecked;
      
      // First check if pulse exists
      const { data: existingPulse, error: fetchError } = await supabase
        .from('pulses')
        .select('*')
        .eq('id', id)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (!existingPulse) {
        // Insert if doesn't exist
        const { data: newPulse, error: insertError } = await supabase
          .from('pulses')
          .insert({ 
            id,
            user_id: userId,
            created_at: updateData.createdAt || new Date().toISOString(),
            emails: updateData.emails || [],
            ...supabaseData 
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        
        // Convert from Supabase format to our app format
        return {
          id: newPulse.id,
          user_id: newPulse.user_id,
          createdAt: newPulse.created_at,
          emails: newPulse.emails,
          responseCount: newPulse.response_count,
          lastChecked: newPulse.last_checked,
          hasAnalysis: newPulse.has_analysis
        } as PulseData;
      }
      
      // Update if exists
      const { data: updatedPulse, error: updateError } = await supabase
        .from('pulses')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Convert from Supabase format to our app format
      return {
        id: updatedPulse.id,
        user_id: updatedPulse.user_id,
        createdAt: updatedPulse.created_at,
        emails: updatedPulse.emails,
        responseCount: updatedPulse.response_count,
        lastChecked: updatedPulse.last_checked,
        hasAnalysis: updatedPulse.has_analysis,
        analysisContent: updateData.analysisContent
      } as PulseData;
    },
    () => {
      // Fallback to localStorage
      const pulses = getPulsesFromStorage();
      
      if (!pulses[id]) return undefined;
      
      pulses[id] = {
        ...pulses[id],
        ...updateData
      };
      
      savePulsesToStorage(pulses);
      return pulses[id];
    },
    `Failed to update pulse with ID ${id} in database`
  );
};

// Delete a pulse and all its data
export const deletePulse = async (id: string, userId: number = DEFAULT_USER_ID): Promise<boolean> => {
  return withFallback(
    async () => {
      // First delete all analyses for this pulse
      const { error: analysisError } = await supabase
        .from('analyses')
        .delete()
        .eq('pulse_id', id);
        
      if (analysisError) console.error('Error deleting analyses:', analysisError);
      
      // Then delete all responses for this pulse
      const { error: responseError } = await supabase
        .from('responses')
        .delete()
        .eq('pulse_id', id);
        
      if (responseError) console.error('Error deleting responses:', responseError);
      
      // Finally delete the pulse itself
      const { error: pulseError } = await supabase
        .from('pulses')
        .delete()
        .eq('id', id);
        
      if (pulseError) throw pulseError;
      
      return true;
    },
    () => {
      // Fallback to localStorage deletion
      return deletePulseFromStorage(id);
    },
    `Failed to delete pulse with ID ${id} from database`
  );
};

// Update pulse response count and analysis
export const updatePulseResponseCount = async (
  id: string, 
  count: number, 
  hasAnalysis: boolean = false,
  analysisContent?: string,
  userId: number = DEFAULT_USER_ID
) => {
  return updatePulse(
    id, 
    { 
      responseCount: count,
      hasAnalysis,
      ...(analysisContent ? { analysisContent } : {})
    },
    userId
  );
}; 