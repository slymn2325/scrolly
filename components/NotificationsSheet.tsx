'use client';

import React, { useEffect, useState } from 'react';
import type { Language } from '@/i18n/translations';
import EmptyState from '@/components/cikartma/EmptyState';
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
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!open) return;
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent('scrolly-chrome-block', { detail: { open: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('scrolly-chrome-block', { detail: { open: false } }));
    };
  }, [open]);

  const enableReminders = () => {
    if (typeof Notification === 'undefined') return;
    void Notification.requestPermission().then((result) => {
      setPermission(result);
    });
  };

  const reminderLabel =
    permission === 'granted'
      ? lang === 'tr'
        ? 'Hatırlatmalar açık'
        : 'Reminders are on'
      : lang === 'tr'
        ? 'Hatırlatmaları aç'
        : 'Turn on reminders';

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div data-testid="notification-center" className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onMarkAll}
          className="cik-footnote inline-flex h-11 items-center text-cik-cta"
        >
          {lang === 'tr' ? 'Tümünü okundu say' : 'Mark all read'}
        </button>
        {notes.length === 0 ? (
          <EmptyState
            title={lang === 'tr' ? 'Bildirim yok' : 'Nothing new'}
            body={
              lang === 'tr'
                ? 'Seri, lig ve düello haberleri burada durur.'
                : 'Streak, league, and duel news will land here.'
            }
            imageSrc="/assets/fluent/empty-nest.png"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className={`flex min-h-[52px] items-start gap-3 rounded-cik-lg px-3 py-3 ${
                  allRead ? 'bg-cik-bg' : 'bg-cik-surface-2'
                }`}
              >
                <img src={note.icon} alt="" width={24} height={24} className="mt-1 h-6 w-6 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`cik-headline min-w-0 truncate ${allRead ? 'text-cik-text-2' : 'text-cik-text'}`}>
                      {note.title}
                    </p>
                    <time className="cik-caption-2 shrink-0 text-cik-text-3">{note.when}</time>
                  </div>
                  <p className="cik-subhead text-cik-text-2">{note.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {permission !== 'unsupported' && (
          <button
            type="button"
            data-testid="notification-reminders-btn"
            onClick={enableReminders}
            disabled={permission === 'granted'}
            className="cik-headline inline-flex h-11 w-full items-center justify-center rounded-pill bg-cik-cta px-4 text-cik-on-cta disabled:opacity-60"
          >
            {reminderLabel}
          </button>
        )}
      </div>
    </Sheet>
  );
}
