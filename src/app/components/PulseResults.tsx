'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getPulseById, deletePulse, PulseData } from '@/app/lib/pulses';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/providers/ThemeProvider';
import HeartbeatAnimation from './HeartbeatAnimation';

interface PulseResultsProps {
  pulseId: string;
}

interface PulseResponse {
  id: string;
  pulse_id: string;
  response: string;
  timestamp: string;
  respondent_id: string;
}

export default function PulseResults({ pulseId }: PulseResultsProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [responses, setResponses] = useState<PulseResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [expandedResponses, setExpandedResponses] = useState<number[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const initialLoadComplete = useRef(false);

  // Fetch pulse and response data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get pulse data
        const pulseData = await getPulseById(pulseId);
        if (!pulseData) {
          setError('Pulse not found');
          return;
        }
        setPulse(pulseData);
        
        // Get responses
        if (isSupabaseConfigured) {
          const { data: responsesData, error: responsesError } = await supabase
            .from('responses')
            .select('*')
            .eq('pulse_id', pulseId);
            
          if (responsesError) throw responsesError;
          setResponses(responsesData || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load pulse data');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [pulseId]);

  // Function to check if an email has responded
  const hasResponded = (email: string) => {
    return responses.some(response => response.respondent_id === email);
  };

  // Function to handle analysis
  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      
      console.log('Starting analysis for pulse:', pulseId);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pulseId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze responses');
      }
      
      const result = await response.json();
      console.log('Analysis completed successfully', {
        success: result.success,
        hasAnalysis: true,
        analysisLength: result.analysis ? result.analysis.length : 0
      });
      
      // Refresh the data to show the new analysis
      const pulseData = await getPulseById(pulseId);
      if (pulseData) {
        console.log('Refreshed pulse data after analysis:', {
          id: pulseData.id,
          hasAnalysis: pulseData.hasAnalysis,
          hasAnalysisContent: !!pulseData.analysisContent,
          contentLength: pulseData.analysisContent ? pulseData.analysisContent.length : 0
        });
        setPulse(pulseData);
      } else {
        console.error('Failed to refresh pulse data after analysis');
      }
      
    } catch (err) {
      console.error('Error analyzing responses:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Failed to analyze responses');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Debug output for pulse object
  useEffect(() => {
    if (pulse) {
      console.log('Pulse state updated:', {
        id: pulse.id,
        hasAnalysis: pulse.hasAnalysis,
        analysisContentExists: !!pulse.analysisContent,
        contentLength: pulse.analysisContent?.length || 0
      });
    }
  }, [pulse]);

  if (error) {
    return (
      <div className="bg-secondary rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Error</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="btn-primary"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <HeartbeatAnimation />
        <p>Loading pulse data...</p>
      </div>
    );
  }

  if (!pulse) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <style jsx global>{`
        /* Force black text in light mode for prose content */
        :root[data-theme="light"] .prose:not(.prose-invert) {
          color: #000000 !important;
        }
        :root[data-theme="light"] .prose:not(.prose-invert) h1,
        :root[data-theme="light"] .prose:not(.prose-invert) h2,
        :root[data-theme="light"] .prose:not(.prose-invert) h3,
        :root[data-theme="light"] .prose:not(.prose-invert) h4,
        :root[data-theme="light"] .prose:not(.prose-invert) h5,
        :root[data-theme="light"] .prose:not(.prose-invert) h6,
        :root[data-theme="light"] .prose:not(.prose-invert) strong {
          color: #000000 !important;
        }
        :root[data-theme="light"] .prose:not(.prose-invert) p,
        :root[data-theme="light"] .prose:not(.prose-invert) li {
          color: #333333 !important;
        }
        /* Fix warning sections in light mode */
        :root[data-theme="light"] .warning {
          background-color: rgba(255, 0, 0, 0.1) !important;
          border: 1px solid #ff6b6b !important;
          padding: 1rem !important;
          margin: 1rem 0 !important;
          color: #333333 !important;
        }
        :root[data-theme="light"] .warning * {
          color: #333333 !important;
        }
        /* Styles for dark mode warning sections */
        .warning {
          background-color: rgba(255, 0, 0, 0.1);
          border: 1px solid #ff6b6b;
          padding: 1rem;
          margin: 1rem 0;
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{pulse.name || `Pulse: ${pulse.id}`}</h2>
        <button 
          onClick={() => router.push('/')}
          className="btn-secondary"
        >
          Back to Dashboard
        </button>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Recipients</h3>
        <div className="space-y-2">
          {pulse.emails.map((email) => (
            <div 
              key={email} 
              className={`flex items-center justify-between p-2 rounded ${
                hasResponded(email) ? 'bg-green-900/20' : 'bg-red-900/20'
              }`}
            >
              <span>{email}</span>
              <span className={`text-sm ${
                hasResponded(email) ? 'text-green-400' : 'text-red-400'
              }`}>
                {hasResponded(email) ? 'Responded' : 'Waiting for response'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {pulse.responseCount > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Response Status</h3>
          <p>
            {pulse.responseCount} of {pulse.emails.length} responses received
            {pulse.responseCount === pulse.emails.length ? 
              ' - All responses collected!' : 
              ' - Waiting for more responses...'}
          </p>
        </div>
      )}
      
      {pulse.responseCount === pulse.emails.length && !pulse.hasAnalysis && (
        <div className="mt-6">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="btn-primary w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Responses'}
          </button>
          {analysisError && (
            <p className="text-red-500 mt-2">{analysisError}</p>
          )}
        </div>
      )}
      
      {pulse.hasAnalysis && pulse.analysisContent && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Analysis</h3>
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: pulse.analysisContent }}
          />
        </div>
      )}
    </div>
  );
} 