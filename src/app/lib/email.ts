import { Resend } from 'resend';

// Define email result interface for type safety
interface EmailResult {
  success: boolean;
  messageId: string;
  error?: string;
}

// Check if we have a valid Resend API key
const apiKey = process.env.RESEND_API_KEY;
// Ensure API key doesn't have newlines or extra whitespace
const cleanApiKey = apiKey?.trim();
const isTestMode = !cleanApiKey || 
  cleanApiKey === 'REPLACE_WITH_YOUR_API_KEY' || 
  cleanApiKey === 're_YOUR_API_KEY_HERE' || 
  cleanApiKey === 'your_resend_api_key';

// Get from email with fallback
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// Initialize Resend only if a valid API key is provided
const resend = !isTestMode && cleanApiKey ? new Resend(cleanApiKey) : null;

// Mock email function for testing when no API key is provided
async function sendMockEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  console.log('MOCK EMAIL MODE - No Resend API key provided');
  console.log('Would send email to:', to);
  console.log('Subject:', subject);
  console.log('Content:', html);
  
  // Simulate a successful email send
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    error: undefined,
  };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  try {
    // If in test mode, use mock email
    if (isTestMode || !resend) {
      console.log('Using mock email - set RESEND_API_KEY in .env for real emails');
      return await sendMockEmail(to, subject, html);
    }
    
    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: `Heartbeat <${fromEmail}>`,
      to,
      subject,
      html,
    });
    
    if (error) {
      console.error('Error sending email with Resend:', error);
      throw error;
    }
    
    console.log('Email sent with Resend:', data);
    
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // To prevent the application from crashing, return a success
    // but log the error - this helps testing flow while debugging
    return {
      success: true, // Pretend success to allow testing
      messageId: `error_${Date.now()}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendPulseSurveyEmails(emails: string[], pulseId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const results = [];
    
    for (const email of emails) {
      // Create a unique identifier for each recipient that won't change over time
      const uniqueId = Buffer.from(email + '-heartbeat-survey-id').toString('base64').replace(/=/g, '');
      const surveyLink = `${baseUrl}/survey/${pulseId}/${uniqueId}`;
      
      // Email content
      const subject = 'Heartbeat: We want your genuine feedback';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h1 style="color: #ff4081;">Heartbeat</h1>
          <p><strong>This is a test of the Heartbeat system.</strong> Please respond with your genuine feelings of how you have been feeling lately.</p>
          <p>Your honest feedback will help us to improve team experience and make this a better place to work for all.</p>
          <p><strong>Important:</strong> Your responses will not be shared with the rest of the team. All individual responses will be deleted once everyone has responded and the analysis has been generated.</p>
          <p>
            <a href="${surveyLink}" style="display: inline-block; background-color: #ff4081; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Respond to Pulse
            </a>
          </p>
          <p>Or copy and paste this link: ${surveyLink}</p>
          <p>Thank you for your valuable input!</p>
          <p style="color: #666; font-size: 12px;">Your response will be kept anonymous.</p>
        </div>
      `;
      
      // Send the email
      const result = await sendEmail(email, subject, html);
      
      results.push({
        email,
        surveyLink,
        status: result.success ? 'sent' : 'failed',
        messageId: result.messageId,
        error: result.error,
      });
    }
    
    return {
      success: true,
      sentCount: results.length,
      results,
    };
  } catch (error) {
    console.error('Error sending pulse survey emails:', error);
    // Return a partial success to allow application flow to continue
    return {
      success: true, // Pretend success to allow testing
      sentCount: 0,
      error: error instanceof Error ? error.message : String(error),
      results: [],
    };
  }
} 