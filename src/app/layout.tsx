'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers/index";
import Header from "./components/Header";
import VideoBackground from "./components/VideoBackground";
import { useEffect, useState } from 'react';
import { checkSchema } from '@/app/lib/supabase';

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Heartbeat - Anonymous Team Pulses</title>
        <meta name="description" content="Send anonymous survey pulses to your team" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VideoBackground />
        {schemaError && (
          <div className="bg-red-600 text-white p-4 text-center">
            <p className="font-bold">Database Schema Warning</p>
            <p>The database schema needs to be updated. Please run the migration script.</p>
          </div>
        )}
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
