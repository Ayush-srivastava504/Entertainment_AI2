"use client";

/*
Image -> sticker maker. Everything happens on a <canvas> in the browser:
the photo is never uploaded. Pipeline:

  photo -> downscaled base pixels -> background mask (flood fill from the
  edges, or from a tapped point) -> cut-out canvas -> placed with
  zoom/offset inside a shape -> white outline -> caption -> 512x512 export.

512x512 WebP under 100 KB is the common sticker spec (WhatsApp/Telegram);
browsers that can't encode WebP (older Safari) fall back to PNG.
*/

import { useCallback, useEffect, useRef, useState } from "react";
// Type-only import: the AI module itself is loaded on demand (see runAi).
import type * as AnimeCutout from "@/lib/anime-cutout";

const S = 512;
const MAX_SRC = 900;
const WEBP_LIMIT = 100 * 1024;
const HISTORY = 15;

type Shape = "square" | "rounded" | "circle";
type Mode = "move" | "erase";
type Settings = {
  zoom: number;
  offX: number;
  offY: number;
  shape: Shape;
  outline: number;
  caption: string;
  captionPos: "top" | "bottom";
  captionColor: string;
};
type Base = { data: ImageData; w: number; h: number };

const DEFAULTS: Settings = {
  zoom: 1,
  offX: 0,
  offY: 0,
  shape: "square",
  outline: 10,
  caption: "",
  captionPos: "bottom",
  captionColor: "#ffffff",
};
const CAPTION_COLORS = ["#ffffff", "#ffe066", "#ff8fab", "#7cd7ff", "#111111"];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Where the cut-out lands on the 512 canvas for the given settings. */
function placement(cw: number, ch: number, s: Settings) {
  const pad = s.outline + 8;
  const inner = S - 2 * pad;
  const fit = Math.min(inner / cw, inner / ch) * s.zoom;
  const w = cw * fit;
  const h = ch * fit;
  return { pad, inner, fit, w, h, x: S / 2 - w / 2 + s.offX, y: S / 2 - h / 2 + s.offY };
}

/** Removes every pixel connected to a seed whose colour is within `tol` of that seed. */
function flood(data: Uint8ClampedArray, w: number, h: number, mask: Uint8Array, seeds: number[], tol: number) {
  const t2 = tol * tol;
  const stack: number[] = [];
  for (const seed of seeds) {
    if (mask[seed]) continue;
    const i0 = seed * 4;
    const r0 = data[i0], g0 = data[i0 + 1], b0 = data[i0 + 2];
    stack.push(seed);
    while (stack.length) {
      const p = stack.pop()!;
      if (mask[p]) continue;
      const i = p * 4;
      if (data[i + 3] > 16) {
        const dr = data[i] - r0, dg = data[i + 1] - g0, db = data[i + 2] - b0;
        if (dr * dr + dg * dg + db * db > t2) continue;
      }
      mask[p] = 1;
      const x = p % w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (p >= w) stack.push(p - w);
      if (p < w * (h - 1)) stack.push(p + w);
    }
  }
}

/** Share of edge pixels that are already transparent (0..1). */
function transparentEdgeShare(data: ImageData, w: number, h: number) {
  const seeds = edgeSeeds(w, h);
  let t = 0;
  for (const p of seeds) if (data.data[p * 4 + 3] <= 16) t++;
  return t / seeds.length;
}

/** Average colour of the most common opaque colour along the border: the background. */
function dominantEdgeColor(d: Uint8ClampedArray, seeds: number[]) {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (const p of seeds) {
    const i = p * 4;
    if (d[i + 3] <= 200) continue;
    const k = `${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`;
    const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += d[i];
    e.g += d[i + 1];
    e.b += d[i + 2];
    buckets.set(k, e);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const e of buckets.values()) if (!best || e.n > best.n) best = e;
  return best ? [best.r / best.n, best.g / best.n, best.b / best.n] : null;
}

/** Already a cut-out when at least a quarter of the border is transparent. */
const CUTOUT_EDGE_SHARE = 0.25;

function edgeSeeds(w: number, h: number) {
  const out: number[] = [];
  for (let x = 0; x < w; x++) out.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) out.push(y * w, y * w + w - 1);
  return out;
}

/** Base pixels with the mask applied; pixels touching a removed one are softened. */
function buildCut(base: Base, mask: Uint8Array) {
  const { w, h } = base;
  const px = new Uint8ClampedArray(base.data.data);
  for (let p = 0; p < w * h; p++) {
    if (mask[p]) {
      px[p * 4 + 3] = 0;
      continue;
    }
    const x = p % w;
    const edge = (x > 0 && mask[p - 1]) || (x < w - 1 && mask[p + 1]) || (p >= w && mask[p - w]) || (p < w * (h - 1) && mask[p + w]);
    if (edge) px[p * 4 + 3] = Math.round(px[p * 4 + 3] * 0.55);
  }
  const c = makeCanvas(w, h);
  c.getContext("2d")!.putImageData(new ImageData(px, w, h), 0, 0);
  return c;
}

function drawCaption(ctx: CanvasRenderingContext2D, s: Settings, pad: number) {
  const text = s.caption.trim().slice(0, 40);
  if (!text) return;
  const font = (n: number) => `900 ${n}px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`;
  let size = 76;
  ctx.font = font(size);
  while (size > 26 && ctx.measureText(text).width > S - 48) {
    size -= 4;
    ctx.font = font(size);
  }
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  const y = s.captionPos === "top" ? pad + size * 0.9 : S - pad - size * 0.25;
  ctx.lineWidth = Math.max(6, size / 5);
  ctx.strokeStyle = s.captionColor === "#111111" ? "#ffffff" : "#111111";
  ctx.strokeText(text, S / 2, y);
  ctx.fillStyle = s.captionColor;
  ctx.fillText(text, S / 2, y);
}

function compose(out: HTMLCanvasElement, cut: HTMLCanvasElement, s: Settings) {
  const ctx = out.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  const p = placement(cut.width, cut.height, s);

  const layer = makeCanvas(S, S);
  const l = layer.getContext("2d")!;
  l.imageSmoothingQuality = "high";
  l.drawImage(cut, p.x, p.y, p.w, p.h);
  l.globalCompositeOperation = "destination-in";
  l.beginPath();
  if (s.shape === "circle") l.arc(S / 2, S / 2, p.inner / 2, 0, Math.PI * 2);
  else if (s.shape === "rounded") l.roundRect(p.pad, p.pad, p.inner, p.inner, p.inner * 0.18);
  else l.rect(p.pad, p.pad, p.inner, p.inner);
  l.fill();

  if (s.outline > 0) {
    // Classic sticker border: the silhouette in white, stamped around a circle.
    const sil = makeCanvas(S, S);
    const sc = sil.getContext("2d")!;
    sc.drawImage(layer, 0, 0);
    sc.globalCompositeOperation = "source-in";
    sc.fillStyle = "#ffffff";
    sc.fillRect(0, 0, S, S);
    for (const r of [s.outline, s.outline / 2]) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ctx.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r);
      }
    }
  }
  ctx.drawImage(layer, 0, 0);
  drawCaption(ctx, s, p.pad);
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob | null>((resolve) => c.toBlob(resolve, type, q));

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-ink px-4 py-2 text-sm font-bold transition disabled:opacity-40";
const pill = (on: boolean) => `${btn} ${on ? "bg-beam text-white" : "bg-surface hover:bg-fog"}`;

export default function StickerMaker({ initial }: { initial?: { url: string; title: string } }) {
  const preview = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const base = useRef<Base | null>(null);
  const history = useRef<Uint8Array[]>([]);
  const cut = useRef<HTMLCanvasElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: false, startDist: 0, startZoom: 1 });

  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("move");
  const [tolerance, setTolerance] = useState(40);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [readyMade, setReadyMade] = useState(false);
  // Optional anime AI cut-out (lib/anime-cutout.ts): warning panel + progress.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiStage, setAiStage] = useState<string | null>(null);
  const aiBusy = aiStage !== null;
  const ai = useRef<typeof AnimeCutout | null>(null);
  const loadAi = async () => (ai.current ??= await import("@/lib/anime-cutout"));

  useEffect(() => {
    try {
      setCanShare(!!navigator.canShare?.({ files: [new File([""], "s.png", { type: "image/png" })] }));
    } catch {
      setCanShare(false);
    }
  }, []);

  const set = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  // "Make WhatsApp sticker" on a sticker page opens the maker with it preloaded.
  useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    fetch(initial.url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => {
        if (!cancelled) openFile(new File([b], initial.title, { type: b.type || "image/png" }));
      })
      .catch(() => !cancelled && setError("Couldn't load that sticker. Download it and drop it here instead."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.url]);

  const commitMask = useCallback((mask: Uint8Array) => {
    if (!base.current) return;
    history.current = [...history.current, mask].slice(-HISTORY);
    cut.current = buildCut(base.current, mask);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (preview.current && cut.current) compose(preview.current, cut.current, settings);
  }, [settings, version]);

  async function openFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    setNote(null);
    if (!f.type.startsWith("image/")) {
      setError("That file isn't an image. Pick a JPG, PNG or WebP photo.");
      return;
    }
    const url = URL.createObjectURL(f);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const k = Math.min(1, MAX_SRC / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k));
      const h = Math.max(1, Math.round(img.naturalHeight * k));
      const c = makeCanvas(w, h);
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      base.current = { data, w, h };
      // Pixels that are already transparent (a PNG cut-out) start removed.
      const mask = new Uint8Array(w * h);
      for (let p = 0; p < w * h; p++) if (data.data[p * 4 + 3] <= 16) mask[p] = 1;
      history.current = [];
      commitMask(mask);
      // An image that is already a transparent cut-out (e.g. a sticker
      // downloaded from this site, which has its own white border) is ready
      // as-is: no extra outline by default.
      const cutOut = transparentEdgeShare(data, w, h) >= CUTOUT_EDGE_SHARE;
      setReadyMade(cutOut);
      setSettings((s) => ({
        ...DEFAULTS,
        outline: cutOut ? 0 : DEFAULTS.outline,
        caption: s.caption,
        captionPos: s.captionPos,
        captionColor: s.captionColor,
      }));
      setMode("move");
      setLoaded(true);
    } catch {
      setError("Couldn't open that image. Try a JPG, PNG or WebP.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const current = () => history.current[history.current.length - 1];

  function removeBackground() {
    const b = base.current;
    if (!b) return;
    const d = b.data.data;
    const border = edgeSeeds(b.w, b.h);
    if (transparentEdgeShare(b.data, b.w, b.h) >= CUTOUT_EDGE_SHARE) {
      setNote("This image already has a transparent background, so there's nothing to remove.");
      return;
    }
    // Seed only from border pixels that match the background colour. The
    // subject often touches the edge of the image (hair, clothes cropped by
    // the frame); seeding from every border pixel erased it.
    const bg = dominantEdgeColor(d, border);
    if (!bg) return;
    const t2 = tolerance * tolerance;
    const seeds = border.filter((p) => {
      const i = p * 4;
      if (d[i + 3] <= 200) return false;
      const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2];
      return dr * dr + dg * dg + db * db <= t2;
    });
    setNote(null);
    const mask = current().slice();
    flood(b.data.data, b.w, b.h, mask, seeds, tolerance);
    commitMask(mask);
  }

  function eraseAt(clientX: number, clientY: number) {
    const b = base.current;
    const c = preview.current;
    if (!b || !c) return;
    const r = c.getBoundingClientRect();
    const p = placement(b.w, b.h, settingsRef.current);
    const sx = Math.floor(((clientX - r.left) * (S / r.width) - p.x) / p.fit);
    const sy = Math.floor(((clientY - r.top) * (S / r.height) - p.y) / p.fit);
    if (sx < 0 || sy < 0 || sx >= b.w || sy >= b.h) return;
    const mask = current().slice();
    if (mask[sy * b.w + sx]) return;
    flood(b.data.data, b.w, b.h, mask, [sy * b.w + sx], tolerance);
    commitMask(mask);
  }

  async function openAiPanel() {
    setAiOpen(true);
    setAiSaved(await (await loadAi()).isModelSaved());
  }

  async function runAi() {
    const b = base.current;
    if (!b || aiBusy) return;
    setAiOpen(false);
    setNote(null);
    setError(null);
    setAiStage("Starting the AI…");
    try {
      const m = await loadAi();
      const alpha = await m.animeAlpha(b.data, (st) => {
        // At 100% the engine still has to load the model, which can take a
        // minute on a CPU: say so instead of a "ready" that looks stuck.
        if (st.step === "download")
          setAiStage(st.pct === 100 ? "Setting up the AI on your device… can take a minute" : `Downloading AI model… ${st.pct ?? 0}%`);
        else
          setAiStage(
            st.backend === "webgpu"
              ? "Cutting out the character (GPU)… a few seconds"
              : "Cutting out the character… this can take 1–3 minutes on this device"
          );
      });
      const mask = current().slice();
      for (let p = 0; p < alpha.length; p++) if (alpha[p] < 128) mask[p] = 1;
      commitMask(mask);
      setAiSaved(await m.isModelSaved());
      setNote("AI cut-out done. Use Tap to erase or Undo to fix any spot.");
    } catch (e) {
      setError(
        `The AI cut-out couldn't finish${e instanceof Error && e.message ? ` (${e.message})` : ""}. ` +
          "Your device may be low on memory: try a computer or a newer phone, or use Remove background."
      );
    } finally {
      setAiStage(null);
    }
  }

  async function deleteAiModel() {
    await (await loadAi()).deleteSavedModel();
    setAiSaved(false);
  }

  function undo() {
    if (history.current.length < 2 || !base.current) return;
    history.current = history.current.slice(0, -1);
    cut.current = buildCut(base.current, current());
    setVersion((v) => v + 1);
  }

  function resetMask() {
    if (!history.current.length) return;
    commitMask(history.current[0].slice());
  }

  /* ---- gestures: drag to move, pinch to zoom, tap to erase ---- */
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!loaded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      gesture.current.startZoom = settingsRef.current.zoom;
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const scale = S / e.currentTarget.getBoundingClientRect().width;
    const dx = (e.clientX - prev.x) * scale;
    const dy = (e.clientY - prev.y) * scale;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Math.abs(dx) + Math.abs(dy) > 1) gesture.current.moved = true;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      set({ zoom: clamp((gesture.current.startZoom * d) / gesture.current.startDist, 0.3, 5) });
    } else if (mode === "move") {
      setSettings((s) => ({ ...s, offX: s.offX + dx, offY: s.offY + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode === "erase" && !gesture.current.moved && pointers.current.size === 1) eraseAt(e.clientX, e.clientY);
    pointers.current.delete(e.pointerId);
  }

  /* ---- export ---- */
  async function render(format: "webp" | "png"): Promise<File | null> {
    if (!cut.current) return null;
    const out = makeCanvas(S, S);
    compose(out, cut.current, settings);
    if (format === "webp") {
      let last: Blob | null = null;
      for (const q of [0.92, 0.85, 0.75, 0.65, 0.55, 0.45]) {
        const b = await toBlob(out, "image/webp", q);
        if (!b || b.type !== "image/webp") {
          last = null;
          break;
        }
        last = b;
        if (b.size <= WEBP_LIMIT) break;
      }
      if (last) {
        setNote(
          `512 × 512 WebP, ${Math.round(last.size / 1024)} KB${last.size > WEBP_LIMIT ? " (over the 100 KB sticker limit: try a simpler image)" : ""}.`
        );
        return new File([last], "animegirl4u-sticker.webp", { type: "image/webp" });
      }
      setNote("Your browser can't save WebP, so this is a PNG instead.");
    }
    const png = await toBlob(out, "image/png");
    if (!png) return null;
    if (format === "png") setNote(`512 × 512 PNG, ${Math.round(png.size / 1024)} KB.`);
    return new File([png], "animegirl4u-sticker.png", { type: "image/png" });
  }

  /** Copies the sticker to the clipboard as a transparent PNG (the only
   * image type browsers allow there), ready to paste into WhatsApp. The
   * ClipboardItem gets a Promise so the write starts inside the tap (Safari). */
  async function copySticker() {
    if (!cut.current) return;
    const out = makeCanvas(S, S);
    compose(out, cut.current, settings);
    const png = toBlob(out, "image/png").then((b) => b ?? Promise.reject(new Error("encode")));
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("no image clipboard");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      setNote("Sticker copied! Open WhatsApp, long-press the message box and tap Paste.");
    } catch {
      setNote("This browser can't copy images. Use Share or Download instead.");
    }
  }

  async function download(format: "webp" | "png") {
    const f = await render(format);
    if (!f) return;
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function share() {
    const f = await render("webp");
    if (!f) return;
    try {
      await navigator.share({ files: [f], title: "My sticker" });
    } catch {
      /* user closed the share sheet */
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,440px)_1fr]">
      {/* On phones the preview sticks under the 70px header while the
          controls scroll beneath it, so edits stay visible. */}
      <div className={`self-start ${loaded ? "max-md:sticky max-md:top-[70px] max-md:z-10 max-md:bg-paper max-md:pb-2 max-md:pt-2" : ""}`}>
        <div
          className={`relative mx-auto w-full overflow-hidden rounded-2xl border-2 max-md:max-w-[45svh] ${dragOver ? "border-tape" : "border-ink"} shadow-block`}
          style={{
            backgroundImage: "conic-gradient(#2a3150 25%, #1b2036 0 50%, #2a3150 0 75%, #1b2036 0)",
            backgroundSize: "24px 24px",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            openFile(e.dataTransfer.files[0]);
          }}
        >
          <canvas
            ref={preview}
            width={S}
            height={S}
            aria-label={loaded ? "Sticker preview. Drag to move, pinch to zoom." : "Sticker preview"}
            className={`block aspect-square w-full ${loaded ? (mode === "erase" ? "cursor-crosshair" : "cursor-move") : ""}`}
            style={{ touchAction: loaded ? "none" : "auto" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
          />
          {aiBusy && (
            <div role="status" aria-live="polite" className="absolute inset-0 flex items-center justify-center bg-paper/75 p-6 text-center">
              <p className="font-semibold">
                <span className="mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-4 border-tape border-t-transparent" aria-hidden="true" />
                {aiStage}
                <span className="mt-2 block text-xs font-normal text-muted">Keep this page open.</span>
              </p>
            </div>
          )}
          {!loaded && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            >
              <span className="rounded-full bg-beam px-6 py-3 font-bold text-white shadow-blockSm">Choose a photo</span>
              <span className="text-sm text-muted">
                {initial ? "Loading your sticker…" : "Take a picture, pick one from your gallery, or drop in a sticker you downloaded here."}
              </span>
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choose a photo"
          onChange={(e) => {
            openFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-cue">
            {error}
          </p>
        )}
        {loaded && readyMade && (
          <p className="mt-3 rounded-xl border-2 border-tape/60 bg-tape/10 p-3 text-sm">
            This one is already cut out. Add a caption if you like, then tap <strong>Copy sticker</strong> and paste it
            into WhatsApp, or use <strong>Share</strong> or <strong>Download</strong>.
          </p>
        )}
        {loaded && (
          <p className="mt-3 text-sm text-muted">
            {mode === "move" ? "Drag to move, pinch with two fingers to zoom." : "Tap an area of the background to erase it."}
          </p>
        )}
      </div>

      <div className={`space-y-6 ${loaded ? "" : "pointer-events-none opacity-40"}`} aria-disabled={!loaded}>
        <fieldset>
          <legend className="font-display text-lg font-extrabold">1. Background</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={`${btn} bg-beam text-white hover:bg-beamDeep`} onClick={removeBackground} disabled={aiBusy}>
              Remove background
            </button>
            <button type="button" className={pill(aiOpen)} aria-expanded={aiOpen} onClick={() => (aiOpen ? setAiOpen(false) : openAiPanel())} disabled={aiBusy}>
              Anime AI cut-out
            </button>
            <button type="button" className={pill(mode === "erase")} aria-pressed={mode === "erase"} onClick={() => setMode(mode === "erase" ? "move" : "erase")}>
              Tap to erase
            </button>
            <button type="button" className={pill(false)} onClick={undo}>
              Undo
            </button>
            <button type="button" className={pill(false)} onClick={resetMask}>
              Restore
            </button>
          </div>
          <label className="mt-3 block text-sm">
            <span className="font-semibold">Strength: {tolerance}</span>
            <span className="ml-2 text-muted">higher removes more similar colours</span>
            <input type="range" min={5} max={120} value={tolerance} onChange={(e) => setTolerance(+e.target.value)} className="mt-1 block w-full" />
          </label>
          <p className="mt-1 text-xs text-muted">
            Remove background works best on a plain, even background. For an anime character on a busy background, try
            Anime AI cut-out.
          </p>

          {aiOpen && (
            <div role="dialog" aria-labelledby="ai-title" className="mt-4 rounded-2xl border-2 border-tape/70 bg-tape/10 p-4 text-sm leading-relaxed">
              <p id="ai-title" className="font-display text-base font-extrabold">Anime AI cut-out: optional, large download</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>What it does:</strong> an AI model trained on anime art finds the character and removes everything
                  else, keeping hair, ribbons and props.
                </li>
                <li>
                  <strong>Use it for:</strong> an anime character on a busy or coloured background (screenshots, fan art,
                  stickers on a backdrop).
                </li>
                <li>
                  <strong>Don&rsquo;t use it for:</strong> full scenery with no clear character, photos of real people
                  (it is trained on anime), or plain backgrounds, where Remove background is instant.
                </li>
                <li>
                  <strong>Download:</strong> about {ai.current?.MODEL_MB ?? 168} MB for the model plus 11 to 22 MB for the AI
                  engine, once. Use Wi-Fi. It is then saved in this browser, so next time it starts straight away.
                </li>
                <li>
                  <strong>Speed:</strong> a few seconds on newer phones and computers with WebGPU; otherwise 1 to 3 minutes.
                  Older phones may run out of memory and reload the page.
                </li>
                <li>
                  <strong>Privacy:</strong> it runs entirely on your device. Your image is never uploaded.
                </li>
              </ul>
              <p className="mt-2 text-xs text-muted">
                {aiSaved ? "The model is already saved on this device. " : ""}Model: anime-seg by SkyTNT (Apache-2.0), run with
                ONNX Runtime Web.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={`${btn} bg-beam text-white hover:bg-beamDeep`} onClick={runAi}>
                  {aiSaved ? "Cut out with AI" : `Download ${ai.current?.MODEL_MB ?? 168} MB & cut out`}
                </button>
                <button type="button" className={pill(false)} onClick={() => setAiOpen(false)}>
                  Cancel
                </button>
                {aiSaved && (
                  <button type="button" className={pill(false)} onClick={deleteAiModel}>
                    Delete saved model
                  </button>
                )}
              </div>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="font-display text-lg font-extrabold">2. Shape &amp; outline</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["square", "rounded", "circle"] as Shape[]).map((sh) => (
              <button key={sh} type="button" className={pill(settings.shape === sh)} aria-pressed={settings.shape === sh} onClick={() => set({ shape: sh })}>
                {sh[0].toUpperCase() + sh.slice(1)}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm">
            <span className="font-semibold">Zoom</span>
            <input
              type="range"
              min={0.3}
              max={5}
              step={0.05}
              value={settings.zoom}
              onChange={(e) => set({ zoom: +e.target.value })}
              className="mt-1 block w-full"
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="font-semibold">White outline: {settings.outline ? `${settings.outline}px` : "off"}</span>
            <input type="range" min={0} max={20} value={settings.outline} onChange={(e) => set({ outline: +e.target.value })} className="mt-1 block w-full" />
          </label>
          <button type="button" className={`${pill(false)} mt-3`} onClick={() => set({ zoom: 1, offX: 0, offY: 0 })}>
            Re-centre
          </button>
        </fieldset>

        <fieldset>
          <legend className="font-display text-lg font-extrabold">3. Caption</legend>
          <input
            type="text"
            value={settings.caption}
            maxLength={40}
            onChange={(e) => set({ caption: e.target.value })}
            placeholder="Optional text, e.g. LOL or good night"
            aria-label="Caption text"
            className="mt-2 min-h-11 w-full rounded-full border-2 border-ink bg-surface px-4 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(["top", "bottom"] as const).map((pos) => (
              <button key={pos} type="button" className={pill(settings.captionPos === pos)} aria-pressed={settings.captionPos === pos} onClick={() => set({ captionPos: pos })}>
                {pos === "top" ? "Top" : "Bottom"}
              </button>
            ))}
            {CAPTION_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Caption colour ${c}`}
                aria-pressed={settings.captionColor === c}
                onClick={() => set({ captionColor: c })}
                className={`h-11 w-11 rounded-full border-2 ${settings.captionColor === c ? "border-tape ring-2 ring-tape" : "border-ink"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display text-lg font-extrabold">4. Save your sticker</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={`${btn} bg-beam text-white hover:bg-beamDeep`} onClick={copySticker}>
              Copy sticker
            </button>
            <button type="button" className={pill(false)} onClick={() => download("webp")}>
              Download sticker (WebP)
            </button>
            {canShare && (
              <button type="button" className={pill(false)} onClick={share}>
                Share
              </button>
            )}
            <button type="button" className={pill(false)} onClick={() => download("png")}>
              PNG
            </button>
          </div>
          {note && <p className="mt-2 text-sm text-muted">{note}</p>}
          <button type="button" className="mt-4 text-sm font-semibold text-beam underline underline-offset-4" onClick={() => fileInput.current?.click()}>
            Use a different photo
          </button>
        </fieldset>
      </div>
    </div>
  );
}
