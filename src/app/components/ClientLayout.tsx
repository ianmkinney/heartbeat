'use client';

import { useEffect, useState } from 'react';
import { checkSchema } from '@/app/lib/supabase';
import Header from "./Header";
import VideoBackground from "./VideoBackground";
import ContentFrame from "./ContentFrame";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [schemaChecked, setSchemaChecked] = useState(false);
  const [schemaError, setSchemaError] = useState(false);

  // Check schema on component mount
  useEffect(() => {
    let isMounted = true;
    
    async function verifySchema() {
      try {
        const isValid = await checkSchema();
        
        // Only update state if component is still mounted
        if (isMounted) {
          setSchemaChecked(true);
          setSchemaError(!isValid);
        }
      } catch (err) {
        console.error('Schema verification error:', err);
        
        // Don't block the app on schema check errors
        if (isMounted) {
          setSchemaChecked(true);
          setSchemaError(false);
        }
      }
    }
    
    // Don't block initial render with schema check
    setTimeout(() => {
      verifySchema();
    }, 500);
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <VideoBackground />
      {schemaError && (
        <div className="bg-red-600 text-white p-4 text-center">
          <p className="font-bold">Database Schema Warning</p>
          <p>The database schema needs to be updated. Please run the migration script.</p>
        </div>
      )}
      <Header />
      <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 md:p-8">
        <ContentFrame>
          {children}
        </ContentFrame>
      </main>
    </>
  );
}