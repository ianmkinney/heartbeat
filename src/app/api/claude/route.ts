import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages, threadId } = await req.json();
    
    // Usually we would access the API key from environment variables
    // For demo purposes, we're using a placeholder
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'your-api-key';
    
    if (!CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key is missing' },
        { status: 500 }
      );
    }
    
    if (!threadId && !messages) {
      return NextResponse.json(
        { error: 'Either threadId or messages must be provided' },
        { status: 400 }
      );
    }
    
    const apiUrl = 'https://api.anthropic.com/v1/messages';
    const requestBody: {
      model: string; 
      max_tokens: number;
      thread_id?: string;
      message?: { content: string };
      messages?: unknown[];
    } = {
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
    };
    
    if (threadId) {
      // Use existing thread
      requestBody.thread_id = threadId;
      requestBody.message = { content: prompt };
    } else {
      // Start new thread with message history
      requestBody.messages = messages;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in Claude API route:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 