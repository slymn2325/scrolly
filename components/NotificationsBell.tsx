'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import type { Language } from '@/i18n/translations';
import NotificationsSheet from '@/components/NotificationsSheet';

const READ_KEY = 'scrolly_notif_read_v1';

export type HomeNote = { id: string; title: string; body: string };

export function buildHomeNotes(lang: Language): HomeNote[] {
  if (lang === 'en') {
    return [
      { id: 'streak', title: 'Streak reminder', body: 'Open one card today to keep your streak.' },
      { id: 'league', title: 'League update', body: 'Your weekly league can move after the next quiz.' },
      { id: 'badge', title: 'Badge', body: 'New explorer badges unlock from category streaks.' },
      { id: 'duel', title: 'Duel result', body: 'Scrolla results land here after a match.' },
      { id: 'sets', title: 'New card sets', body: 'Fresh fact sets are in Explore.' },
    ];
  }
  return [
    { id: 'streak', title: 'Seri hatırlatması', body: 'Serini korumak için bugün bir kart aç.' },
    { id: 'league', title: 'Lig hareketi', body: 'Haftalık ligin sonraki quizden sonra değişebilir.' },
    { id: 'badge', title: 'Rozet', body: 'Kategori serileri yeni rozet açar.' },
    { id: 'duel', title: 'Düello sonucu', body: 'Scrolla maç sonucu burada görünür.' },
    { id: 'sets', title: 'Yeni kart setleri', body: 'Keşfet akışına yeni setler eklendi.' },
  ];
}

export default function NotificationsBell({ lang }: { lang: Language }) {
  const [open, setOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const notes = buildHomeNotes(lang);
  const unread = allRead ? 0 : notes.length;

  useEffect(() => {
    try {
      setAllRead(window.localStorage.getItem(READ_KEY) != null);
    } catch {
      setAllRead(false);
    }
  }, []);

  const markAll = () => {
    setAllRead(true);
    try {
      window.localStorage.setItem(READ_KEY, '1');
    } catch {
      // Ignore private-mode storage failures. The badge still clears for this visit.
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="home-bell-btn"
        aria-label={lang === 'tr' ? 'Bildirimler' : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-pill border-[3px] border-white bg-cik-surface text-cik-text shadow-sticker"
      >
        <Bell size={20} strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-cik-cta ring-2 ring-white" />
        )}
      </button>
      <NotificationsSheet
        open={open}
        lang={lang}
        notes={notes}
        allRead={allRead}
        onClose={() => setOpen(false)}
        onMarkAll={markAll}
      />
    </>
  );
}
