'use client';

import { useEffect } from 'react';
import type { Language } from '@/i18n/translations';

interface HtmlLangSyncProps {
  lang: Language;
}

export default function HtmlLangSync({ lang }: HtmlLangSyncProps) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
