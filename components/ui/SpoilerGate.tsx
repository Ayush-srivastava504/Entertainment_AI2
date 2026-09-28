"use client";

import { useState } from "react";

/**
 * Blurs spoiler-heavy text until the reader chooses to reveal it. The text
 * is always in the DOM, so search engines and screen readers still get it;
 * only the visual presentation is gated.
 */
export function SpoilerGate({ children, label = "Spoilers: how it ends" }: { children: React.ReactNode; label?: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={`relative ${revealed ? "" : "min-h-[9rem]"}`}>
      <div className={revealed ? "spoiler-clear" : "spoiler-blur"} aria-hidden={false}>
        {children}
      </div>
      {!revealed && (
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            aria-expanded={false}
            className="min-h-11 max-w-full rounded-full border-2 border-ink bg-cue px-5 py-3 text-center font-display text-base font-bold text-white shadow-block transition hover:-translate-y-0.5"
          >
            {label}. Tap to reveal
          </button>
        </div>
      )}
    </div>
  );
}
