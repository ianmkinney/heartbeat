'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPulse } from '@/app/lib/pulses';

export default function CreatePulseForm() {
  const router = useRouter();
  const [emails, setEmails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pulseId, setPulseId] = useState('');
  
  // Add timeout handling for redirection if taking too long
  useEffect(() => {
    if (pulseId && isLoading) {
      const timeout = setTimeout(() => {
        console.log('Email sending is taking longer than expected, forcing redirect');
        setIsLoading(false);
        // Force redirect to results page
        router.push(`/results/${pulseId}`);
      }, 8000); // 8 seconds timeout
      
      return () => clearTimeout(timeout);
    }
  }, [pulseId, isLoading, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Split emails by comma, newline, or space and trim whitespace
      const emailList = emails
        .split(/[,\n\s]+/)
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      if (emailList.length === 0) {
        setError('Please enter at least one email address');
        setIsLoading(false);
        return;
      }
      
      // Validate email format (basic validation)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emailList.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        setError(`Invalid email format: ${invalidEmails.join(', ')}`);
        setIsLoading(false);
        return;
      }
      
      // Generate a unique pulse ID
      const newPulseId = 'pulse_' + Date.now();
      setPulseId(newPulseId);
      
      console.log('Sending pulse to emails:', emailList);
      console.log('Pulse ID:', newPulseId);
      
      // Save the pulse to database or local storage
      try {
        await createPulse(newPulseId, emailList);
      } catch (saveError) {
        console.error('Error saving pulse data:', saveError);
        // Continue anyway since we can still send emails
      }
      
      // Prepare request data
      const requestData = {
        emails: emailList,
        pulseId: newPulseId,
      };
      
      console.log('Sending request to /api/email:', requestData);
      
      // Add fetch timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      try {
        // Send emails
        const response = await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('Email API response status:', response.status);
        
        const data = await response.json();
        console.log('Email API response data:', data);
        
        if (!response.ok && !data.success) {
          console.error('Email API response error:', data);
          throw new Error(data.error || data.details || 'Failed to send emails');
        }
        
        // Even if there's a warning, proceed to results
        if (data.warning) {
          console.warn('Email sending warning:', data.warning);
        }
        
        // Redirect to the results page for this pulse
        console.log('Email sent (or processing), redirecting to results page');
        router.push(`/results/${newPulseId}`);
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn('Fetch aborted due to timeout');
          // Still redirect to results page
          router.push(`/results/${newPulseId}`);
          return;
        }
        throw fetchError;
      }
    } catch (err: unknown) {
      console.error('Error creating pulse:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating the pulse');
      
      // If we have a pulseId, still allow going to results page after error
      if (pulseId) {
        setTimeout(() => {
          if (confirm('There was an issue sending emails, but you can still view the pulse results. Continue?')) {
            router.push(`/results/${pulseId}`);
          }
        }, 1000);
      }
    } finally {
      // Will be set to false here, unless the redirect has already happened
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="emails" 
            className="block text-sm font-medium mb-2"
          >
            Enter email addresses (separated by comma or newline):
          </label>
          <textarea
            id="emails"
            className="input-field h-32"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="example1@company.com&#10;example2@company.com"
            required
          />
        </div>
        
        {error && (
          <div className="warning-box text-primary text-sm">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Create Pulse'}
        </button>
      </form>
    </div>
  );
} 