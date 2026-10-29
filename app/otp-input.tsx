"use client";

import { useState } from "react";

// Must match CODE_ALPHABET in lib/store.ts.
const INVALID_CHARS = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

type Props = {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
};

// One real <input> stretched invisibly over the visual slots, so paste,
// autofill, backspace and mobile keyboards behave natively.
export default function OtpInput({ length, value, onChange, onComplete }: Props) {
  const [focused, setFocused] = useState(false);

  function handleChange(raw: string) {
    const next = raw.toUpperCase().replace(INVALID_CHARS, "").slice(0, length);
    onChange(next);
    if (next.length === length && next !== value) onComplete?.(next);
  }

  // The caret sits on the next empty slot, or the last slot when full.
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="relative">
      <div className="flex justify-between gap-2" aria-hidden>
        {Array.from({ length }, (_, i) => {
          const char = value[i];
          const isActive = focused && i === activeIndex;
          return (
            <div
              key={i}
              className={`flex aspect-square flex-1 items-center justify-center rounded-lg border font-mono text-2xl font-semibold transition-colors ${
                isActive
                  ? "border-foreground ring-2 ring-foreground/20"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {char ?? (isActive && <span className="h-7 w-px animate-pulse bg-foreground" />)}
            </div>
          );
        })}
      </div>
      <input
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          // Keep typing appended at the end even if the user clicked a middle slot.
          const end = e.target.value.length;
          e.target.setSelectionRange(end, end);
        }}
        onBlur={() => setFocused(false)}
        maxLength={length}
        autoFocus
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        aria-label={`Vote code, ${length} characters`}
      />
    </div>
  );
}
