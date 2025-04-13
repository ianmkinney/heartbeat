import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { getPulseById } from '@/app/lib/pulses';

export async function GET(
  req: NextRequest,
  { params }: { params: { pulseId: string } }
) {
  try {
    const pulseId = params.pulseId;
    
    if (!pulseId) {
      return NextResponse.json(
        { error: 'Pulse ID is required' },
        { status: 400 }
      );
    }
    
    // Get the pulse data with recipient emails
    const pulseData = await getPulseById(pulseId);
    
    if (!pulseData) {
      return NextResponse.json(
        { error: 'Pulse not found' },
        { status: 404 }
      );
    }
    
    // Return the list of recipient emails
    return NextResponse.json({
      success: true,
      pulseId,
      emails: pulseData.emails || []
    });
    
  } catch (error) {
    console.error('Error retrieving recipient emails:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve recipient emails' },
      { status: 500 }
    );
  }
} 