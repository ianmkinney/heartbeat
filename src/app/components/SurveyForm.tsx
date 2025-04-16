'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PulseData } from '@/app/lib/pulses';

interface SurveyFormProps {
  pulseId: string;
  respondentId: string;
}

export default function SurveyForm({ pulseId, respondentId }: SurveyFormProps) {
  const [responses, setResponses] = useState<Record<number, string>>({0: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(respondentId);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [isLoadingPulse, setIsLoadingPulse] = useState(true);
  
  // Fetch pulse data to get custom questions
  useEffect(() => {
    async function fetchPulseData() {
      try {
        setIsLoadingPulse(true);
        const response = await fetch(`/api/pulse/${pulseId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch pulse data');
        }
        
        const data = await response.json();
        if (data.success && data.pulse) {
          setPulse(data.pulse);
          
          // Initialize responses for each question
          if (data.pulse.customQuestions && data.pulse.customQuestions.length > 0) {
            const initialResponses: Record<number, string> = {};
            data.pulse.customQuestions.forEach((_, index) => {
              initialResponses[index] = '';
            });
            setResponses(initialResponses);
          }
        }
      } catch (err) {
        console.error('Error fetching pulse data:', err);
      } finally {
        setIsLoadingPulse(false);
      }
    }
    
    fetchPulseData();
  }, [pulseId]);
  
  // Fetch emails for this pulse
  useEffect(() => {
    async function fetchEmails() {
      try {
        setIsLoadingEmails(true);
        const response = await fetch(`/api/survey/recipient-emails/${pulseId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch recipient emails');
        }
        
        const data = await response.json();
        if (data.success && Array.isArray(data.emails)) {
          setEmails(data.emails);
          
          // If respondentId is included in emails, set it as selected
          if (data.emails.includes(respondentId)) {
            setSelectedEmail(respondentId);
          } else if (data.emails.length > 0) {
            // Otherwise default to first email
            setSelectedEmail(data.emails[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching recipient emails:', err);
      } finally {
        setIsLoadingEmails(false);
      }
    }
    
    fetchEmails();
  }, [pulseId, respondentId]);
  
  const handleResponseChange = (index: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      [index]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      // Check if all responses are filled
      const hasEmptyResponses = Object.values(responses).some(response => !response.trim());
      
      if (hasEmptyResponses) {
        setError('Please answer all questions');
        setIsSubmitting(false);
        return;
      }
      
      if (!selectedEmail) {
        setError('Please select your email address');
        setIsSubmitting(false);
        return;
      }
      
      // Format responses into a single string, separated by newlines and question markers
      const formattedResponse = Object.entries(responses)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([index, response], i) => {
          const questionNumber = Number(index);
          const questionText = pulse?.customQuestions?.[questionNumber] || 
            (questionNumber === 0 ? "How have you been feeling lately?" : `Question ${questionNumber + 1}`);
          
          return `Q${i+1}: ${questionText}\nA: ${response.trim()}`;
        })
        .join('\n\n');
      
      const result = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pulseId,
          response: formattedResponse,
          respondentId: selectedEmail // Use the selected email as respondentId
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
  
  if (isLoadingPulse) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 mx-auto mb-4">
          <svg className="w-full h-full animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p>Loading survey questions...</p>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="email-select" 
            className="block text-sm font-medium mb-2"
          >
            Please confirm your email address:
          </label>
          <select
            id="email-select"
            className="input-field"
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
            disabled={isLoadingEmails || emails.length === 0}
            required
          >
            {isLoadingEmails ? (
              <option value="">Loading emails...</option>
            ) : emails.length === 0 ? (
              <option value="">No emails available</option>
            ) : (
              <>
                <option value="">-- Select your email --</option>
                {emails.map(email => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </>
            )}
          </select>
          <p className="text-xs mt-1 opacity-70">
            This helps us track who has responded.
          </p>
        </div>
        
        {/* Display custom questions or default question */}
        {(pulse?.customQuestions?.length ? pulse.customQuestions : ['How have you been feeling lately?']).map((question, index) => (
          <div key={index} className="mb-6">
            <label 
              htmlFor={`response-${index}`} 
              className="block text-xl font-medium mb-4"
            >
              {question}
            </label>
            <textarea
              id={`response-${index}`}
              className="input-field h-32"
              value={responses[index] || ''}
              onChange={(e) => handleResponseChange(index, e.target.value)}
              placeholder="Share your thoughts here. Your response will be kept anonymous."
              required
            />
          </div>
        ))}
        
        {error && (
          <div className="warning-box text-primary text-sm">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isSubmitting || isLoadingEmails}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Response'}
        </button>
      </form>
    </div>
  );
}