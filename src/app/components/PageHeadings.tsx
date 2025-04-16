'use client';

import React from 'react';

interface TitleProps {
  className?: string;
}

export function PageTitle({ className = '' }: TitleProps) {
  return (
    <h1 className={`text-4xl font-bold ${className}`}>
      Team Pulse Monitoring
    </h1>
  );
}

export function PageDescription({ className = '' }: TitleProps) {
  return (
    <p className={`text-xl text-muted ${className}`}>
      Anonymously monitor your team&apos;s wellbeing with pulse checks
    </p>
  );
}