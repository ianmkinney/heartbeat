'use client';

import { useState, useEffect, useCallback } from 'react';
import HeartbeatAnimation from './HeartbeatAnimation';
import { updatePulseResponseCount, getPulseById, deletePulse } from '@/app/lib/pulses';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';

interface PulseResultsProps {
  pulseId: string;
}

// Default user ID
const DEFAULT_USER_ID = 1;

export default function PulseResults({ pulseId }: PulseResultsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState<Array<{ response: string, timestamp: string }>>([]);
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResponseCount, setLastResponseCount] = useState(0);
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Check for userId when component mounts
  useEffect(() => {
    const checkUserId = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('heartbeat_users')
            .select('user_id')
            .eq('id', pulseId)
            .single();
            
          if (!error && data && data.user_id) {
            setUserId(data.user_id);
          }
        } catch (err) {
          console.error('Error fetching user ID:', err);
          // Continue with default user ID
        }
      }
    };
    
    checkUserId();
  }, [pulseId]);
  
  // Function to analyze responses - moved up and memoized with useCallback
  const analyzeResponses = useCallback(async (responsesToAnalyze = responses) => {
    if (responsesToAnalyze.length === 0) {
      return; // Don't show an error, just don't analyze
    }
    
    setIsAnalyzing(true);
    setError('');
    
    try {
      const result = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          responses: responsesToAnalyze,
          pulseId 
        }),
      });
      
      if (!result.ok) {
        throw new Error('Failed to analyze responses');
      }
      
      const data = await result.json();
      setAnalysis(data.analysis);
      
    } catch (err) {
      console.error('Error analyzing responses:', err);
      setError('Failed to analyze responses');
    } finally {
      setIsAnalyzing(false);
    }
  }, [responses, pulseId]);
  
  // Fetch responses when component mounts or periodically
  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const result = await fetch(`/api/survey?pulseId=${pulseId}`);
        
        if (!result.ok) {
          throw new Error('Failed to fetch responses');
        }
        
        const data = await result.json();
        setResponses(data.responses || []);
        
        // Get existing pulse data from database or localStorage
        const pulseData = await getPulseById(pulseId);
        const currentResponseCount = data.responses?.length || 0;
        
        // Check if the pulse has a stored analysis
        if (pulseData?.hasAnalysis && pulseData?.analysisContent && !analysis) {
          // Use the stored analysis if available
          setAnalysis(pulseData.analysisContent);
        } else if (isSupabaseConfigured && !analysis) {
          // Try to fetch analysis from Supabase
          try {
            const { data: analysisData, error: analysisError } = await supabase
              .from('analyses')
              .select('content')
              .eq('pulse_id', pulseId)
              .single();
              
            if (!analysisError && analysisData?.content) {
              setAnalysis(analysisData.content);
              
              // Update pulse to indicate it has an analysis
              await updatePulseResponseCount(
                pulseId, 
                currentResponseCount, 
                true, 
                analysisData.content,
                userId
              );
            }
          } catch (dbError) {
            console.error('Error fetching analysis from Supabase:', dbError);
          }
        }
        
        // Update pulse data if response count changed
        if (pulseData && currentResponseCount !== pulseData.responseCount) {
          await updatePulseResponseCount(
            pulseId, 
            currentResponseCount, 
            !!analysis || pulseData.hasAnalysis, 
            analysis || pulseData.analysisContent,
            userId
          );
        }
        
        // If we have new responses and there are responses, trigger analysis
        if (data.responses?.length > 0 && data.responses.length !== lastResponseCount) {
          setLastResponseCount(data.responses.length);
          analyzeResponses(data.responses);
        }
      } catch (err) {
        console.error('Error fetching responses:', err);
        setError('Failed to load responses');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fetch immediately
    fetchResponses();
    
    // Then set up polling every 30 seconds to check for new responses
    const interval = setInterval(fetchResponses, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [pulseId, analysis, lastResponseCount, userId, analyzeResponses]);
  
  // Function to delete the pulse
  const handleDeletePulse = async () => {
    if (!confirm('Are you sure you want to delete this pulse? This cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // First try the API route
      const response = await fetch(`/api/pulse/${pulseId}`, {
        method: 'DELETE',
      });
      
      // For client-side, also attempt to clean up localStorage directly
      // This provides a fallback if the server-side deletion fails
      try {
        await deletePulse(pulseId);
      } catch (clientError) {
        console.error('Client-side deletion error:', clientError);
        // Continue with the flow even if this fails
      }
      
      if (!response.ok) {
        throw new Error('Failed to delete pulse');
      }
      
      // Redirect to home page after successful deletion
      router.push('/');
    } catch (err) {
      console.error('Error deleting pulse:', err);
      setError('Failed to delete pulse');
      setIsDeleting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <HeartbeatAnimation />
        <p>Loading responses...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="warning-box">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="bg-secondary rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Pulse Status</h2>
        <p className="mb-2">Pulse ID: {pulseId}</p>
        <p className="mb-4">Total Responses: {responses.length}</p>
        
        <div className="flex flex-wrap gap-4">
          {responses.length > 0 && !analysis && !isAnalyzing && (
            <button 
              onClick={() => analyzeResponses()}
              className="btn-primary"
            >
              Analyze Responses
            </button>
          )}
          
          <button 
            onClick={handleDeletePulse}
            className="btn-secondary border-red-500 hover:border-red-400 text-red-500 hover:text-red-400"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Pulse'}
          </button>
        </div>
        
        {isAnalyzing && (
          <div className="text-center py-4">
            <HeartbeatAnimation />
            <p>Analyzing responses...</p>
          </div>
        )}
      </div>
      
      {analysis && (
        <div className="bg-secondary rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Team Pulse Analysis</h2>
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: analysis }}
          />
        </div>
      )}
    </div>
  );
} 