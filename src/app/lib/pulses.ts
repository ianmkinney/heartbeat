// Pulses module for storing and retrieving pulse data
// Uses Supabase with localStorage fallback
import { supabase, withFallback, isSupabaseConfigured } from './supabase';

export interface PulseData {
  id: string;
  user_id?: number;
  name?: string; // Name of the pulse
  createdAt: string;
  emails: string[];
  sentEmails?: string[];
  pendingEmails?: string[];
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
export const createPulse = async (id: string, emails: string[], userId: number = DEFAULT_USER_ID, pendingEmails?: string[], name?: string) => {
  // Validate inputs to avoid unexpected errors
  if (!id || !emails || !Array.isArray(emails)) {
    throw new Error('Invalid pulse data: id and emails array are required');
  }
  
  const newPulse: PulseData = {
    id,
    user_id: userId,
    name: name || null, // Ensure name is never undefined
    createdAt: new Date().toISOString(),
    emails,
    pendingEmails: pendingEmails || [],
    sentEmails: [],
    responseCount: 0,
    lastChecked: new Date().toISOString()
  };
  
  // If Supabase is not configured, fallback to localStorage
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, using localStorage fallback');
    const pulses = getPulsesFromStorage();
    pulses[id] = newPulse;
    savePulsesToStorage(pulses);
    return newPulse;
  }
  
  try {
    console.log('Attempting to create pulse in database:', { 
      id: newPulse.id, 
      emails: newPulse.emails.length 
    });
    
    // First try with all fields - this will work if the schema is up to date
    const coreData = {
      id: newPulse.id,
      user_id: newPulse.user_id,
      name: newPulse.name,
      created_at: newPulse.createdAt,
      emails: newPulse.emails,
      response_count: newPulse.responseCount || 0,
      last_checked: newPulse.lastChecked,
      has_analysis: false
    };
    
    // Try the insert with complete data first
    try {
      const { data, error } = await supabase
        .from('pulses')
        .insert({
          ...coreData,
          pending_emails: newPulse.pendingEmails || [],
          sent_emails: newPulse.sentEmails || []
        })
        .select();
      
      if (!error) {
        console.log('Pulse created successfully with all fields:', data[0].id);
        
        // Convert from Supabase format to our app format
        return {
          id: data[0].id,
          user_id: data[0].user_id,
          name: data[0].name,
          createdAt: data[0].created_at,
          emails: data[0].emails || [],
          pendingEmails: data[0].pending_emails || [],
          sentEmails: data[0].sent_emails || [],
          responseCount: data[0].response_count || 0,
          lastChecked: data[0].last_checked,
          hasAnalysis: data[0].has_analysis || false
        } as PulseData;
      }
      
      // If we got a column doesn't exist error, try with just core fields
      if (error && error.code === 'PGRST204' && 
          (error.message?.includes('pending_emails') || error.message?.includes('sent_emails'))) {
        console.warn('Missing email tracking columns, trying with core fields only');
      } else if (error) {
        // If it's some other error, throw it
        throw error;
      }
    } catch (e) {
      console.warn('Error in full pulse creation, falling back to core fields:', e);
    }
    
    // If we're here, the first insert failed - try with core fields only
    console.log('Attempting pulse creation with core fields only');
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('pulses')
      .insert(coreData)
      .select();
    
    if (fallbackError) {
      console.error('Failed to create pulse with core fields:', fallbackError);
      throw fallbackError;
    }
    
    if (!fallbackData || fallbackData.length === 0) {
      throw new Error('No data returned from database');
    }
    
    console.log('Pulse created with core fields:', fallbackData[0].id);
    
    // Convert from Supabase format to our app format
    return {
      id: fallbackData[0].id,
      user_id: fallbackData[0].user_id,
      name: fallbackData[0].name,
      createdAt: fallbackData[0].created_at,
      emails: fallbackData[0].emails || [],
      responseCount: fallbackData[0].response_count || 0,
      lastChecked: fallbackData[0].last_checked,
      hasAnalysis: fallbackData[0].has_analysis || false
    } as PulseData;
  } catch (err) {
    console.error('Failed to create pulse in database:', err);
    
    // Fallback to localStorage
    const pulses = getPulsesFromStorage();
    pulses[id] = newPulse;
    savePulsesToStorage(pulses);
    return newPulse;
  }
};

// Get all pulses, sorted by most recent first
export const getAllPulses = async (userId: number = DEFAULT_USER_ID): Promise<PulseData[]> => {
  try {
    // Get from Supabase only
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
      pendingEmails: pulse.pending_emails || [],
      sentEmails: pulse.sent_emails || [],
      responseCount: pulse.response_count,
      lastChecked: pulse.last_checked,
      hasAnalysis: pulse.has_analysis
    })) as PulseData[];
  } catch (error) {
    console.error('Failed to fetch pulses from Supabase:', error);
    return []; // Return empty array instead of falling back to localStorage
  }
};

// Get a specific pulse by ID
export const getPulseById = async (id: string): Promise<PulseData | undefined> => {
  return withFallback(
    async () => {
      // Get from Supabase
      console.log(`Fetching pulse ${id} from database`);
      const { data, error } = await supabase
        .from('pulses')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      
      console.log('Pulse data from database:', {
        id: data.id,
        hasAnalysis: data.has_analysis,
        analysisContent: data.analysis_content ? 'exists' : 'missing'
      });
      
      // Convert from Supabase format to our app format
      return {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        createdAt: data.created_at,
        emails: data.emails,
        pendingEmails: data.pending_emails || [],
        sentEmails: data.sent_emails || [],
        responseCount: data.response_count,
        lastChecked: data.last_checked,
        hasAnalysis: data.has_analysis,
        analysisContent: data.analysis_content
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
  
  console.log(`Updating pulse ${id} with data:`, {
    hasAnalysis: updateData.hasAnalysis,
    responseCount: updateData.responseCount,
    hasAnalysisContent: !!updateData.analysisContent
  });
  
  return withFallback(
    async () => {
      // Convert to Supabase format
      const supabaseData: Record<string, unknown> = {};
      if (updateData.responseCount !== undefined) supabaseData.response_count = updateData.responseCount;
      if (updateData.hasAnalysis !== undefined) supabaseData.has_analysis = updateData.hasAnalysis;
      if (updateData.lastChecked !== undefined) supabaseData.last_checked = updateData.lastChecked;
      if (updateData.pendingEmails !== undefined) supabaseData.pending_emails = updateData.pendingEmails;
      if (updateData.sentEmails !== undefined) supabaseData.sent_emails = updateData.sentEmails;
      if (updateData.analysisContent !== undefined) supabaseData.analysis_content = updateData.analysisContent;
      
      console.log('Supabase update data:', supabaseData);
      
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
          name: newPulse.name,
          createdAt: newPulse.created_at,
          emails: newPulse.emails,
          responseCount: newPulse.response_count,
          lastChecked: newPulse.last_checked,
          hasAnalysis: newPulse.has_analysis,
          analysisContent: newPulse.analysis_content
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
      
      console.log('Updated pulse:', {
        id: updatedPulse.id,
        hasAnalysis: updatedPulse.has_analysis,
        analysisContent: updatedPulse.analysis_content ? 'exists' : 'missing'
      });
      
      // Convert from Supabase format to our app format
      return {
        id: updatedPulse.id,
        user_id: updatedPulse.user_id,
        name: updatedPulse.name,
        createdAt: updatedPulse.created_at,
        emails: updatedPulse.emails,
        pendingEmails: updatedPulse.pending_emails || [],
        sentEmails: updatedPulse.sent_emails || [],
        responseCount: updatedPulse.response_count,
        lastChecked: updatedPulse.last_checked,
        hasAnalysis: updatedPulse.has_analysis,
        analysisContent: updatedPulse.analysis_content
      } as PulseData;
    },
    () => {
      // Fallback to localStorage
      const pulses = getPulsesFromStorage();
      
      // Check if pulse exists
      if (!pulses[id]) {
        // Create if it doesn't exist
        const newPulse: PulseData = {
          id,
          user_id: userId,
          createdAt: updateData.createdAt || new Date().toISOString(),
          emails: updateData.emails || [],
          responseCount: updateData.responseCount || 0,
          lastChecked: updateData.lastChecked || new Date().toISOString(),
          hasAnalysis: updateData.hasAnalysis || false,
          analysisContent: updateData.analysisContent
        };
        pulses[id] = newPulse;
        savePulsesToStorage(pulses);
        return newPulse;
      }
      
      // Update if it exists
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
export const deletePulse = async (id: string): Promise<boolean> => {
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
  console.log('updatePulseResponseCount called with:', {
    id,
    count,
    hasAnalysis,
    hasContent: !!analysisContent,
    contentLength: analysisContent?.length || 0
  });
  
  const updateData: Partial<PulseData> = { 
    responseCount: count,
    hasAnalysis
  };
  
  // Only include analysisContent if it's defined and non-empty
  if (analysisContent) {
    updateData.analysisContent = analysisContent;
  }
  
  return updatePulse(id, updateData, userId);
};

// Get pulse with its responses
export const getPulseWithResponses = async (id: string) => {
  return withFallback(
    async () => {
      // Get pulse from Supabase
      const { data: pulse, error: pulseError } = await supabase
        .from('pulses')
        .select('*')
        .eq('id', id)
        .single();
        
      if (pulseError) {
        if (pulseError.code === 'PGRST116') return undefined; // Not found
        throw pulseError;
      }
      
      // Get responses for this pulse
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('pulse_id', id);
        
      if (responsesError) throw responsesError;
      
      // Return combined data
      return {
        id: pulse.id,
        user_id: pulse.user_id,
        name: pulse.name,
        createdAt: pulse.created_at,
        emails: pulse.emails,
        pendingEmails: pulse.pending_emails || [],
        sentEmails: pulse.sent_emails || [],
        responseCount: pulse.response_count,
        lastChecked: pulse.last_checked,
        hasAnalysis: pulse.has_analysis,
        analysisContent: pulse.analysis_content,
        responses
      };
    },
    () => {
      // Fallback to localStorage
      const pulses = getPulsesFromStorage();
      const pulse = pulses[id];
      
      // Handle case where pulse doesn't exist
      if (!pulse) return undefined;
      
      // We don't have responses in localStorage fallback
      return {
        ...pulse,
        responses: []
      };
    },
    `Failed to fetch pulse with responses for ID ${id}`
  );
};

// Get pulse analysis
export const getPulseAnalysis = async (id: string) => {
  return withFallback(
    async () => {
      // Get analysis from Supabase
      const { data: pulse, error } = await supabase
        .from('pulses')
        .select('analysis_content, has_analysis')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
      }
      
      // If no analysis is available
      if (!pulse.has_analysis || !pulse.analysis_content) {
        return { 
          available: false,
          content: null
        };
      }
      
      return {
        available: true,
        content: pulse.analysis_content
      };
    },
    () => {
      // Fallback to localStorage
      const pulses = getPulsesFromStorage();
      const pulse = pulses[id];
      
      // Handle case where pulse doesn't exist
      if (!pulse) return undefined;
      
      // If no analysis is available
      if (!pulse.hasAnalysis || !pulse.analysisContent) {
        return { 
          available: false,
          content: null
        };
      }
      
      return {
        available: true,
        content: pulse.analysisContent
      };
    },
    `Failed to fetch analysis for pulse ID ${id}`
  );
};