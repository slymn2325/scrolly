'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import EmptyState from '@/components/cikartma/EmptyState';
import { profileCopy } from '@/components/profile/copy';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import { motionSpring, motionTiming } from '@/lib/motion';
import type { FactCard } from '@/utils/factsData';

interface StickerAlbumProps {
  lang: Language;
  seenIds: string[];
  allFacts: FactCard[];
  onBackToFeed: () => void;
}

export default function StickerAlbum({ lang, seenIds, allFacts, onBackToFeed }: StickerAlbumProps) {
  const copy = profileCopy(lang);
  const reduced = useReducedMotion() === true;
  const knownRef = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const facts = useMemo(
    () => allFacts.filter((fact) => seenIds.includes(fact.id)),
    [allFacts, seenIds],
  );
  const seenKey = facts.map((fact) => fact.id).join('|');

  useEffect(() => {
    const ids = seenKey ? seenKey.split('|') : [];
    const known = knownRef.current;
    if (known) {
      const fresh = new Set(ids.filter((id) => !known.has(id)));
      if (fresh.size > 0) setFreshIds(fresh);
    }
    knownRef.current = new Set(ids);
  }, [seenKey]);

  if (facts.length === 0) {
    return (
      <EmptyState
        imageSrc="/assets/fluent/empty-nest.png"
        imageAlt=""
        title={copy.albumEmptyTitle}
        body={copy.albumEmptyBody}
        actionLabel={copy.backToFeed}
        onAction={onBackToFeed}
      />
    );
  }

  return (
    <div data-testid="profile-album" className="grid grid-cols-2 gap-3">
      {facts.map((fact, index) => {
        const meta = getCategoryMeta(fact.category);
        const tilt = index % 2 === 0 ? -2 : 2;
        const fresh = freshIds.has(fact.id);
        return (
          <motion.article
            key={fact.id}
            initial={fresh && !reduced ? { scale: 1.25, rotate: -6 } : false}
            animate={
              fresh && !reduced
                ? { scale: [1.25, 0.92, 1], rotate: [-6, -2, tilt] }
                : { scale: 1, rotate: tilt }
            }
            transition={reduced ? motionTiming.reducedFade : motionSpring.stickerSlap}
            className="rounded-sticker border-4 border-cik-sticker-rim bg-cik-pink p-3 text-cik-text shadow-sticker"
          >
            <img src={meta.iconPath} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
            <p className="cik-footnote mt-2 line-clamp-2 text-cik-text">{fact[lang].title}</p>
          </motion.article>
        );
      })}
    </div>
  );
}
