'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const DOCUMENT_SCROLL_ROUTES = new Set(['/contact', '/about', '/privacy', '/terms', '/create']);

export default function DocScrollFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const documentScroll =
    DOCUMENT_SCROLL_ROUTES.has(pathname) || pathname.startsWith('/create/');

  useEffect(() => {
    const root = document.documentElement;
    if (!documentScroll) {
      root.classList.remove('scrolly-doc-scroll');
      return;
    }
    root.classList.add('scrolly-doc-scroll');
    return () => root.classList.remove('scrolly-doc-scroll');
  }, [documentScroll]);

  return (
    <div
      data-doc-scroll={documentScroll ? 'true' : 'false'}
      className={
        documentScroll
          ? 'h-auto min-h-[100dvh] overflow-y-auto'
          : 'h-[100dvh] min-h-0 overflow-hidden'
      }
    >
      {children}
    </div>
  );
}
