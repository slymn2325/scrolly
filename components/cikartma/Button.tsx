import React from 'react';

type ButtonTone = 'primary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  children: React.ReactNode;
}

export default function Button({ tone = 'primary', className = '', children, disabled, ...rest }: ButtonProps) {
  const look =
    tone === 'primary'
      ? 'bg-cik-cta text-cik-bg shadow-sticker active:shadow-sticker-press'
      : 'bg-transparent text-cik-text shadow-none';
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-pill px-4 text-sm font-bold leading-none disabled:cursor-not-allowed disabled:opacity-45 ${look} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
