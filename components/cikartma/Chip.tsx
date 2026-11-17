import React from 'react';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export default function Chip({ label, selected = false, onClick, icon }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-pill px-4 text-[13px] font-bold leading-[18px] ${
        selected ? 'bg-cik-berry text-cik-text shadow-sticker' : 'bg-cik-surface text-cik-muted shadow-sticker'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
