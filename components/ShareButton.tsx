"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface ShareButtonProps {
  title: string;
  text?: string;
  contentType: string;
  tone?: "onDark" | "onLight";
}

/*
Opens the system share sheet where available (all phones, and the Android app
via AppBridge). On desktop browsers without the Web Share API it copies the
link instead and says so.
*/
export default function ShareButton({ title, text, contentType, tone = "onLight" }: ShareButtonProps) {
  const [label, setLabel] = useState("Share");

  function flash(message: string) {
    setLabel(message);
    window.setTimeout(() => setLabel("Share"), 2200);
  }

  async function onShare() {
    // Canonical link: no query string or hash.
    const url = `${window.location.origin}${window.location.pathname}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        trackEvent("share", { method: "native", content_type: contentType, item_id: url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        trackEvent("share", { method: "copy_link", content_type: contentType, item_id: url });
        flash("Link copied");
      } else {
        flash("Copy the address bar link");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // user closed the sheet
      flash("Could not share");
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-live="polite"
      className={`inline-flex min-h-11 items-center rounded-full border-2 px-5 py-2 text-sm font-bold transition ${
        tone === "onDark"
          ? "border-white text-white hover:bg-white hover:text-beam"
          : "border-ink bg-surface text-ink hover:bg-tape"
      }`}
    >
      {label}
    </button>
  );
}
