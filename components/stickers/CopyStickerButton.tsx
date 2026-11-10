"use client";

/*
"Make WhatsApp sticker" on /gif/[id]: one tap turns the sticker into a
512 x 512 transparent sticker and puts it on the phone's clipboard, ready to
paste into WhatsApp or any chat. Browsers only allow PNG images on the
clipboard, so that is the format.

The ClipboardItem is created synchronously with a Promise for the image
(required by Safari: the write must start inside the tap). If the browser
can't copy images, it falls back to the share sheet, then to the full
sticker maker.
*/

import Link from "next/link";
import { useState } from "react";

const S = 512;
const MARGIN = 16; // WhatsApp's recommended margin around a sticker

async function stickerPng(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const bmp = await createImageBitmap(await res.blob());
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const k = Math.min((S - 2 * MARGIN) / bmp.width, (S - 2 * MARGIN) / bmp.height);
  const w = bmp.width * k;
  const h = bmp.height * k;
  ctx.drawImage(bmp, (S - w) / 2, (S - h) / 2, w, h);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/png"));
}

export default function CopyStickerButton({ id, url, title }: { id: string; url: string; title: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const makerHref = `/stickers/maker?src=${encodeURIComponent(id)}`;

  async function onTap() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const png = stickerPng(url);
    png.catch(() => {}); // handled below; avoid an unhandled-rejection warning
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("no image clipboard");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      setMsg("Sticker copied! Open WhatsApp, long-press the message box and tap Paste.");
    } catch {
      // No image clipboard here: offer the share sheet instead.
      try {
        const file = new File([await png], `${title.replace(/[^\w-]+/g, "-").toLowerCase() || "sticker"}.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title });
          setMsg(null);
          return;
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return; // closed the share sheet
      }
      window.location.href = makerHref;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onTap}
          disabled={busy}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-ink px-5 text-sm font-bold hover:bg-fog disabled:opacity-50"
        >
          {busy ? "Making sticker…" : "Make WhatsApp sticker"}
        </button>
        <Link href={makerHref} className="text-sm font-semibold text-beam underline underline-offset-4">
          Edit in sticker maker
        </Link>
      </div>
      {msg && (
        <p role="status" className="mt-2 rounded-xl border-2 border-tape/60 bg-tape/10 px-3 py-2 text-sm">
          {msg}
        </p>
      )}
    </div>
  );
}
