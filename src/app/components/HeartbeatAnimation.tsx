'use client';

import { useEffect, useState } from 'react';

export default function HeartbeatAnimation() {
  const [beatsVisible, setBeatsVisible] = useState(Array(5).fill(false));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setBeatsVisible(prev => {
        const newBeats = [...prev];
        // Find the index of the first false value
        const index = newBeats.findIndex(beat => !beat);
        
        if (index !== -1) {
          newBeats[index] = true;
          
          // Set a timeout to turn it off after animation completes
          setTimeout(() => {
            setBeatsVisible(prev => {
              const newestBeats = [...prev];
              newestBeats[index] = false;
              return newestBeats;
            });
          }, 1500);
          
          return newBeats;
        } else {
          // All are visible, reset the first one
          setTimeout(() => {
            setBeatsVisible(prev => {
              const newestBeats = [...prev];
              newestBeats[0] = false;
              return newestBeats;
            });
          }, 100);
          
          return prev;
        }
      });
    }, 800);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="w-full h-24 flex items-center justify-center relative my-12">
      <div className="heartbeat-line w-full absolute"></div>
      <div className="flex w-full justify-between px-12 absolute">
        {beatsVisible.map((isVisible, idx) => (
          <div 
            key={idx} 
            className={`pulse-dot h-4 w-4 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          ></div>
        ))}
      </div>
    </div>
  );
} 