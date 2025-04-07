'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getPulseById, deletePulse } from '@/app/lib/pulses';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/providers/ThemeProvider';

interface PulseResultsProps {
  pulseId: string;
}

export default function PulseResults({ pulseId }: PulseResultsProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState<Array<{ response: string, timestamp: string }>>([]);
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const initialLoadComplete = useRef(false);

  const fetchPulseData = useCallback(async (forceRefresh = false) => {
    // Skip if already loading or if we've completed initial load and not forcing refresh
    if (isLoading || (initialLoadComplete.current && !forceRefresh)) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // 1. Get the pulse data first to check if analysis exists
      const pulseData = await getPulseById(pulseId);
      
      // 2. Fetch responses
      if (isSupabaseConfigured) {
        const { data: responsesData, error: responsesError } = await supabase
          .from('responses')
          .select('response, timestamp')
          .eq('pulse_id', pulseId)
          .order('timestamp', { ascending: false });
          
        if (responsesError) throw responsesError;
        
        setResponses(responsesData.map(item => ({
          response: item.response,
          timestamp: item.timestamp
        })));
      } else {
        setResponses([]);
      }
      
      // 3. Check if we already have analysis stored
      if (pulseData?.hasAnalysis && pulseData?.analysisContent) {
        setAnalysis(pulseData.analysisContent);
        setHasAnalysis(true);
      } else {
        setHasAnalysis(false);
      }
      
      setIsInitialized(true);
      initialLoadComplete.current = true;
      
    } catch (err) {
      console.error('Error fetching pulse data:', err);
      setError('Failed to load pulse data');
    } finally {
      setIsLoading(false);
    }
  }, [pulseId, isLoading]);

  // Add useEffect for initial load - only runs once
  useEffect(() => {
    if (!initialLoadComplete.current) {
      fetchPulseData();
    }
  }, [fetchPulseData]);

  // Function to analyze responses - only called manually
  const analyzeResponses = useCallback(async () => {
    if (responses.length === 0) {
      return;
    }
    
    setIsAnalyzing(true);
    setError('');
    
    const MAX_RETRIES = 2;
    let retryCount = 0;
    let shouldRetry = true;
    
    while (shouldRetry && retryCount <= MAX_RETRIES) {
      try {
        if (retryCount > 0) {
          const delayMs = Math.min(10000, 1000 * (2 ** retryCount));
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        const result = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            responses,
            pulseId 
          }),
        });
        
        if (!result.ok) {
          const responseText = await result.text();
          let errorMessage = 'Failed to analyze responses';
          
          try {
            const errorData = JSON.parse(responseText);
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            errorMessage = `Failed to analyze responses: ${result.status}`;
          }
          
          if (result.status === 429) {
            errorMessage = 'The AI service is busy. Please wait a moment and try again.';
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              continue;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await result.json();
        
        if (!data.analysis) {
          throw new Error('No analysis returned from API');
        }
        
        // Just update the local state without triggering any fetches
        setAnalysis(data.analysis);
        setHasAnalysis(true);
        shouldRetry = false;
        
      } catch (err) {
        console.error(`Error analyzing responses (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err);
        
        if (retryCount >= MAX_RETRIES) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to analyze responses';
          setError(errorMessage);
          shouldRetry = false;
        } else {
          retryCount++;
        }
      }
    }
    
    setIsAnalyzing(false);
  }, [responses, pulseId]);

  // Function to delete the pulse
  const handleDeletePulse = async () => {
    if (!confirm('Are you sure you want to delete this pulse? This cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/pulse/${pulseId}`, {
        method: 'DELETE',
      });
      
      try {
        await deletePulse(pulseId);
      } catch (clientError) {
        console.error('Client-side deletion error:', clientError);
      }
      
      if (!response.ok) {
        throw new Error('Failed to delete pulse');
      }
      
      router.push('/');
    } catch (err) {
      console.error('Error deleting pulse:', err);
      setError('Failed to delete pulse');
      setIsDeleting(false);
    }
  };

  // Add an event handler wrapper for the button clicks
  const handleRefreshClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    fetchPulseData(true);
  }, [fetchPulseData]);

  if (!isInitialized) {
    return (
      <div className="bg-secondary rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Pulse Responses</h2>
        <p className="mb-4">Click refresh to load responses</p>
        <button 
          onClick={handleRefreshClick}
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-secondary rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Error</h2>
        <p>{error}</p>
        <button 
          onClick={handleRefreshClick}
          className="mt-4 btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-secondary rounded-lg p-6">
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
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Pulse Responses</h2>
        <div className="flex space-x-4">
          <button 
            onClick={handleRefreshClick}
            className="btn-secondary text-sm"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          {!hasAnalysis && (
            <button
              onClick={analyzeResponses}
              disabled={isAnalyzing || responses.length === 0}
              className="btn-primary"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Responses'}
            </button>
          )}
          <button
            onClick={handleDeletePulse}
            disabled={isDeleting}
            className="btn-danger"
          >
            {isDeleting ? 'Deleting...' : 'Delete Pulse'}
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-lg font-medium">
          {responses.length} Response{responses.length !== 1 ? 's' : ''}
        </p>
      </div>

      {hasAnalysis && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">AI Analysis</h3>
          <div 
            className={`prose ${theme === 'dark' ? 'prose-invert' : ''} max-w-none`}
            dangerouslySetInnerHTML={{ __html: analysis }}
          />
        </div>
      )}

      <div className="space-y-4">
        {responses.map((response, index) => (
          <div key={index} className="border border-gray-700 rounded-lg p-4">
            <p className="text-sm opacity-70 mb-2">
              {new Date(response.timestamp).toLocaleString()}
            </p>
            <p className="whitespace-pre-wrap">{response.response}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 