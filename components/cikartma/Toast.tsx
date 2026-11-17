'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import IconButton from '@/components/cikartma/IconButton';
import { motionTiming } from '@/lib/motion';

interface ToastProps {
  message: string | null;
  dismissLabel?: string;
  onDismiss?: () => void;
}

export default function Toast({ message, dismissLabel, onDismiss }: ToastProps) {
  const reduced = useReducedMotion() === true;
  const canDismiss = Boolean(message && onDismiss && dismissLabel);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-toast flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
    >
      <AnimatePresence>
        {message ? (
          <motion.div
            key={message}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? motionTiming.reducedFade : motionTiming.cardFade}
            className="cik-toast pointer-events-auto flex max-w-full items-center gap-3 rounded-pill bg-cik-surface px-4 py-2 text-cik-text"
          >
            <p className="cik-callout">{message}</p>
            {canDismiss ? (
              <IconButton label={dismissLabel ?? ''} onClick={onDismiss}>
                <X size={20} strokeWidth={2} aria-hidden="true" />
              </IconButton>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
