'use client';

import React from 'react';
import type { Language } from '@/i18n/translations';
import Sheet from '@/components/cikartma/Sheet';
import type { HomeNote } from '@/components/NotificationsBell';

interface NotificationsSheetProps {
  open: boolean;
  lang: Language;
  notes: HomeNote[];
  allRead: boolean;
  onClose: () => void;
  onMarkAll: () => void;
}

export default function NotificationsSheet({
  open,
  lang,
  notes,
  allRead,
  onClose,
  onMarkAll,
}: NotificationsSheetProps) {
  const title = lang === 'tr' ? 'Bildirimler' : 'Notifications';
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div data-testid="notification-center" className="space-y-3">
        <button
          type="button"
          onClick={onMarkAll}
          className="inline-flex h-11 items-center text-sm font-bold text-cik-cta"
        >
          {lang === 'tr' ? 'Tümünü okundu say' : 'Mark all read'}
        </button>
        {notes.length === 0 ? (
          <p className="text-base font-semibold text-cik-muted">
            {lang === 'tr' ? 'Bildirim yok' : 'Nothing new'}
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => {
              const seen = allRead;
              return (
                <li
                  key={note.id}
                  className={`rounded-sticker border-[3px] border-white px-3 py-3 shadow-sticker ${
                    seen ? 'bg-cik-bg' : 'bg-cik-pink'
                  }`}
                >
                  <p className="text-sm font-bold text-cik-text">{note.title}</p>
                  <p className="text-[13px] font-semibold leading-[18px] text-cik-muted">{note.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
