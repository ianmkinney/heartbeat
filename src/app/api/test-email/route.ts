import { NextResponse } from 'next/server';
import { sendPulseSurveyEmails } from '@/app/lib/email';

export async function GET() {
  try {
    // Log environment variables for debugging
    console.log('BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
    
    // Test data
    const testEmails = ['test@example.com'];
    const testPulseId = 'test_pulse_' + Date.now();
    
    // Send test emails using our email service
    const result = await sendPulseSurveyEmails(testEmails, testPulseId);
    
    console.log('Test email route called');
    console.log('Test emails sent:', result);
    
    return NextResponse.json({
      ...result,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      testPulseId
    });
    
  } catch (error) {
    console.error('Error in test email route:', error);
    return NextResponse.json(
      { error: 'Failed to test email functionality', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 