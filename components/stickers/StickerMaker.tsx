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

export default function StickerMaker() {
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

  useEffect(() => {
    try {
      setCanShare(!!navigator.canShare?.({ files: [new File([""], "s.png", { type: "image/png" })] }));
    } catch {
      setCanShare(false);
    }
  }, []);

  const set = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

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
      setSettings((s) => ({ ...DEFAULTS, caption: s.caption, captionPos: s.captionPos, captionColor: s.captionColor }));
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
    const mask = current().slice();
    flood(b.data.data, b.w, b.h, mask, edgeSeeds(b.w, b.h), tolerance);
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
          {!loaded && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            >
              <span className="rounded-full bg-beam px-6 py-3 font-bold text-white shadow-blockSm">Choose a photo</span>
              <span className="text-sm text-muted">Take a picture or pick one from your gallery. On a computer you can drop it here.</span>
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
            <button type="button" className={`${btn} bg-beam text-white hover:bg-beamDeep`} onClick={removeBackground}>
              Remove background
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
          <p className="mt-1 text-xs text-muted">Works best when the subject is on a plain, even background.</p>
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
            <button type="button" className={`${btn} bg-beam text-white hover:bg-beamDeep`} onClick={() => download("webp")}>
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
