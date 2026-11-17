import React from 'react';

export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`cik-skeleton rounded-sticker bg-cik-pink ${className}`} />;
}
