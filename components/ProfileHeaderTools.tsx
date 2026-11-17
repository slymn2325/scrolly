'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import type { Language } from '@/i18n/translations';

const READ_KEY = 'scrolly_notif_read_v1';

type Note = { id: string; title: string; body: string };

function buildNotes(lang: Language): Note[] {
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

export default function ProfileHeaderTools({ lang }: { lang: Language }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [dark, setDark] = useState(true);
  const [sound, setSound] = useState(false);
  const notes = buildNotes(lang);
  const unread = notes.some((note) => !read.includes(note.id));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READ_KEY);
      if (raw) setRead(JSON.parse(raw) as string[]);
    } catch {
      setRead([]);
    }
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const markAll = () => {
    const ids = notes.map((note) => note.id);
    setRead(ids);
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids));
  };

  return (
    <div className="mb-3 flex items-start justify-end gap-2">
      <button
        type="button"
        data-testid="profile-theme-btn"
        title={dark ? (lang === 'tr' ? 'Açık tema' : 'Light theme') : lang === 'tr' ? 'Koyu tema' : 'Dark theme'}
        aria-label={dark ? 'Light theme' : 'Dark theme'}
        onClick={() => {
          setDark((prev) => !prev);
          window.dispatchEvent(new CustomEvent('scrolly-toggle-theme'));
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-ink"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <button
        type="button"
        data-testid="profile-sound-btn"
        title={sound ? (lang === 'tr' ? 'Sesi kapat' : 'Mute') : lang === 'tr' ? 'Sesi aç' : 'Sound on'}
        aria-label={sound ? 'Mute' : 'Sound'}
        onClick={() => {
          setSound((prev) => !prev);
          window.dispatchEvent(new CustomEvent('scrolly-toggle-sound'));
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-ink"
      >
        {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </button>
      <div className="relative">
        <button
          type="button"
          data-testid="profile-bell-btn"
          aria-label={lang === 'tr' ? 'Bildirimler' : 'Notifications'}
          onClick={() => setOpen((prev) => !prev)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-ink"
        >
          <Bell className="h-5 w-5" />
          {unread && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-peach" />}
        </button>
        {open && (
          <div
            data-testid="notification-center"
            className="absolute right-0 z-30 mt-2 w-[min(320px,80vw)] rounded-2xl border border-black/10 bg-white p-3 text-left text-ink shadow-cozy"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{lang === 'tr' ? 'Bildirimler' : 'Notifications'}</p>
              <button type="button" onClick={markAll} className="text-[11px] font-semibold text-brand">
                {lang === 'tr' ? 'Tümünü okundu say' : 'Mark all read'}
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-mute">{lang === 'tr' ? 'Bildirim yok' : 'Nothing new'}</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-xl bg-cream px-3 py-2">
                    <p className="text-sm font-semibold">{note.title}</p>
                    <p className="text-xs text-mute">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
