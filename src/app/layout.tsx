'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers/index";
import Header from "./components/Header";
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
    async function verifySchema() {
      const isValid = await checkSchema();
      setSchemaChecked(true);
      setSchemaError(!isValid);
    }
    
    verifySchema();
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
