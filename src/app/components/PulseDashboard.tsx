'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllPulses, PulseData, deletePulse } from '@/app/lib/pulses';
import HeartbeatAnimation from './HeartbeatAnimation';

export default function PulseDashboard() {
  const [pulses, setPulses] = useState<PulseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Load pulses on component mount and periodically
    const loadPulses = async () => {
      try {
        const loadedPulses = await getAllPulses();
        setPulses(loadedPulses);
      } catch (error) {
        console.error('Error loading pulses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPulses();
    
    // Refresh every 30 seconds to check for updates
    const interval = setInterval(loadPulses, 30000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Function to handle pulse deletion
  const handleDeletePulse = async (e: React.MouseEvent, pulseId: string) => {
    e.preventDefault(); // Prevent navigation to pulse page
    e.stopPropagation(); // Prevent event bubbling
    
    if (!confirm('Are you sure you want to delete this pulse? This cannot be undone.')) {
      return;
    }
    
    setDeletingId(pulseId);
    
    try {
      // Call the API to delete the pulse
      const response = await fetch(`/api/pulse/${pulseId}`, {
        method: 'DELETE',
      });
      
      // Also attempt local deletion
      try {
        await deletePulse(pulseId);
      } catch (error) {
        console.error('Error with local deletion:', error);
      }
      
      if (!response.ok) {
        throw new Error('Failed to delete pulse');
      }
      
      // Remove the deleted pulse from the state
      setPulses(pulses.filter(pulse => pulse.id !== pulseId));
      
    } catch (error) {
      console.error('Error deleting pulse:', error);
      alert('Failed to delete pulse');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <HeartbeatAnimation />
        <p>Loading pulses...</p>
      </div>
    );
  }

  if (pulses.length === 0) {
    return (
      <div className="bg-secondary rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Recent Pulses</h2>
        <p className="opacity-80 mb-4">No pulses have been created yet</p>
        <p>Create your first pulse to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-secondary rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Recent Pulses</h2>
      <div className="space-y-4">
        {pulses.map((pulse) => (
          <div key={pulse.id} className="relative border border-gray-700 hover:border-primary rounded-lg transition duration-300 overflow-hidden">
            <Link 
              href={`/results/${pulse.id}`}
              className="block p-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    Pulse: {pulse.id}
                  </p>
                  <p className="text-sm opacity-70">
                    Created {new Date(pulse.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm opacity-70">
                    Sent to {pulse.emails.length} recipient{pulse.emails.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {pulse.responseCount || 0} <span className="opacity-70 text-sm">responses</span>
                  </p>
                  {pulse.hasAnalysis && (
                    <span className="inline-block bg-primary text-white text-xs rounded-full px-2 py-1 mt-1">
                      AI Analysis Ready
                    </span>
                  )}
                </div>
              </div>
            </Link>
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