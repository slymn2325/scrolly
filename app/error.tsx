'use client';

import ErrorFallbackView from '@/components/ErrorFallbackView';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return <ErrorFallbackView error={error} reset={reset} />;
}
