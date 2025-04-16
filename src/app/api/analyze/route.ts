import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { updatePulseResponseCount } from '@/app/lib/pulses';

// Default user ID
const DEFAULT_USER_ID = 1;

// Timeout for fetch - 25 seconds to avoid the 30s function timeout
const FETCH_TIMEOUT = 25000;

// Add fetch with timeout function
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Function to delete responses for a pulse
async function deleteResponsesAfterAnalysis(pulseId) {
  if (!isSupabaseConfigured) return;
  
  try {
    const { error } = await supabase
      .from('responses')
      .delete()
      .eq('pulse_id', pulseId);
      
    if (error) {
      console.error('Error deleting responses after analysis:', error);
    } else {
      console.log(`All responses for pulse ${pulseId} deleted after analysis`);
    }
  } catch (error) {
    console.error('Failed to delete responses:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { pulseId } = await req.json();
    
    if (!pulseId) {
      return NextResponse.json(
        { error: 'Pulse ID is required' },
        { status: 400 }
      );
    }
    
    // Get the pulse data to check response count
    const { data: pulseData, error: pulseError } = await supabase
      .from('pulses')
      .select('*')
      .eq('id', pulseId)
      .single();
      
    if (pulseError) {
      return NextResponse.json(
        { error: 'Failed to fetch pulse data' },
        { status: 500 }
      );
    }
    
    // Check if all responses are received
    if (pulseData.response_count !== pulseData.emails.length) {
      return NextResponse.json(
        { error: 'Cannot analyze until all responses are received' },
        { status: 400 }
      );
    }
    
    // Get all responses for this pulse
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('pulse_id', pulseId);
      
    if (responsesError) {
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 }
      );
    }
    
    if (isSupabaseConfigured) {
      try {
        // Check if an analysis already exists in Supabase
        const { data: analysisData, error: analysisError } = await supabase
          .from('analyses')
          .select('content')
          .eq('pulse_id', pulseId)
          .single();
          
        if (!analysisError && analysisData?.content) {
          console.log('Using existing analysis from database for pulse', pulseId);
          
          // Delete responses even if using existing analysis
          await deleteResponsesAfterAnalysis(pulseId);
          
          return NextResponse.json({
            success: true,
            analysis: analysisData.content,
            responseCount: responses.length,
            isExisting: true
          });
        }
      } catch (dbError) {
        console.error('Error checking for existing analysis:', dbError);
        // Continue with generating a new analysis
      }
    }
    
    // Usually we would access the API key from environment variables
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'your-api-key';
    
    if (!CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key is missing' },
        { status: 500 }
      );
    }
    
    // Get user ID if using Supabase
    let userId = DEFAULT_USER_ID;
    if (isSupabaseConfigured) {
      try {
        const { data: pulseData, error: pulseError } = await supabase
          .from('pulses')
          .select('user_id')
          .eq('id', pulseId)
          .single();
          
        if (!pulseError && pulseData) {
          userId = pulseData.user_id;
        }
      } catch (err) {
        console.error('Error getting pulse user_id:', err);
        // Continue with default user ID
      }
    }
    
    // Format the responses for Claude
    const prompt = `
      You are analyzing anonymous responses from a team survey asking "How have you been feeling lately?".
      
      Here are the responses:
      ${responses.map((r, i) => `${i+1}. "${r.response}"`).join('\n')}
      
      Please provide a thoughtful analysis that includes:
      1. A general summary of the overall sentiment and themes in the responses.
      2. Key action items that might help address any concerns or issues mentioned.
      3. Any significant problem areas that need immediate attention.
      
      EXTREMELY IMPORTANT: Maintain strict anonymity in your analysis:
      - NEVER reference when someone joined the team, their tenure, or time-based identifiers
      - NEVER include information that could identify specific individuals or roles
      - NEVER mention unique situations that could be traced back to specific individuals
      - NEVER reference gender, race, age, seniority, team assignments, or any demographic information
      - NEVER include direct quotes that could identify someone
      - Focus ONLY on themes, patterns, and general sentiments across responses
      - Present all findings as general observations about the group as a whole
      
      Important formatting requirements:
      - Format your response using HTML with appropriate elements (h1, h2, h3, p, ul, li, etc.)
      - For any warning sections or critical issues, wrap them in <div class="warning">...</div>
      - Make your response readable in a dark-themed UI with light text on dark background
      - Use heading elements (h2, h3) for section titles 
      - Use paragraph <p> elements for normal text
      - Use lists (<ul>, <li>) for bullet points
      
      Your analysis will be displayed in a dark-themed UI where:
      - Normal text should be semantic HTML
      - Main text is light gray (#e0e0e0)
      - Headings and important text should be white
      - Warning text should be in a red-bordered box
    `;
    
    // Call the Claude API with retry logic
    const MAX_RETRIES = 1; // Reduced from 2 to avoid excessive retries
    let retryCount = 0;
    let response;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        // Use fetchWithTimeout to prevent hanging
        response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307', // Use smaller, faster model
            max_tokens: 2500, // Reduced token limit
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        }, FETCH_TIMEOUT);
        
        // If we got a 429 rate limit error, wait and retry
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || (Math.min(10, 2 ** retryCount));
          console.log(`Rate limited (429). Retrying in ${retryAfter} seconds...`);
          
          // Wait for the retry-after time or exponential backoff (max 10 seconds)
          await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter as string) * 1000));
          retryCount++;
          continue;
        }
        
        // For other errors or success, break out of the retry loop
        break;
      } catch (fetchError) {
        console.error(`API fetch error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, fetchError);
        
        // Check for timeout (AbortError)
        if (fetchError.name === 'AbortError') {
          console.error('Claude API request timed out');
          return NextResponse.json(
            { error: 'Analysis request timed out. Please try with fewer responses.' },
            { status: 408 }
          );
        }
        
        if (retryCount < MAX_RETRIES) {
          // Wait with exponential backoff (1s, 2s)
          await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** retryCount)));
          retryCount++;
        } else {
          throw fetchError; // Rethrow after max retries
        }
      }
    }
    
    if (!response || !response.ok) {
      const errorMessage = response ? await response.text() : 'No response';
      console.error(`Claude API error after ${retryCount} retries:`, errorMessage);
      
      if (response?.status === 429) {
        return NextResponse.json(
          { error: 'Claude API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to analyze responses' },
        { status: response?.status || 500 }
      );
    }
    
    const data = await response.json();
    
    // Extract Claude's analysis from the response - fix for Claude 3 API format
    let analysis = 'No analysis available';
    
    if (data && data.content) {
      // Handle array of content blocks
      if (Array.isArray(data.content)) {
        const textBlocks = data.content
          .filter((block: {type: string}) => block.type === 'text')
          .map((block: {type: string, text: string}) => block.text);
        
        analysis = textBlocks.join('\n');
      } 
      // Handle single content string
      else if (typeof data.content === 'string') {
        analysis = data.content;
      }
    }
    // Old API format where content might be nested inside a message
    else if (data && data.message && data.message.content) {
      analysis = data.message.content;
    }
    
    console.log('Analysis extracted:', analysis.substring(0, 100) + '...');
    
    // Store the analysis in Supabase if configured
    if (isSupabaseConfigured) {
      try {
        // Check if an analysis already exists
        const { data: existingAnalysis, error: checkError } = await supabase
          .from('analyses')
          .select('id')
          .eq('pulse_id', pulseId)
          .single();
          
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking for existing analysis:', checkError);
        }
        
        if (existingAnalysis) {
          // Update existing analysis
          const { error: updateError } = await supabase
            .from('analyses')
            .update({
              content: analysis,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAnalysis.id);
            
          if (updateError) {
            console.error('Error updating analysis in Supabase:', updateError);
          }
        } else {
          // Insert new analysis
          const { error: insertError } = await supabase
            .from('analyses')
            .insert({
              pulse_id: pulseId,
              content: analysis,
              created_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error('Error inserting analysis in Supabase:', insertError);
          }
        }
        
        // Update the pulse data to indicate it has an analysis
        console.log('Updating pulse with analysis content...');
        const result = await updatePulseResponseCount(pulseId, responses.length, true, analysis, userId);
        console.log('Update result:', {
          success: !!result,
          hasAnalysis: result?.hasAnalysis,
          hasAnalysisContent: !!result?.analysisContent
        });
        
        // Delete responses after analysis is complete
        await deleteResponsesAfterAnalysis(pulseId);
      } catch (dbError) {
        console.error('Error storing analysis in Supabase:', dbError);
      }
    } else {
      // Update pulse in localStorage
      await updatePulseResponseCount(pulseId, responses.length, true, analysis);
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      responseCount: responses.length
    });
    
  } catch (error) {
    console.error('Error in analysis API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze responses' },
      { status: 500 }
    );
  }
}