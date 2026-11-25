'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import LazyAuthPrompt from '@/components/LazyAuthPrompt';
import StoryStudioClient from '@/components/stories/StoryStudioClient';
import StudioLandingView from '@/components/stories/StudioLandingView';
import { AUTH_CHANGED_EVENT, fetchSession } from '@/lib/authClient';
import type { AuthUserDto } from '@/types/auth';
import type { StoryLanguage } from '@/types/story';

export default function StudioGateClient() {
  const [language, setLanguage] = useState<StoryLanguage>('tr');
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [sessionUser, setSessionUser] = useState<AuthUserDto | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  const refreshSession = useCallback(async () => {
    const res = await fetchSession();
    setSessionUser(res.authenticated && res.user ? res.user : null);
    setCheckingSession(false);
  }, []);

  useEffect(() => {
    void refreshSession();

    const handleAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: AuthUserDto | null }>).detail;
      if (detail && 'user' in detail) {
        setSessionUser(detail.user ?? null);
        setCheckingSession(false);
      } else {
        void refreshSession();
      }
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged as EventListener);
    return () =>
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged as EventListener);
  }, [refreshSession]);

  return (
    <>
      {checkingSession ? (
        <main className="flex min-h-[100dvh] items-center justify-center bg-cik-bg text-cik-text">
          <div className="flex items-center gap-2.5 rounded-pill border border-cik-line bg-cik-surface px-4 py-2.5 text-xs font-extrabold text-cik-text-2 shadow-e1">
            <Loader2 className="h-4 w-4 animate-spin text-cik-cta" aria-hidden="true" />
            <span>{language === 'tr' ? 'Stüdyo hazırlanıyor...' : 'Loading Studio...'}</span>
          </div>
        </main>
      ) : sessionUser ? (
        <StoryStudioClient
          user={sessionUser}
          initialLanguage={language}
          onSignedOut={() => setSessionUser(null)}
        />
      ) : (
        <StudioLandingView
          language={language}
          onChangeLanguage={setLanguage}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />
      )}

      <LazyAuthPrompt
        open={authModalOpen}
        nudgeOpen={false}
        nudgePlacement="hidden"
        trigger="manual"
        lang={language}
        currentXp={sessionUser?.xp ?? 0}
        onCloseModal={() => setAuthModalOpen(false)}
        onDismissNudge={() => {}}
        onOpenModalFromNudge={() => setAuthModalOpen(true)}
        onAuthenticated={(user) => {
          setSessionUser(user);
          setAuthModalOpen(false);
        }}
      />
    </>
  );
}
