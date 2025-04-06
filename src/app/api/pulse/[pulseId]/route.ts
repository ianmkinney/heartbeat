import { NextRequest, NextResponse } from 'next/server';
import { deletePulse } from '@/app/lib/pulses';

type RouteParams = {
  params: {
    pulseId: string;
  }
}

// DELETE endpoint to remove a pulse and all related data
export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const pulseId = context.params.pulseId;
    
    if (!pulseId) {
      return NextResponse.json(
        { error: 'Pulse ID is required' },
        { status: 400 }
      );
    }
    
    // Use the deletePulse function which handles both Supabase and localStorage
    const success = await deletePulse(pulseId);
    
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
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 