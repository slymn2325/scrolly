import React from 'react';
import Button from '@/components/cikartma/Button';

interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  imageSrc?: string;
  imageAlt?: string;
}

export default function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  imageSrc,
  imageAlt = '',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
      {imageSrc ? <img src={imageSrc} alt={imageAlt} width={72} height={72} /> : null}
      <div className="flex max-w-sm flex-col gap-2">
        <p className="cik-title-3 text-cik-text">{title}</p>
        {body ? <p className="cik-body text-cik-text-2">{body}</p> : null}
      </div>
      {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
