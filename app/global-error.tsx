'use client';

import React from 'react';
import './globals.css';

interface GlobalErrorProps {
  error: (Error & { digest?: string }) | unknown;
  reset?: () => void;
  retry?: () => void;
}

export default function GlobalError({ error, reset, retry }: GlobalErrorProps) {
  const handleRecover = () => {
    if (typeof retry === 'function') {
      retry();
      return;
    }
    if (typeof reset === 'function') {
      reset();
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const hasMessage = error instanceof Error ? Boolean(error.message) : Boolean(error);

  return (
    <html lang="tr">
      <head>
        <title>Scrolly — Bağlantı Aksaklığı</title>
      </head>
      <body
        style={{ backgroundColor: '#09090B', color: '#FFFFFF' }}
        className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-6 font-sans"
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            borderRadius: '1.5rem',
            border: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.06)',
            padding: '1.5rem',
            textAlign: 'center',
          }}
          className="w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-6 text-center shadow-2xl backdrop-blur-xl"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-2xl">
            ⚡
          </div>
          <h1 className="text-xl font-black tracking-tight">
            Bir Bağlantı Aksaklığı Yaşandı
          </h1>
          <p className="mt-2 text-sm text-white/75 leading-relaxed">
            {hasMessage
              ? 'Veri akışında geçici bir kesinti oluştu. Keşif moduna güvenle dönebilirsin.'
              : 'Geçici bir sistem hatası oluştu. Sayfayı yenileyerek kaldığın yerden devam edebilirsin.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRecover}
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg hover:bg-violet-500"
            >
              Tekrar Dene
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/15"
            >
              Ana Sayfa
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
