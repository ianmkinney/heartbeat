'use client';

import React, { ReactNode } from 'react';

interface ContentFrameProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

const ContentFrame: React.FC<ContentFrameProps> = ({ 
  children, 
  className = '',
  maxWidth = 'max-w-7xl'
}) => {
  return (
    <div className={`content-frame mx-auto ${maxWidth} ${className}`}>
      {children}
    </div>
  );
};

export default ContentFrame;