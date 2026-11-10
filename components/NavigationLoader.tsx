"use client";

/*
Loading screen for in-site navigation. Route-level loading.tsx files were
removed on purpose: they make the server send the page shell (status 200)
before a page can call notFound() or redirect, so missing pages became soft
404s and old URLs lost their real 308 redirects. This shows the same branded
screen on the client instead, only while a link navigation is in flight, so
search engines always get the true status code.

It appears after a short delay so fast (cached) pages don't flash, and hides
as soon as the URL changes, or after a safety timeout.
*/

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SHOW_AFTER_MS = 150;
const GIVE_UP_MS = 15000;

function messageFor(path: string): string {
  if (path.startsWith("/anime-characters")) return "Gathering your favourite anime characters…";
  if (path.startsWith("/ending-explained")) return "Rewinding to the final episode…";
  if (path.startsWith("/watch-order")) return "Lining up the watch order…";
  if (path.startsWith("/wallpapers")) return "Fetching fresh wallpapers…";
  if (path.startsWith("/stickers") || path.startsWith("/gif")) return "Loading the cutest reactions…";
  if (path.startsWith("/games")) return "Warming up the games…";
  return "Getting things ready…";
}

export default function NavigationLoader() {
  const pathname = usePathname();
  const [target, setTarget] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTarget(null);
    setVisible(false);
  };

  // Navigation finished (or went somewhere else): hide.
  useEffect(() => {
    reset();
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (or just a hash/query change on it): nothing to wait for.
      if (url.pathname === window.location.pathname) return;
      if (/\.(webp|png|jpe?g|gif|mp4|xml|txt)$/i.test(url.pathname)) return;

      reset();
      setTarget(url.pathname);
      timers.current.push(setTimeout(() => setVisible(true), SHOW_AFTER_MS));
      timers.current.push(setTimeout(reset, GIVE_UP_MS));
    };
    const onPop = () => reset();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  if (!target || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-paper/85 px-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="ag-progress fixed left-0 top-0 h-1 bg-tape" aria-hidden="true" />
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border-2 border-ink bg-surface px-6 py-8 text-center shadow-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          width={64}
          height={64}
          className="ag-bob h-16 w-16 rounded-full border-2 border-tape object-cover shadow-block"
        />
        <p className="mt-4 font-display text-lg font-bold text-ink">{messageFor(target)}</p>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          <span className="ag-dot h-2.5 w-2.5 rounded-full bg-tape" />
          <span className="ag-dot h-2.5 w-2.5 rounded-full bg-tape [animation-delay:150ms]" />
          <span className="ag-dot h-2.5 w-2.5 rounded-full bg-tape [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
