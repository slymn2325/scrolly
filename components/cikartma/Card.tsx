import React from 'react';

interface CardProps {
  media?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export default function Card({ media, title, children, className = '' }: CardProps) {
  return (
    <article className={`overflow-hidden rounded-sticker border-[3px] border-white bg-cik-surface text-cik-text shadow-sticker ${className}`}>
      {media ? <div className="overflow-hidden">{media}</div> : null}
      <div className="space-y-2 p-4">
        <h3 className="font-display text-[22px] font-bold leading-7 text-cik-text">{title}</h3>
        {children}
      </div>
    </article>
  );
}
