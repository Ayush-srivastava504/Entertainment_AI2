/*
Optional on-device "anime AI cut-out" for the sticker maker (browser only).

Model:   anime-seg "isnetis" by SkyTNT (Apache-2.0), ~168 MB ONNX, served by
         Hugging Face (CORS-enabled). Trained on anime art, so it separates a
         character (hair, ribbons, props) from any background far better than
         the colour flood fill. Not for full scenery or photos of real people.
Engine:  onnxruntime-web from jsDelivr. WebGPU when the browser has it
         (seconds), otherwise WebAssembly on one CPU thread (1-3 minutes).
Privacy: everything runs in the visitor's browser. The image is never sent
         anywhere; only the model and engine files are downloaded.
Cache:   the model is stored with the Cache Storage API after the first
         download, so later uses start immediately. deleteSavedModel() frees it.

Nothing here is imported until the visitor opts in, so the 168 MB model and
the ~11-22 MB engine never load for anyone who doesn't ask for them.
See docs/STICKER_MAKER.md for the full write-up.
*/

export const MODEL_URL = "https://huggingface.co/skytnt/anime-seg/resolve/main/isnetis.onnx";
export const MODEL_MB = 168;
const ORT_VERSION = "1.20.1";
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const CACHE_NAME = "ag4u-ai-models-v1";
/** The model only accepts a fixed 1024 x 1024 input. */
const N = 1024;

export type Backend = "webgpu" | "wasm";
type Ort = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export const hasWebGPU = () => typeof navigator !== "undefined" && "gpu" in navigator;

// Imported through Function so neither webpack nor Turbopack tries to bundle
// a remote URL; it is a plain browser-native dynamic import.
const importUrl = new Function("u", "return import(u)") as (u: string) => Promise<Ort>;

export async function isModelSaved(): Promise<boolean> {
  try {
    const c = await caches.open(CACHE_NAME);
    return !!(await c.match(MODEL_URL));
  } catch {
    return false;
  }
}

export async function deleteSavedModel(): Promise<void> {
  session = null;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    /* storage unavailable: nothing to delete */
  }
}

async function loadModelBytes(onProgress: (pct: number) => void): Promise<Uint8Array> {
  try {
    const hit = await (await caches.open(CACHE_NAME)).match(MODEL_URL);
    if (hit) {
      onProgress(100);
      return new Uint8Array(await hit.arrayBuffer());
    }
  } catch {
    /* Cache Storage unavailable (private mode): just download */
  }

  const res = await fetch(MODEL_URL);
  if (!res.ok || !res.body) throw new Error(`Model download failed (${res.status}).`);
  const total = Number(res.headers.get("content-length")) || MODEL_MB * 1024 * 1024;
  let out = new Uint8Array(total);
  const reader = res.body.getReader();
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (got + value.length > out.length) {
      // content-length was missing or compressed: grow instead of failing.
      const bigger = new Uint8Array(Math.max(out.length * 1.25, got + value.length));
      bigger.set(out.subarray(0, got));
      out = bigger;
    }
    out.set(value, got);
    got += value.length;
    onProgress(Math.min(99, Math.round((got / total) * 100)));
  }
  const bytes = got === out.length ? out : out.slice(0, got);
  try {
    await (await caches.open(CACHE_NAME)).put(
      MODEL_URL,
      new Response(bytes, { headers: { "content-type": "application/octet-stream" } })
    );
  } catch {
    /* not enough storage to keep it: works now, downloads again next time */
  }
  onProgress(100);
  return bytes;
}

let session: Promise<{ ort: Ort; s: Ort; backend: Backend }> | null = null;

function getSession(onProgress: (pct: number) => void) {
  if (!session) {
    session = (async () => {
      const gpu = hasWebGPU();
      const ort: Ort = await importUrl(`${ORT_BASE}${gpu ? "ort.webgpu.min.mjs" : "ort.min.mjs"}`);
      ort.env.wasm.wasmPaths = ORT_BASE;
      const bytes = await loadModelBytes(onProgress);
      if (gpu) {
        try {
          return { ort, s: await ort.InferenceSession.create(bytes, { executionProviders: ["webgpu"] }), backend: "webgpu" as Backend };
        } catch {
          /* WebGPU present but unusable (e.g. blocked adapter): fall back */
        }
      }
      return { ort, s: await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] }), backend: "wasm" as Backend };
    })();
    // A failed load must not stick: let the next attempt start fresh.
    session.catch(() => {
      session = null;
    });
  }
  return session;
}

/**
 * Runs the anime segmentation model on `img` and returns one alpha value
 * (0-255) per pixel of `img`, where 255 = keep (character), 0 = background.
 */
export async function animeAlpha(
  img: ImageData,
  onStage: (stage: { step: "download" | "run"; pct?: number; backend?: Backend }) => void
): Promise<Uint8ClampedArray> {
  const { ort, s, backend } = await getSession((pct) => onStage({ step: "download", pct }));
  onStage({ step: "run", backend });

  // Letterbox into a black 1024 square, scale to 0..1, NCHW (anime-seg's own preprocessing).
  const { width: W, height: H } = img;
  const k = N / Math.max(W, H);
  const w = Math.round(W * k);
  const h = Math.round(H * k);
  const ox = (N - w) >> 1;
  const oy = (N - h) >> 1;
  const src = document.createElement("canvas");
  src.width = W;
  src.height = H;
  src.getContext("2d")!.putImageData(img, 0, 0);
  const sq = document.createElement("canvas");
  sq.width = N;
  sq.height = N;
  const sx = sq.getContext("2d", { willReadFrequently: true })!;
  sx.fillStyle = "#000";
  sx.fillRect(0, 0, N, N);
  sx.drawImage(src, ox, oy, w, h);
  const d = sx.getImageData(0, 0, N, N).data;
  const input = new Float32Array(3 * N * N);
  for (let p = 0; p < N * N; p++) {
    input[p] = d[p * 4] / 255;
    input[N * N + p] = d[p * 4 + 1] / 255;
    input[2 * N * N + p] = d[p * 4 + 2] / 255;
  }

  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, N, N]) });
  const m: Float32Array = out[s.outputNames[0]].data;

  // Mask (1024 square) -> crop the letterbox -> scale back to the image size.
  const mc = document.createElement("canvas");
  mc.width = N;
  mc.height = N;
  const mctx = mc.getContext("2d")!;
  const md = mctx.createImageData(N, N);
  for (let p = 0; p < N * N; p++) md.data[p * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, m[p])));
  mctx.putImageData(md, 0, 0);
  const back = document.createElement("canvas");
  back.width = W;
  back.height = H;
  const bctx = back.getContext("2d", { willReadFrequently: true })!;
  bctx.drawImage(mc, ox, oy, w, h, 0, 0, W, H);
  const a = bctx.getImageData(0, 0, W, H).data;
  const alpha = new Uint8ClampedArray(W * H);
  for (let p = 0; p < W * H; p++) alpha[p] = a[p * 4 + 3];
  return alpha;
}
