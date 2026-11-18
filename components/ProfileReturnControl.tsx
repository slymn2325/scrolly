'use client';

import React from 'react';
import Link from 'next/link';
import { sanitizeInternalRedirectPath } from '@/lib/originPolicy';

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
  const targetHref = returnToProfile ? '/?tab=profile' : sanitizeInternalRedirectPath(href, '/');

  return (
    <Link href={targetHref} className={className} data-testid={testId}>
      {children}
    </Link>
  );
}
