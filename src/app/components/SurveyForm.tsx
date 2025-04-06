'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SurveyFormProps {
  pulseId: string;
  respondentId: string;
}

export default function SurveyForm({ pulseId, respondentId }: SurveyFormProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      if (!response.trim()) {
        setError('Please enter a response');
        setIsSubmitting(false);
        return;
      }
      
      const result = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pulseId,
          response: response.trim(),
          respondentId // This helps identify unique submissions without revealing identity
        }),
      });
      
      if (!result.ok) {
        throw new Error('Failed to submit survey response');
      }
      
      setIsSubmitted(true);
      
    } catch (err) {
      console.error('Error submitting survey:', err);
      setError('An error occurred while submitting your response');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isSubmitted) {
    return (
      <div className="text-center space-y-6 py-12">
        <h2 className="text-2xl font-bold">Thank You!</h2>
        <p>Your response has been recorded. Your feedback helps improve the team experience.</p>
        <div className="h-12 w-12 pulse-dot mx-auto my-8"></div>
        
        <div className="flex flex-col gap-4 items-center mt-4">
          <Link href="/" className="btn-primary px-6 py-2">
            Return to Dashboard
          </Link>
          <p className="text-sm opacity-70">
            Your response has been submitted anonymously
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="response" 
            className="block text-xl font-medium mb-4"
          >
            How have you been feeling lately?
          </label>
          <textarea
            id="response"
            className="input-field h-48"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Share your thoughts here. Your response will be kept anonymous."
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
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Response'}
        </button>
      </form>
    </div>
  );
} 