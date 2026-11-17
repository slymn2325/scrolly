'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ProfileReturnControlProps {
  returnToProfile: boolean;
  href?: string;
  className?: string;
  testId?: string;
  children: React.ReactNode;
}

export default function ProfileReturnControl({
  returnToProfile,
  href = '/',
  className,
  testId,
  children,
}: ProfileReturnControlProps) {
  const router = useRouter();

  if (!returnToProfile) {
    return (
      <Link href={href} className={className} data-testid={testId}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className={`cursor-pointer font-[inherit] ${className ?? ''}`}
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
          return;
        }
        router.push('/?tab=profile');
      }}
    >
      {children}
    </button>
  );
}
