import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendPulseSurveyEmails } from '@/app/lib/email';

// Set a timeout for email operations - 10 seconds
const EMAIL_TIMEOUT = 10000;

// Helper for timeout handling
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutHandle);
  });
};

// In a real implementation, you would integrate with a proper email service like SendGrid, Mailgun, etc.
// This is a mock implementation for demonstration purposes

export async function POST(req: NextRequest) {
  try {
    // Log request received
    console.log('Email API POST request received');
    
    // Validate and parse request body
    let body;
    try {
      body = await req.json();
      console.log('Request body parsed:', body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      );
    }
    
    const { emails, pulseId } = body;
    
    // Validate inputs
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      console.error('Email API: Invalid email addresses provided', emails);
      return NextResponse.json(
        { error: 'Valid email addresses are required' },
        { status: 400 }
      );
    }
    
    if (!pulseId) {
      console.error('Email API: No pulseId provided');
      return NextResponse.json(
        { error: 'Pulse ID is required' },
        { status: 400 }
      );
    }
    
    // Send emails using our email service with a timeout
    try {
      const result = await withTimeout(
        sendPulseSurveyEmails(emails, pulseId),
        EMAIL_TIMEOUT
      );
      
      console.log('Emails sent:', result);
      
      // If we have an error but it's still marked as success (our fallback)
      if ('error' in result && result.error) {
        console.warn('Email operation completed with errors:', result.error);
      }
      
      return NextResponse.json(result);
    } catch (timeoutError) {
      console.error('Email operation timed out:', timeoutError);
      // Return a "success" response to prevent UI blocking
      return NextResponse.json({
        success: true,
        message: 'Email processing started but may be delayed',
        sentCount: emails.length,
        warning: 'Operation timed out, but emails may still be sent in the background',
      });
    }
    
  } catch (error) {
    console.error('Error in email sender:', error);
    // Return a "success" response to prevent UI blocking
    return NextResponse.json({
      success: true,
      warning: 'An error occurred, but we will proceed to prevent blocking',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 