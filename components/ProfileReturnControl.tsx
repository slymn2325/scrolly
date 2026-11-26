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
  const sanitizedHref = sanitizeInternalRedirectPath(href, '/');
  const profileTarget = sanitizedHref.startsWith('/en') ? '/en?tab=profile' : '/?tab=profile';
  const targetHref = returnToProfile ? profileTarget : sanitizedHref;

  return (
    <Link href={targetHref} className={className} data-testid={testId}>
      {children}
    </Link>
  );
}
