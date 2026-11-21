"use client";

/*
"Download PFP": turns a (usually transparent) sticker into a square profile
picture with a solid background, entirely in the browser, and saves it as a
PNG. A transparent PNG as a profile picture shows up black or white
depending on the app, so the background is what makes it usable as a PFP.
Animated GIFs come out as a still of their first frame.
*/

import { useState } from "react";

const SIZE = 1024;
const MARGIN = 72;

export default function PfpDownloadButton({ url, name, bg }: { url: string; name: string; bg: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onTap() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`image ${res.status}`);
      const bmp = await createImageBitmap(await res.blob());
      const c = document.createElement("canvas");
      c.width = SIZE;
      c.height = SIZE;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.imageSmoothingQuality = "high";
      const k = Math.min((SIZE - 2 * MARGIN) / bmp.width, (SIZE - 2 * MARGIN) / bmp.height);
      const w = bmp.width * k;
      const h = bmp.height * k;
      ctx.drawImage(bmp, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      const blob = await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/png"));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name.replace(/[^\w-]+/g, "-").toLowerCase() || "anime-girl"}-pfp.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onTap}
        disabled={busy}
        className="w-full rounded-full bg-beam px-2 py-1.5 text-xs font-bold text-white hover:bg-beamDeep disabled:opacity-50"
      >
        {busy ? "Making PFP…" : "Download PFP"}
      </button>
      {failed && (
        <a href={url} target="_blank" rel="noopener" className="mt-1 block text-center text-xs text-beam underline">
          Couldn&rsquo;t make it here; open the image
        </a>
      )}
    </>
  );
}
