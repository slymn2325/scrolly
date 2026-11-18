'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
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
      { id: 'vocab', title: 'Word Lab', body: 'New B1–C2 vocabulary cards are ready to practice.', icon: '/assets/fluent/books.png', when: '1w ago' },
      { id: 'daily', title: 'Daily Sprint', body: 'Complete today’s 5-card sprint to lock bonus XP.', icon: '/assets/fluent/direct-hit.png', when: '2w ago' },
    ];
  }
  return [
    { id: 'streak', title: 'Seri hatırlatması', body: 'Serini korumak için bugün bir kart aç.', icon: '/assets/fluent/fire.png', when: '2 sa önce' },
    { id: 'league', title: 'Lig hareketi', body: 'Haftalık ligin sonraki quizden sonra değişebilir.', icon: '/assets/fluent/trophy.png', when: '5 sa önce' },
    { id: 'badge', title: 'Rozet', body: 'Kategori serileri yeni rozet açar.', icon: '/assets/fluent/sports-medal.png', when: '1 gün önce' },
    { id: 'duel', title: 'Düello sonucu', body: 'Scrolla maç sonucu burada görünür.', icon: '/assets/fluent/crossed-swords.png', when: '3 gün önce' },
    { id: 'sets', title: 'Yeni kart setleri', body: 'Keşfet akışına yeni setler eklendi.', icon: '/assets/fluent/sparkles.png', when: '1 hf önce' },
    { id: 'vocab', title: 'Kelime Laboratuvarı', body: 'Yeni B1–C2 İngilizce kelime kartları seni bekliyor.', icon: '/assets/fluent/books.png', when: '1 hf önce' },
    { id: 'daily', title: 'Günlük Sprint', body: 'Bonus XP için bugünün 5 kartlık sprintini tamamla.', icon: '/assets/fluent/direct-hit.png', when: '2 hf önce' },
  ];
}

export default function NotificationsBell({ lang }: { lang: Language }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const notes = buildHomeNotes(lang);
  const previewNotes = notes.slice(0, 5);
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

  useEffect(() => {
    const onChromeBlock = (event: Event) => {
      const open = Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open);
      if (open) setMenuOpen(false);
    };
    window.addEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
    return () => window.removeEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

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
      <div ref={rootRef} className="relative shrink-0">
        <button
          ref={buttonRef}
          type="button"
          data-testid="home-bell-btn"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/95 text-neutral-900 shadow-sm backdrop-blur-md hover:bg-white lg:h-10 lg:w-10"
        >
          <Bell size={18} strokeWidth={2} aria-hidden="true" className="h-[18px] w-[18px] lg:h-5 lg:w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {menuOpen ? (
          <div
            role="menu"
            aria-label={lang === 'tr' ? 'Bildirimler' : 'Notifications'}
            data-testid="notifications-dropdown"
            data-scroll-contain="true"
            className="pointer-events-auto absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-black/10 bg-white/95 p-2 text-neutral-900 shadow-xl backdrop-blur-md outline-none ring-0 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-[#1C1B22]/95 dark:text-white"
          >
            <div className="flex items-center justify-between gap-2 border-b border-black/10 px-2 pb-2 pt-1 dark:border-white/10">
              <span className="text-xs font-extrabold">
                {lang === 'tr' ? 'Bildirimler' : 'Notifications'}
              </span>
              <button
                type="button"
                onClick={markAll}
                className="text-[11px] font-bold text-[#C83E6B] hover:underline focus:outline-none"
              >
                {lang === 'tr' ? 'Tümünü okundu say' : 'Mark all read'}
              </button>
            </div>

            <ul className="mt-1.5 flex flex-col gap-1">
              {previewNotes.map((note) => (
                <li
                  key={note.id}
                  className={`flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors ${
                    allRead
                      ? 'opacity-75 hover:bg-black/5 dark:hover:bg-white/5'
                      : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/10'
                  }`}
                >
                  <span className="relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10">
                    <img src={note.icon} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                    {!allRead ? (
                      <span
                        aria-hidden="true"
                        className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#C83E6B]"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate text-xs font-bold">{note.title}</p>
                      <time className="shrink-0 text-[10px] font-semibold text-neutral-500 dark:text-white/55">
                        {note.when}
                      </time>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-600 dark:text-white/75">
                      {note.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              data-testid="notifications-see-all-btn"
              onClick={() => {
                setMenuOpen(false);
                setSheetOpen(true);
              }}
              className="mt-1.5 flex w-full items-center justify-between rounded-xl border-t border-black/10 px-2.5 py-2.5 text-xs font-extrabold text-[#C83E6B] hover:bg-black/5 focus:outline-none dark:border-white/10 dark:hover:bg-white/10"
            >
              <span>{lang === 'tr' ? 'Tümünü gör / Daha fazla →' : 'See all / More →'}</span>
              <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <NotificationsSheet
        open={sheetOpen}
        lang={lang}
        notes={notes}
        allRead={allRead}
        onClose={() => setSheetOpen(false)}
        onMarkAll={markAll}
      />
    </>
  );
}
