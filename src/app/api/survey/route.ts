import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { updatePulseResponseCount } from '@/app/lib/pulses';

// Default user ID
const DEFAULT_USER_ID = 1;

// In-memory storage fallback for when Supabase is not configured
const surveyResponses: Record<string, Array<{ response: string, timestamp: string }>> = {};

export async function POST(req: NextRequest) {
  try {
    const { pulseId, response, respondentId } = await req.json();
    
    if (!pulseId) {
      return NextResponse.json(
        { error: 'Pulse ID is required' },
        { status: 400 }
      );
    }
    
    if (!response || typeof response !== 'string') {
      return NextResponse.json(
        { error: 'Valid response is required' },
        { status: 400 }
      );
    }
    
    const timestamp = new Date().toISOString();
    
    // Try to save to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        // First check if the pulse exists
        const { data: pulseData, error: pulseError } = await supabase
          .from('pulses')
          .select('id, user_id')
          .eq('id', pulseId)
          .single();
          
        if (pulseError && pulseError.code !== 'PGRST116') {
          throw pulseError;
        }
        
        // If pulse doesn't exist, create it with default values
        if (!pulseData) {
          await supabase
            .from('pulses')
            .insert({
              id: pulseId,
              user_id: DEFAULT_USER_ID,
              emails: [],
              created_at: timestamp
            });
        }
        
        // Insert the response
        const { error } = await supabase
          .from('responses')
          .insert({
            pulse_id: pulseId,
            response,
            timestamp,
            respondent_id: respondentId || 'anonymous'
          });
          
        if (error) throw error;
        
        // Get the updated response count
        const { data: responseCount, error: countError } = await supabase
          .from('responses')
          .select('id', { count: 'exact' })
          .eq('pulse_id', pulseId);
          
        if (countError) throw countError;
        
        // Update the pulse with the new response count
        await updatePulseResponseCount(
          pulseId, 
          responseCount?.length || 1,
          false,
          undefined,
          pulseData?.user_id || DEFAULT_USER_ID
        );
        
        console.log(`Saved response to Supabase for pulse ${pulseId}`);
        
        return NextResponse.json({
          success: true,
          pulseId,
          responseCount: responseCount?.length || 1
        });
      } catch (dbError) {
        console.error('Error saving to Supabase, falling back to memory storage:', dbError);
        // Continue to in-memory fallback
      }
    }
    
    // Fallback to in-memory storage
    if (!surveyResponses[pulseId]) {
      surveyResponses[pulseId] = [];
    }
    
    // Add the new response
    surveyResponses[pulseId].push({
      response,
      timestamp
    });
    
    console.log(`Saved response to memory for pulse ${pulseId}:`, response);
    
    // Update pulse data in localStorage
    await updatePulseResponseCount(pulseId, surveyResponses[pulseId].length);
    
    return NextResponse.json({
      success: true,
      pulseId,
      responseCount: surveyResponses[pulseId].length
    });
    
  } catch (error) {
    console.error('Error saving survey response:', error);
    return NextResponse.json(
      { error: 'Failed to save survey response' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pulseId = url.searchParams.get('pulseId');
    
    if (!pulseId) {
      return NextResponse.json(
        { error: 'Pulse ID is required' },
        { status: 400 }
      );
    }
    
    // Try to fetch from Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('responses')
          .select('response, timestamp')
          .eq('pulse_id', pulseId);
          
        if (error) throw error;
        
        // Format responses to match expected structure
        const formattedResponses = data.map(item => ({
          response: item.response,
          timestamp: item.timestamp
        }));
        
        return NextResponse.json({
          pulseId,
          responseCount: formattedResponses.length,
          responses: formattedResponses
        });
      } catch (dbError) {
        console.error('Error fetching from Supabase, falling back to memory storage:', dbError);
        // Continue to in-memory fallback
      }
    }
    
    // Fallback to in-memory storage
    const responses = surveyResponses[pulseId] || [];
    
    return NextResponse.json({
      pulseId,
      responseCount: responses.length,
      responses
    });
    
  } catch (error) {
    console.error('Error retrieving survey responses:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve survey responses' },
      { status: 500 }
    );
  }
} 