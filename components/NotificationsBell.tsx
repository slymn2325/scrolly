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
    { id: 'streak', title: 'Seri hatirlatmasi', body: 'Serini korumak icin bugun bir kart ac.' },
    { id: 'league', title: 'Lig hareketi', body: 'Haftalik ligin sonraki quizden sonra degisebilir.' },
    { id: 'badge', title: 'Rozet', body: 'Kategori serileri yeni rozet acar.' },
    { id: 'duel', title: 'Duello sonucu', body: 'Scrolla mac sonucu burada gorunur.' },
    { id: 'sets', title: 'Yeni kart setleri', body: 'Kesfet akisina yeni setler eklendi.' },
  ];
}

export default function NotificationsBell({ lang }: { lang: Language }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const notes = buildHomeNotes(lang);
  const unread = notes.filter((note) => !read.includes(note.id)).length;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READ_KEY);
      if (raw) setRead(JSON.parse(raw) as string[]);
    } catch {
      setRead([]);
    }
  }, []);

  const markAll = () => {
    const ids = notes.map((note) => note.id);
    setRead(ids);
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids));
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
        read={read}
        onClose={() => setOpen(false)}
        onMarkAll={markAll}
      />
    </>
  );
}
