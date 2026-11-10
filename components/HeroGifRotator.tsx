"use client";

import { useState, useEffect } from "react";

// Drop more files in public/hero/ and add their filename here — the
// homepage picks one at random on every visit, no code change needed
// beyond this list.
const HERO_GIFS = ["/hero/hero-1.gif", "/hero/hero-2.gif", "/hero/hero-3.gif"];

export default function HeroGifRotator() {
  // Starts null so server-rendered HTML and the first client render match
  // (avoids a hydration mismatch); picks the random one right after mount.
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(HERO_GIFS[Math.floor(Math.random() * HERO_GIFS.length)]);
  }, []);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[min(24rem,100%)] rounded-2xl border-2 border-beam bg-surface p-2 shadow-block lg:rotate-2 lg:hover:rotate-0">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-paper">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Cute anime girl GIF" className="h-full w-full object-cover" />
        )}
      </div>
    </div>
  );
}
