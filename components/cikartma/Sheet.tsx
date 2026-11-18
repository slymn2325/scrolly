'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import IconButton from '@/components/cikartma/IconButton';
import { translations, type Language } from '@/i18n/translations';
import { sheetDismiss, sheetTransition } from '@/lib/motion';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  closeLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Sheet({ open, title, onClose, children, closeLabel }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const startedOnHandleRef = useRef(false);
  const dragControls = useDragControls();
  const reduced = useReducedMotion() === true;
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('tr');
  const [dragY, setDragY] = useState(0);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsTouchDragging(false);
      touchStartYRef.current = null;
      startedOnHandleRef.current = false;
      return;
    }
    setLang(document.documentElement.lang === 'en' ? 'en' : 'tr');
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.target instanceof Node && panel.contains(event.target)) return;
      panel.focus();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
      previouslyFocused?.focus();
    };
  }, [open, onClose, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const layer = layerRef.current;
    const changed: HTMLElement[] = [];
    Array.from(document.body.children).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (layer && node === layer) return;
      if (node.hasAttribute('inert')) return;
      node.setAttribute('inert', '');
      changed.push(node);
    });
    return () => {
      changed.forEach((node) => node.removeAttribute('inert'));
    };
  }, [open, mounted]);

  if (!mounted) return null;

  const resolvedClose = closeLabel ?? translations[lang].sheetClose;

  const beginSwipe = (clientY: number, fromHandle: boolean) => {
    const scrollTop = scrollBodyRef.current?.scrollTop ?? 0;
    if (!fromHandle && scrollTop > 0) return;
    touchStartYRef.current = clientY;
    startedOnHandleRef.current = fromHandle;
    setIsTouchDragging(true);
  };

  const moveSwipe = (clientY: number) => {
    if (touchStartYRef.current === null) return;
    const deltaY = clientY - touchStartYRef.current;
    const scrollTop = scrollBodyRef.current?.scrollTop ?? 0;
    if (deltaY <= 0) {
      setDragY(0);
      if (!startedOnHandleRef.current && deltaY < -8) {
        touchStartYRef.current = null;
        setIsTouchDragging(false);
      }
      return;
    }
    if (!startedOnHandleRef.current && scrollTop > 0) {
      touchStartYRef.current = null;
      setDragY(0);
      setIsTouchDragging(false);
      return;
    }
    setDragY(Math.min(deltaY, 280));
  };

  const endSwipe = () => {
    if (touchStartYRef.current === null) return;
    const shouldClose = dragY > 70;
    touchStartYRef.current = null;
    startedOnHandleRef.current = false;
    setIsTouchDragging(false);
    setDragY(0);
    if (shouldClose) {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          ref={layerRef}
          data-cik-layer="sheet"
          className="fixed inset-0 z-sheet flex items-end justify-center lg:items-center lg:p-6"
          role="presentation"
        >
          <motion.div
            className="cik-scrim absolute inset-0"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: sheetTransition(reduced, 'close') }}
            transition={sheetTransition(reduced, 'open')}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            drag={reduced ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              const height = panelRef.current?.getBoundingClientRect().height ?? 1;
              const pulled = info.offset.y > Math.max(70, height * sheetDismiss.distanceRatio);
              const flung = info.velocity.y > sheetDismiss.velocityPxPerSec;
              if (pulled || flung) onClose();
            }}
            onTouchStart={(event) => {
              if (event.touches.length !== 1) return;
              const target = event.target as HTMLElement | null;
              const fromHandle = Boolean(target?.closest('[data-sheet-drag-handle="true"]'));
              beginSwipe(event.touches[0].clientY, fromHandle);
            }}
            onTouchMove={(event) => {
              if (event.touches.length !== 1) return;
              moveSwipe(event.touches[0].clientY);
            }}
            onTouchEnd={endSwipe}
            onTouchCancel={endSwipe}
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: dragY }}
            exit={
              reduced
                ? { opacity: 0, transition: sheetTransition(true, 'close') }
                : { y: '100%', transition: sheetTransition(false, 'close') }
            }
            transition={isTouchDragging ? { duration: 0 } : sheetTransition(reduced, 'open')}
            className="cik-sheet relative flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden bg-cik-surface text-cik-text outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[85vh] lg:max-w-md lg:rounded-3xl"
          >
            <div
              data-sheet-drag-handle="true"
              className="flex h-11 w-full shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
              style={{ touchAction: 'none' }}
              onPointerDown={(event) => {
                if (reduced) return;
                dragControls.start(event);
              }}
            >
              <span aria-hidden="true" className="h-1 w-9 rounded-pill bg-cik-line" />
            </div>
            <div
              data-sheet-drag-handle="true"
              className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2"
            >
              <h2 id={titleId} className="cik-title-3 text-cik-text">
                {title}
              </h2>
              <IconButton label={resolvedClose} onClick={onClose}>
                <X size={20} strokeWidth={2} aria-hidden="true" />
              </IconButton>
            </div>
            <div
              ref={scrollBodyRef}
              className="min-h-0 flex-1 overflow-y-auto px-5 pb-5"
            >
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
