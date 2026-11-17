'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import type { Language } from '@/i18n/translations';
import NotificationsSheet from '@/components/NotificationsSheet';

const READ_KEY = 'scrolly_notif_read_v1';

export type HomeNote = { id: string; title: string; body: string; icon: string; when: string };

export function buildHomeNotes(lang: Language): HomeNote[] {
  if (lang === 'en') {
    return [
      { id: 'streak', title: 'Streak reminder', body: 'Open one card today to keep your streak.', icon: '/assets/fluent/fire.png', when: '2h ago' },
      { id: 'league', title: 'League update', body: 'Your weekly league can move after the next quiz.', icon: '/assets/fluent/trophy.png', when: '5h ago' },
      { id: 'badge', title: 'Badge', body: 'New explorer badges unlock from category streaks.', icon: '/assets/fluent/sports-medal.png', when: '1d ago' },
      { id: 'duel', title: 'Duel result', body: 'Scrolla results land here after a match.', icon: '/assets/fluent/crossed-swords.png', when: '3d ago' },
      { id: 'sets', title: 'New card sets', body: 'Fresh fact sets are in Explore.', icon: '/assets/fluent/sparkles.png', when: '1w ago' },
    ];
  }
  return [
    { id: 'streak', title: 'Seri hatırlatması', body: 'Serini korumak için bugün bir kart aç.', icon: '/assets/fluent/fire.png', when: '2 sa önce' },
    { id: 'league', title: 'Lig hareketi', body: 'Haftalık ligin sonraki quizden sonra değişebilir.', icon: '/assets/fluent/trophy.png', when: '5 sa önce' },
    { id: 'badge', title: 'Rozet', body: 'Kategori serileri yeni rozet açar.', icon: '/assets/fluent/sports-medal.png', when: '1 gün önce' },
    { id: 'duel', title: 'Düello sonucu', body: 'Scrolla maç sonucu burada görünür.', icon: '/assets/fluent/crossed-swords.png', when: '3 gün önce' },
    { id: 'sets', title: 'Yeni kart setleri', body: 'Keşfet akışına yeni setler eklendi.', icon: '/assets/fluent/sparkles.png', when: '1 hf önce' },
  ];
}

export default function NotificationsBell({ lang }: { lang: Language }) {
  const [open, setOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const notes = buildHomeNotes(lang);
  const unread = allRead ? 0 : notes.length;
  const label =
    lang === 'tr'
      ? unread > 0
        ? `Bildirimler, ${unread} okunmamış`
        : 'Bildirimler'
      : unread > 0
        ? `Notifications, ${unread} unread`
        : 'Notifications';

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
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white/95 text-neutral-900 shadow-sm backdrop-blur-md hover:bg-white"
      >
        <Bell size={20} strokeWidth={2} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
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
