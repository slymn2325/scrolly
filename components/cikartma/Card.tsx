import React from 'react';

interface CardProps {
  media?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export default function Card({ media, title, children, className = '' }: CardProps) {
  return (
    <article
      className={`cik-sticker overflow-hidden rounded-sticker border-4 border-cik-sticker-rim bg-cik-surface text-cik-text shadow-sticker ${className}`}
    >
      {media ? <div className="overflow-hidden">{media}</div> : null}
      <div className="flex flex-col gap-2 p-5">
        <h3 className="cik-title-2 line-clamp-3 text-cik-text">{title}</h3>
        {children ? <div className="cik-body text-cik-text-2">{children}</div> : null}
      </div>
    </article>
  );
}
