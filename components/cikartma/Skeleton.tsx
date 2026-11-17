import React from 'react';

export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`cik-skeleton min-h-4 rounded-cik-md ${className}`} />;
}
