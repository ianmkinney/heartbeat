import { NextResponse } from 'next/server';
import { deletePulse, getPulseById } from '@/app/lib/pulses';

// GET endpoint to fetch pulse data
export async function GET(
  request: Request,
) {
  try {
    // Extract pulseId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const pulseId = pathParts[pathParts.length - 1];
    
    if (!pulseId) {
      return NextResponse.json(
        { error: 'Pulse ID is required' },
        { status: 400 }
      );
    }
    
    // Get pulse data
    const pulse = await getPulseById(pulseId);
    
    if (!pulse) {
      return NextResponse.json(
        { error: 'Pulse not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      pulse
    });
    
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a pulse and all related data
export async function DELETE(
  request: Request,
) {
  try {
    // Extract pulseId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const pulseId = pathParts[pathParts.length - 1];
    
    if (!pulseId) {
      return NextResponse.json(
        { error: 'Pulse ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Attempting to delete pulse: ${pulseId}`);
    
    // Use the deletePulse function which handles both Supabase and localStorage
    const success = await deletePulse(pulseId);
    
    console.log(`Deletion result for pulse ${pulseId}: ${success ? 'success' : 'failed'}`);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Pulse deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete pulse' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in DELETE handler:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}