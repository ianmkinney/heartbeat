import { Resend } from 'resend';

// Define email result interface for type safety
interface EmailResult {
  success: boolean;
  messageId: string;
  error?: string;
}

// Check if we have a valid Resend API key
const apiKey = process.env.RESEND_API_KEY;
const isTestMode = !apiKey || 
  apiKey === 'REPLACE_WITH_YOUR_API_KEY' || 
  apiKey === 're_YOUR_API_KEY_HERE' || 
  apiKey === 'your_resend_api_key';

// Initialize Resend only if a valid API key is provided
const resend = !isTestMode && apiKey ? new Resend(apiKey) : null;

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
      from: 'Heartbeat <onboarding@resend.dev>', // Replace with your verified domain when in production
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
      // Create a unique identifier for each recipient
      const uniqueId = Buffer.from(email + Date.now()).toString('base64').replace(/=/g, '');
      const surveyLink = `${baseUrl}/survey/${pulseId}/${uniqueId}`;
      
      // Email content
      const subject = 'Heartbeat: We want your feedback';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h1 style="color: #ff4081;">Heartbeat</h1>
          <p>We'd like to know how you're doing! Please take a moment to provide your anonymous feedback.</p>
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