import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPulseById } from '@/app/lib/pulses';
import * as puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
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
    
    // Get the pulse data
    const pulseData = await getPulseById(pulseId);
    
    if (!pulseData) {
      return NextResponse.json(
        { error: 'Pulse not found' },
        { status: 404 }
      );
    }
    
    // Check if analysis is available
    if (!pulseData.hasAnalysis || !pulseData.analysisContent) {
      return NextResponse.json(
        { error: 'Analysis not available for this pulse' },
        { status: 400 }
      );
    }
    
    // Use the emails list since responses are deleted after analysis
    const respondentEmails = pulseData.emails;
    
    // Generate PDF content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Pulse Analysis: ${pulseData.name || pulseId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #111;
          }
          .header {
            border-bottom: 1px solid #ddd;
            margin-bottom: 20px;
            padding-bottom: 10px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
          .email-list {
            margin: 20px 0;
          }
          .email-item {
            padding: 5px 0;
            border-bottom: 1px solid #eee;
          }
          .analysis {
            margin-top: 30px;
          }
          .warning {
            background-color: #fff0f0;
            border: 1px solid #ffb0b0;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pulse Analysis Summary</h1>
          <p><strong>Pulse Name:</strong> ${pulseData.name || 'Unnamed Pulse'}</p>
          <p><strong>Created:</strong> ${new Date(pulseData.createdAt).toLocaleDateString()}</p>
          <p><strong>Response Count:</strong> ${pulseData.responseCount} / ${pulseData.emails.length}</p>
        </div>
        
        <h2>Response Details</h2>
        <p>The following email addresses have responded to this pulse survey:</p>
        <div class="email-list">
          ${respondentEmails.map(email => `<div class="email-item">${email}</div>`).join('')}
        </div>
        
        <div class="analysis">
          <h2>Analysis:</h2>
          ${pulseData.analysisContent}
        </div>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()} • Heartbeat - Anonymous Pulse Surveys</p>
        </div>
      </body>
      </html>
    `;
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();
    
    // Send PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pulse-analysis-${pulseId}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}