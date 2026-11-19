'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { checkIsStandalone } from '@/components/PwaInstallPrompt';
import ProfileHeaderTools from '@/components/ProfileHeaderTools';
import IconButton from '@/components/cikartma/IconButton';
import DiplomaBadges from '@/components/profile/DiplomaBadges';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabs, { type ProfilePane } from '@/components/profile/ProfileTabs';
import SavedList from '@/components/profile/SavedList';
import SettingsSheet from '@/components/profile/SettingsSheet';
import StatsSummary from '@/components/profile/StatsSummary';
import StickerAlbum from '@/components/profile/StickerAlbum';
import { profileCopy } from '@/components/profile/copy';
import {
  COOKIE_CHOICE_EVENT,
  paintAppearance,
  paintLanguage,
  prefersDarkScheme,
  readCookieChoice,
  readHapticsEnabled,
  writeHapticsEnabled,
} from '@/components/profile/persist';
import { useEscapeClose } from '@/utils/useEscapeClose';
import {
  type CategoryId,
  type Language,
  translations,
} from '@/i18n/translations';
import { applyAppearance, type AppearanceMode } from '@/lib/theme';
import { motionSpring, motionTiming } from '@/lib/motion';
import { applyGoogleConsentChoice } from '@/utils/consent';
import { generateDiplomaCertificateImage } from '@/utils/diplomaCanvasGenerator';
import type { FactCard } from '@/utils/factsData';
import { loadLikedFactIds, removeLikedFact } from '@/utils/likedFacts';
import { loadSavedFactIds, removeSavedFact, SAVED_FACTS_UPDATED_EVENT } from '@/utils/savedFacts';
import { getLeagueInfo, saveUserMemory, type UserMemoryState } from '@/utils/userMemory';
import type { SavedVocabularyEntry } from '@/types/vocabulary';
import { loadSavedVocabNotebook, removeSavedVocabWord } from '@/utils/vocabNotebook';

interface DiplomaProfileModalProps {
  open: boolean;
  lang: Language;
  memory: UserMemoryState;
  allFacts: FactCard[];
  presentation?: 'modal' | 'page';
  notebookFocus?: number;
  onUpdateNickname: (nick: string) => void;
  onToggleNotifications: () => void;
  onSelectCategoryFromConstellation: (category: CategoryId) => void;
  onRemoveFavorite: (factId: string) => void;
  onResetMemory: () => void;
  onRequestPwaInstall?: () => void;
  onClose: () => void;
  onButtonPop: () => void;
  onCelebrateLeague: () => void;
}

function resolvedAppearance(memory: UserMemoryState): AppearanceMode {
  if (memory.appearance === 'light' || memory.appearance === 'dark' || memory.appearance === 'system') {
    return memory.appearance;
  }
  if (memory.themeCustomized && memory.darkMode) return 'dark';
  return 'light';
}

export default function DiplomaProfileModal({
  open,
  lang,
  memory,
  allFacts,
  presentation = 'modal',
  notebookFocus = 0,
  onUpdateNickname,
  onToggleNotifications,
  onSelectCategoryFromConstellation,
  onRemoveFavorite,
  onResetMemory,
  onRequestPwaInstall,
  onClose,
  onButtonPop,
  onCelebrateLeague,
}: DiplomaProfileModalProps) {
  const router = useRouter();
  const reduced = useReducedMotion() === true;
  const isPage = presentation === 'page';
  const [uiLang, setUiLang] = useState<Language>(lang);
  const [pane, setPane] = useState<ProfilePane>(notebookFocus > 0 ? 'saved' : 'ozet');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceMode>(resolvedAppearance(memory));
  const [hapticsOn, setHapticsOn] = useState(true);
  const [cookieChoice, setCookieChoice] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [justReset, setJustReset] = useState(false);
  const [exportingDiploma, setExportingDiploma] = useState(false);
  const [toast, setToast] = useState<{ message: string; testId?: string; undo?: () => void } | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [savedVocab, setSavedVocab] = useState<SavedVocabularyEntry[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [offline, setOffline] = useState(false);
  const [nickFocus, setNickFocus] = useState(0);
  const [paintedDark, setPaintedDark] = useState(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const appearanceRef = useRef<AppearanceMode | null>(memory.appearance ?? null);
  const t = translations[uiLang];
  const copy = profileCopy(uiLang);
  const league = getLeagueInfo(memory.xp, uiLang);

  useEffect(() => {
    setUiLang(lang);
  }, [lang]);

  useEffect(() => {
    if (notebookFocus <= 0) return;
    setPane('saved');
  }, [notebookFocus]);

  useEffect(() => {
    setPaintedDark(document.documentElement.classList.contains('dark'));
  }, [appearance, memory.darkMode, open]);

  useEffect(() => {
    if (memory.appearance) {
      appearanceRef.current = memory.appearance;
      setAppearance(memory.appearance);
    }
  }, [memory.appearance]);

  useEffect(() => {
    setHapticsOn(readHapticsEnabled());
    setCookieChoice(memory.cookieAccepted ? readCookieChoice() : 'unknown');
  }, [memory.cookieAccepted, open]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readAuthEmail = () => {
      try {
        const stored = window.localStorage.getItem('scrolly_auth_user_email');
        setAuthEmail(stored && stored.trim() ? stored.trim() : null);
      } catch {
        setAuthEmail(null);
      }
    };
    readAuthEmail();
    const onAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: { email?: string } | null }>).detail;
      if (detail && 'user' in detail) setAuthEmail(detail.user?.email?.trim() || null);
      else readAuthEmail();
    };
    window.addEventListener('scrolly-auth-changed', onAuthChanged as EventListener);
    window.addEventListener('storage', readAuthEmail);
    return () => {
      window.removeEventListener('scrolly-auth-changed', onAuthChanged as EventListener);
      window.removeEventListener('storage', readAuthEmail);
    };
  }, [open]);

  useEffect(() => {
    setIsStandalone(checkIsStandalone());
    if (!open) return;
    const resetTop = () => {
      if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0;
    };
    resetTop();
    const rafId = requestAnimationFrame(resetTop);
    return () => cancelAnimationFrame(rafId);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const syncVocab = () => setSavedVocab(loadSavedVocabNotebook());
    const syncSaved = () => setSavedIds(loadSavedFactIds());
    const syncLikes = () => setLikedIds(loadLikedFactIds());
    syncVocab();
    syncSaved();
    syncLikes();
    window.addEventListener('scrolly-vocab-updated', syncVocab);
    window.addEventListener(SAVED_FACTS_UPDATED_EVENT, syncSaved);
    window.addEventListener('scrolly-liked-facts-updated', syncLikes);
    return () => {
      window.removeEventListener('scrolly-vocab-updated', syncVocab);
      window.removeEventListener(SAVED_FACTS_UPDATED_EVENT, syncSaved);
      window.removeEventListener('scrolly-liked-facts-updated', syncLikes);
    };
  }, [open]);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEscapeClose(open && !isPage && !settingsOpen, onClose);

  const savedIdSet = new Set([...savedIds, ...memory.favoriteIds]);
  const likedIdSet = new Set(likedIds);
  const savedFacts = allFacts.filter((fact) => savedIdSet.has(fact.id));
  const likedFacts = allFacts.filter((fact) => likedIdSet.has(fact.id));

  const withAppearance = (base: UserMemoryState): UserMemoryState => {
    if (!appearanceRef.current) return base;
    return applyAppearance(base, appearanceRef.current, prefersDarkScheme());
  };

  const chooseAppearance = (mode: AppearanceMode) => {
    onButtonPop();
    appearanceRef.current = mode;
    const next = paintAppearance(memory, mode);
    saveUserMemory(next);
    setAppearance(mode);
  };

  const chooseLanguage = (nextLang: Language) => {
    onButtonPop();
    const next = { ...withAppearance(memory), lang: nextLang };
    saveUserMemory(next);
    paintLanguage(nextLang);
    setUiLang(nextLang);
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const onEn = path === '/en' || path === '/en/';
    const onTr = path === '/';
    if (!onEn && !onTr) return;
    if ((nextLang === 'en' && onEn) || (nextLang === 'tr' && onTr)) return;
    const url = new URL(window.location.href);
    url.pathname = nextLang === 'en' ? '/en' : '/';
    url.searchParams.delete('lang');
    router.push(`${url.pathname}${url.search}${url.hash}`);
  };

  const chooseCookie = (choice: 'granted' | 'denied') => {
    onButtonPop();
    applyGoogleConsentChoice(choice);
    setCookieChoice(choice);
    saveUserMemory({ ...withAppearance(memory), cookieAccepted: true });
    window.dispatchEvent(new CustomEvent(COOKIE_CHOICE_EVENT, { detail: choice }));
  };

  const handleLogout = async () => {
    if (signingOut) return;
    onButtonPop();
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Clear the local session even when the network is down.
    } finally {
      try {
        window.localStorage.removeItem('scrolly_auth_user_email');
      } catch {
        // Ignore storage restrictions.
      }
      setAuthEmail(null);
      window.dispatchEvent(new CustomEvent('scrolly-auth-changed', { detail: { user: null } }));
      setSigningOut(false);
    }
  };

  const handleCelebrate = () => {
    onButtonPop();
    onCelebrateLeague();
    try {
      confetti({ particleCount: 24, spread: 65, origin: { y: 0.5 } });
    } catch {
      // Ignore confetti failures in headless runs.
    }
  };

  const triggerDiplomaDownload = (dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `scrolly-diploma-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setToast({ message: t.diplomaDownloadedToast, testId: 'diploma-status-toast' });
  };

  const handleDownloadDiploma = async () => {
    if (exportingDiploma) return;
    onButtonPop();
    setExportingDiploma(true);
    try {
      const asset = await generateDiplomaCertificateImage(memory, allFacts, uiLang);
      triggerDiplomaDownload(asset.dataUrl);
    } catch {
      setToast({ message: copy.error });
    } finally {
      setExportingDiploma(false);
    }
  };

  const handleShareDiploma = async () => {
    if (exportingDiploma) return;
    onButtonPop();
    setExportingDiploma(true);
    try {
      const asset = await generateDiplomaCertificateImage(memory, allFacts, uiLang);
      if (
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [asset.file] }) &&
        typeof navigator.share === 'function'
      ) {
        try {
          await navigator.share({
            files: [asset.file],
            title: `${t.brandName} · ${t.diplomaTitle}`,
            text: `${memory.nickname} • ${league.label} (${memory.xp} XP)`,
          });
          return;
        } catch {
          // Fall back to a PNG download when share is dismissed.
        }
      }
      triggerDiplomaDownload(asset.dataUrl);
    } catch {
      setToast({ message: copy.error });
    } finally {
      setExportingDiploma(false);
    }
  };

  if (!open) return null;

  const shell = isPage
    ? 'relative z-20 flex h-full min-h-0 w-full flex-1 flex-col bg-cik-bg text-cik-text outline-none ring-0 focus:outline-none focus:ring-0'
    : 'cik-scrim absolute inset-0 z-20 flex h-full w-full items-end justify-center p-4 outline-none ring-0 focus:outline-none focus:ring-0 sm:items-center';

  return (
    <div
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-label={t.diplomaTitle}
      data-testid="diploma-modal"
      data-presentation={presentation}
      className={shell}
    >
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? motionTiming.reducedFade : motionSpring.dockTab}
        className={
          isPage
            ? 'relative flex h-full w-full flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+64px)] outline-none ring-0 focus:outline-none focus:ring-0 lg:pb-0'
            : 'cik-sheet relative flex max-h-[calc(100dvh-64px)] w-full max-w-lg flex-col overflow-hidden bg-cik-surface text-cik-text outline-none ring-0 focus:outline-none focus:ring-0'
        }
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-3 px-4 pb-2 ${
            isPage ? 'pt-[calc(env(safe-area-inset-top)+16px)] lg:px-8 lg:pt-6' : 'pt-4'
          }`}
        >
          <h2 className="cik-title-3 min-w-0 truncate text-cik-text">{t.dockDiploma}</h2>
          <div className="flex items-center gap-2">
            <ProfileHeaderTools
              lang={uiLang}
              dark={paintedDark}
              soundOn={memory.soundEnabled}
              settingsOpen={settingsOpen}
              onOpenSettings={() => {
                onButtonPop();
                setSettingsOpen(true);
              }}
              onToggleTheme={() => chooseAppearance(document.documentElement.classList.contains('dark') ? 'light' : 'dark')}
              onToggleSound={() => {
                onButtonPop();
                window.dispatchEvent(new CustomEvent('scrolly-toggle-sound'));
              }}
            />
            {!isPage ? (
              <IconButton data-testid="diploma-close-btn" label={t.sheetClose} onClick={() => { onButtonPop(); onClose(); }}>
                <X size={20} strokeWidth={2} aria-hidden="true" />
              </IconButton>
            ) : null}
          </div>
        </div>

        <div
          ref={scrollBodyRef}
          data-testid="diploma-scroll-body"
          className={`no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-8 ${isPage ? 'lg:px-8' : ''}`}
        >
          <ProfileHeader
            lang={uiLang}
            memory={memory}
            focusNonce={nickFocus}
            onUpdateNickname={(nick) => {
              onButtonPop();
              onUpdateNickname(nick);
            }}
          />
          <div className="mt-4">
            <ProfileTabs lang={uiLang} pane={pane} onSelect={setPane} />
          </div>

          <div
            id="profile-panel-ozet"
            role="tabpanel"
            aria-labelledby="profile-tab-ozet"
            className={pane === 'ozet' ? 'mt-4 pt-3' : 'hidden'}
          >
            <StatsSummary
              lang={uiLang}
              memory={memory}
              allFacts={allFacts}
              onExploreCategory={(category) => {
                onClose();
                onSelectCategoryFromConstellation(category);
              }}
              onButtonPop={onButtonPop}
            />
          </div>

          <div
            id="profile-panel-album"
            role="tabpanel"
            aria-labelledby="profile-tab-album"
            className={pane === 'album' ? 'mt-4' : 'hidden'}
          >
            <StickerAlbum
              lang={uiLang}
              seenIds={memory.seenIds}
              allFacts={allFacts}
              onBackToFeed={() => {
                onButtonPop();
                onClose();
              }}
            />
          </div>

          <div
            id="profile-panel-saved"
            role="tabpanel"
            aria-labelledby="profile-tab-saved"
            className={pane === 'saved' ? 'mt-4' : 'hidden'}
          >
            <SavedList
              lang={uiLang}
              vocabFocus={notebookFocus}
              savedFacts={savedFacts}
              likedFacts={likedFacts}
              vocab={savedVocab}
              offline={offline}
              onButtonPop={onButtonPop}
              onToast={(message, undo) => setToast(message ? { message, undo } : null)}
              onBackToFeed={() => {
                onButtonPop();
                onClose();
              }}
              onRemoveSaved={(factId) => {
                removeSavedFact(factId);
                setSavedIds(loadSavedFactIds());
                if (memory.favoriteIds.includes(factId)) onRemoveFavorite(factId);
              }}
              onRemoveLiked={(factId) => {
                removeLikedFact(factId);
                setLikedIds(loadLikedFactIds());
              }}
              onRemoveVocab={(entry) => setSavedVocab(removeSavedVocabWord(entry.word))}
            />
          </div>

          <div
            id="profile-panel-diploma"
            role="tabpanel"
            aria-labelledby="profile-tab-diploma"
            className={pane === 'diploma' ? 'mt-4' : 'hidden'}
          >
            <DiplomaBadges
              lang={uiLang}
              memory={memory}
              allFacts={allFacts}
              exporting={exportingDiploma}
              onCelebrate={handleCelebrate}
              onDownload={() => void handleDownloadDiploma()}
              onShare={() => void handleShareDiploma()}
            />
          </div>
        </div>
      </motion.div>

      <SettingsSheet
        open={settingsOpen}
        lang={uiLang}
        memory={memory}
        appearance={appearance}
        hapticsOn={hapticsOn}
        cookieChoice={cookieChoice}
        authEmail={authEmail}
        signingOut={signingOut}
        isStandalone={isStandalone}
        showPwa={Boolean(onRequestPwaInstall)}
        justReset={justReset}
        onClose={() => setSettingsOpen(false)}
        onAppearance={chooseAppearance}
        onLanguage={chooseLanguage}
        onToggleSound={() => {
          onButtonPop();
          window.dispatchEvent(new CustomEvent('scrolly-toggle-sound'));
        }}
        onToggleHaptics={() => {
          onButtonPop();
          const next = !hapticsOn;
          setHapticsOn(next);
          writeHapticsEnabled(next);
        }}
        onToggleNotifications={() => {
          onButtonPop();
          void onToggleNotifications();
        }}
        onCookie={chooseCookie}
        onConnect={() => {
          onButtonPop();
          setSettingsOpen(false);
          window.dispatchEvent(new CustomEvent('scrolly-open-auth', { detail: { trigger: 'profile' } }));
        }}
        onLogout={() => void handleLogout()}
        onEditNickname={() => setNickFocus((value) => value + 1)}
        onReset={() => {
          onButtonPop();
          onResetMemory();
          setSavedIds([]);
          setLikedIds([]);
          setSavedVocab([]);
          setJustReset(true);
          appearanceRef.current = null;
          setAppearance('light');
          document.documentElement.classList.remove('dark');
          window.setTimeout(() => setJustReset(false), 3000);
        }}
        onPwa={() => {
          onButtonPop();
          onRequestPwaInstall?.();
        }}
        onNavigate={() => {
          onButtonPop();
          setSettingsOpen(false);
        }}
      />

      {toast ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-toast flex justify-center px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
        >
          <div
            role="status"
            aria-live="polite"
            data-testid={toast.testId}
            className="cik-toast pointer-events-auto flex max-w-full items-center gap-3 rounded-pill bg-cik-surface px-4 py-2 text-cik-text"
          >
            <p className="cik-callout">{toast.message}</p>
            {toast.undo ? (
              <button type="button" onClick={toast.undo} className="cik-headline h-11 px-3 text-cik-cta">
                {copy.undo}
              </button>
            ) : (
              <button type="button" onClick={() => setToast(null)} className="cik-headline h-11 px-3 text-cik-cta">
                {t.sheetClose}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
