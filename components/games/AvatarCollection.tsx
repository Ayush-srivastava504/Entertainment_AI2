"use client";

import { useEffect, useState } from "react";
import { COLLECTION_CHANGED_EVENT, downloadAvatar, getOwnedAvatarIds } from "@/lib/games/collection";
import type { Avatar } from "@/lib/games/avatars";

/** Grid of every avatar: owned ones are full colour with a download button,
 * the rest are dimmed until the spinner awards them. */
export default function AvatarCollection({ avatars }: { avatars: Avatar[] }) {
  const [owned, setOwned] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => setOwned(new Set(getOwnedAvatarIds()));
    sync();
    window.addEventListener(COLLECTION_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COLLECTION_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const have = avatars.filter((a) => owned.has(a.id)).length;

  return (
    <section id="collection" className="scroll-mt-24">
      <h2 className="mt-10 font-display text-2xl font-bold">
        Your collection ({have}/{avatars.length})
      </h2>
      <p className="mt-1 text-muted">
        Original characters made for this site, not from any show. Win them on the spinner, then tap one to download it.
      </p>

      <div className="mt-5 grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {avatars.map((a) => {
          const mine = owned.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              disabled={!mine}
              onClick={() => downloadAvatar(a.image, a.title)}
              title={mine ? `Download ${a.title}` : "Locked: win it on the spinner"}
              aria-label={mine ? `Download ${a.title}` : `${a.title} (locked)`}
              className="overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-blockSm enabled:hover:-translate-y-0.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.thumb}
                alt=""
                loading="lazy"
                className={`aspect-square w-full object-cover ${mine ? "" : "opacity-30 grayscale"}`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
