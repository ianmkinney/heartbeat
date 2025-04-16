'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PulseData, deletePulse } from '@/app/lib/pulses';
import { isSupabaseConfigured } from '@/app/lib/supabase';
import { supabase } from '@/app/lib/supabase';

export default function PulseDashboard() {
  const router = useRouter();
  const [pulses, setPulses] = useState<PulseData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add useEffect for initial load
  useEffect(() => {
    fetchPulses();
  }, []);

  const fetchPulses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (isSupabaseConfigured) {
        const { data: pulsesData, error: pulsesError } = await supabase
          .from('pulses')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (pulsesError) throw pulsesError;
        
        setPulses(pulsesData.map(pulse => ({
          id: pulse.id,
          user_id: pulse.user_id,
          name: pulse.name,
          createdAt: pulse.created_at,
          emails: pulse.emails,
          responseCount: pulse.response_count,
          lastChecked: pulse.last_checked,
          hasAnalysis: pulse.has_analysis,
          analysisContent: pulse.analysis_content
        })));
      } else {
        setPulses([]);
      }
    } catch (err) {
      console.error('Error fetching pulses:', err);
      setError('Failed to load pulses');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle pulse deletion
  const handleDeletePulse = async (e: React.MouseEvent, pulseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this pulse? This cannot be undone.')) {
      return;
    }
    
    setDeletingId(pulseId);
    
    try {
      const response = await fetch(`/api/pulse/${pulseId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete pulse');
      }
      
      // Update the UI by removing the deleted pulse
      setPulses(pulses.filter(pulse => pulse.id !== pulseId));
      
    } catch (error) {
      console.error('Error deleting pulse:', error);
      alert('Failed to delete pulse');
    } finally {
      setDeletingId(null);
    }
  };

  if (error) {
    return (
      <div className="bg-secondary rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Error</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchPulses}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 mx-auto mb-4">
          <svg className="w-full h-full animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p>Loading pulses...</p>
      </div>
    );
  }

  if (pulses.length === 0) {
    return (
      <div className="bg-secondary rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Recent Pulses</h2>
        <p className="opacity-80 mb-4">Click refresh to load pulses</p>
        <button 
          onClick={fetchPulses}
          className="btn-primary"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="bg-secondary rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Recent Pulses</h2>
        <button 
          onClick={fetchPulses}
          className="btn-secondary text-sm"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className="space-y-4">
        {pulses.map((pulse) => (
          <div key={pulse.id} className="relative border border-gray-700 hover:border-primary rounded-lg transition duration-300 overflow-hidden">
            <div 
              onClick={() => {
                router.push(`/results/${pulse.id}`);
              }}
              className="block p-4 cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {pulse.name || `Pulse: ${pulse.id}`}
                  </p>
                  <p className="text-sm opacity-70">
                    Created {new Date(pulse.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm opacity-70">
                    {pulse.responseCount || 0} of {pulse.emails.length} responses received
                  </p>
                </div>
                <div className="text-right" style={{ marginRight: '19px' }}>
                  {pulse.hasAnalysis && (
                    <span className="inline-block bg-primary text-white text-xs rounded-full px-2 py-1 mt-1">
                      AI Analysis Ready
                    </span>
                  )}
                  {pulse.responseCount === pulse.emails.length && !pulse.hasAnalysis && (
                    <span className="inline-block bg-green-500 text-white text-xs rounded-full px-2 py-1 mt-1">
                      Ready for Analysis
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => handleDeletePulse(e, pulse.id)}
              disabled={deletingId === pulse.id}
              className="absolute top-0 right-0 m-2 p-2 text-xs text-red-500 hover:text-red-400 rounded-full hover:bg-gray-700 transition-colors"
              title="Delete Pulse"
            >
              {deletingId === pulse.id ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}