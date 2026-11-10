# Sticker maker (`/stickers/maker`)

Turns any photo, drawing or a sticker from this site into a messaging-app
sticker: 512 x 512, transparent background, white border, optional caption,
saved as WebP (or PNG). Built for phones first.

**Everything runs in the visitor's browser.** The image is never uploaded to
this site or anyone else. There is no server code, no database table and no
paid or hosted AI. The only downloads are static files: the page itself and,
only if the visitor opts into the Anime AI cut-out, an open-source model and
its engine.

---

## 1. What a visitor can do

| Step | Control | Notes |
|---|---|---|
| One-tap copy | **"Make WhatsApp sticker"** on any `/gif/[id]` page (`components/stickers/CopyStickerButton.tsx`) | Builds a 512 x 512 transparent sticker (16 px margin) and copies it to the clipboard as PNG, ready to paste into WhatsApp. If the browser can't copy images it opens the share sheet, then the maker. "Edit in sticker maker" next to it opens `/stickers/maker?src=<sticker id>`. |
| Add an image | "Choose a photo" (camera or gallery on phones), drag and drop on desktop, or "Edit in sticker maker" on a `/gif/[id]` page | |
| Remove the background | **Remove background** (instant, colour based) with a Strength slider | Best on plain, even backgrounds. |
| | **Anime AI cut-out** (optional, large download) | Best for an anime character on a busy background. See section 4. |
| | **Tap to erase**, **Undo**, **Restore** | Tap any leftover patch; Undo keeps the last 15 steps. |
| Frame it | Drag to move, pinch or slider to zoom, **Re-centre** | Square, Rounded or Circle shape. |
| Border | White outline slider (0 to 20 px) | Images that are already transparent default to 0, because site stickers already have a border. |
| Caption | Text (max 40 characters), Top or Bottom, 5 colours | Auto-shrinks to fit; dark outline (light outline on black text). |
| Save | **Copy sticker**, **Download sticker (WebP)**, **PNG**, **Share** (phones) | Copy puts a transparent PNG on the clipboard (browsers only allow PNG there). WebP quality steps down until the file is at or under 100 KB. Safari on iPhone cannot encode WebP, so downloads there are PNG, and the visitor is told so. |

On phones the preview sticks under the header while the controls scroll
beneath it, so every change stays visible.

---

## 2. Files

| File | Role |
|---|---|
| `app/stickers/maker/page.tsx` | Server page: metadata, canonical, `WebApplication` + `BreadcrumbList` JSON-LD, how-to steps, FAQ. Reads `?src=`, looks the id up with `getGifById` (so only this site's stickers can be preloaded, never an arbitrary URL) and passes `{ url, title }` to the editor. `?src=` variants are `noindex, follow` with the canonical on `/stickers/maker`. |
| `components/stickers/StickerMaker.tsx` | The editor (client component). Canvas pipeline, gestures, background removal, AI panel, export. |
| `lib/anime-cutout.ts` | Optional on-device AI (browser only, loaded on demand): model download and caching, engine selection, inference, mapping the mask back to the image. |
| `app/gif/[id]/page.tsx` | "Make WhatsApp sticker" button on every sticker page. |
| `app/stickers/page.tsx`, `app/stickers/[collection]/page.tsx`, `components/Footer.tsx` | Links to the maker. |
| `lib/sitemap.ts` | Lists `/stickers/maker` in `pages.xml`. |

---

## 3. How the editor works

```
image file / site sticker
   -> decode, downscale to max 900 px  (base pixels, kept for the session)
   -> mask: 1 byte per pixel, 1 = removed  (history of up to 15 masks = Undo)
        - pixels already transparent start removed
        - Remove background / Tap to erase / AI cut-out only ADD removed pixels
   -> cut-out canvas: base pixels with the mask applied, edge pixels softened
   -> placed on a 512 x 512 canvas with zoom + offset, clipped to the shape
   -> white border: the silhouette stamped around two circles of offsets
   -> caption
   -> export: WebP at 0.92 ... 0.45 quality until <= 100 KB, or PNG
```

Key functions in `StickerMaker.tsx`:

| Function | What it does |
|---|---|
| `openFile` | Reads the image, downscales it, builds the starting mask from existing transparency, detects "already a cut-out" (25% or more of the border transparent) and sets the defaults. |
| `flood` | Removes every pixel connected to a seed whose colour is within the strength of that seed's colour (4-connected, iterative stack). |
| `removeBackground` | Does nothing (with a note) for images that are already cut out. Otherwise seeds **only** from border pixels matching the dominant border colour (`dominantEdgeColor`). The subject often touches the image edge, and seeding from every border pixel used to erase hair and clothes. |
| `eraseAt` | Maps a tap on the preview back to image pixels (inverse of `placement`) and floods from there. |
| `buildCut` | Applies the mask and halves the alpha of pixels next to removed ones for a soft edge. |
| `placement` | Where the cut-out sits on the 512 canvas for the current zoom and offset; shared by drawing and tap-to-erase. |
| `compose` | Draws image, shape clip, white border and caption onto a 512 canvas. Used for the preview and the export. |
| `render`, `download`, `share` | Export to WebP or PNG, trigger the download, or open the phone's share sheet (Web Share API with files). |
| `runAi` | Runs the optional AI cut-out and merges its result into the mask (pixels with alpha below 128 are removed), so Undo and Tap to erase still work afterwards. |

Gestures use Pointer Events: one pointer drags (or taps in erase mode), two
pointers pinch-zoom. `touch-action: none` is set on the canvas only after an
image is loaded, so the empty page still scrolls normally.

---

## 4. Anime AI cut-out (optional, on-device)

### What it is

| | |
|---|---|
| Model | **anime-seg "isnetis"** by SkyTNT, Apache-2.0. An IS-Net segmentation model trained on anime art. |
| File | `https://huggingface.co/skytnt/anime-seg/resolve/main/isnetis.onnx`: 176,069,933 bytes (168 MB). Hugging Face serves it with CORS, so the browser downloads it directly. It is not stored in this repository (GitHub rejects files over 100 MB, and nobody should download it unless they ask). |
| Engine | **onnxruntime-web 1.20.1** from jsDelivr. `ort.webgpu.min.mjs` (plus a ~22 MB WebAssembly file) when the browser exposes WebGPU, otherwise `ort.min.mjs` (plus ~11 MB). Imported with a native dynamic `import()` built through `new Function`, so the bundler never tries to bundle a remote URL. |
| Input | Fixed 1 x 3 x 1024 x 1024 (`img`). The image is letterboxed onto a black square and scaled to 0..1 (anime-seg's own preprocessing). |
| Output | 1 x 1 x 1024 x 1024 (`mask`), 0..1 per pixel. Cropped back out of the letterbox and scaled to the image size. |
| Storage | After the first download the model is saved with the Cache Storage API (`ag4u-ai-models-v1`), so later uses start without downloading. **Delete saved model** in the panel removes it. If the browser refuses to store it (private mode, full disk), it still works and downloads again next time. |

### When to use it (shown to visitors before anything downloads)

The button opens a warning panel first. Nothing is downloaded until the
visitor presses **Download 168 MB & cut out** (or **Cut out with AI** if the
model is already saved). The panel says:

- **What it does:** finds the character and removes everything else, keeping hair, ribbons and props.
- **Use it for:** an anime character on a busy or coloured background (screenshots, fan art, stickers on a backdrop).
- **Don't use it for:** full scenery with no clear character, photos of real people (it is trained on anime), or plain backgrounds, where Remove background is instant.
- **Download:** about 168 MB for the model plus 11 to 22 MB for the engine, once. Use Wi-Fi. It is then saved in the browser.
- **Speed:** a few seconds on newer phones and computers with WebGPU; otherwise 1 to 3 minutes. Older phones may run out of memory and reload the page.
- **Privacy:** it runs entirely on the device. The image is never uploaded.

While it runs, an overlay on the preview shows the stage: download percentage,
"Setting up the AI on your device", then "Cutting out the character", with
"Keep this page open". If it fails (usually memory on older phones), the
visitor gets a plain message suggesting a computer, a newer phone or Remove
background.

### Measured results

Tested in Chromium against the live site and on local copies of site images:

| Image | Colour-based Remove background | Anime AI cut-out |
|---|---|---|
| Boba tea sticker (character on a grey gradient) | Removes only the outer grey; keeps the die-cut card | Clean cut-out of the girl, hair and cup |
| Noelle sticker (already transparent) | Correctly does nothing | Clean, keeps ponytails and ribbons |
| Pencil sketch on white | Clean | Clean |
| Fox wallpaper (full scene) | Not suitable | Not suitable: makes the whole picture faint. This is why the warning says not to use it on scenery. |

| Timing (desktop, CPU only, one thread) | |
|---|---|
| Model download | about 65 s on the test connection |
| Engine setup | about 30 to 90 s |
| Cut-out | about 70 to 130 s per image |

With WebGPU, setup and cut-out drop to seconds. Multi-threaded WebAssembly
would need cross-origin isolation headers (COOP/COEP) on the page; they are
deliberately not set because they can break third-party scripts.

### Alternatives that were tried and rejected

- **U2-Net-p** (4.6 MB, general purpose): fast to download, but on anime it
  removed most of the boba girl and cut off Noelle's ponytails.
- **Hosted or paid AI APIs:** ruled out. The tool must stay free and private.

---

## 5. Testing

What was checked, on the live site, at phone sizes (375 x 667 and 390 x 844,
touch input):

- No horizontal scroll on `/stickers/maker` or `/gif/[id]` with the new button.
- Load, Remove background, Undo, Restore, Tap to erase (real touch tap), drag, shape, caption.
- Download is a valid `RIFF....WEBP` file, 512 x 512, 48 to 78 KB.
- "Make WhatsApp sticker" opens the maker with the sticker preloaded; the page is `noindex, follow` with the canonical on `/stickers/maker`.
- A downloaded site sticker picked from a file shows the "already cut out" hint, and Remove background explains there is nothing to remove.
- Anime AI cut-out: warning shown first, real 168 MB download with progress, WebGPU-to-WebAssembly fallback, result applied, "already saved" on reopening, Delete saved model empties Cache Storage.
- No console errors.

There are no automated tests for the editor; the checks above were run with
Playwright scripts against production.

---

## 6. Limits and known issues

- **Animated GIFs** become a still sticker from the first frame.
- Colour-based removal can eat into a subject that is the same colour as the
  background. Strength, Undo and Tap to erase fix it; the AI handles it better.
- The AI is heavy for older phones (memory). The warning says so.
- WhatsApp only imports sticker packs through an app on Android; from the web
  the visitor saves or shares the image and adds it with WhatsApp's own
  "create sticker" option where available. Telegram's @Stickers bot accepts
  the 512 x 512 file directly.
- The Noelle "angry" source file includes a sliver of a neighbouring sticker
  on its left edge. That is in the source image; crop it with zoom or drag.

---

## 7. Maintenance

- **Model URL or version:** `MODEL_URL` and `MODEL_MB` in `lib/anime-cutout.ts`.
  If you change the model, bump `CACHE_NAME` so old copies are not reused,
  and check its input size and preprocessing.
- **Engine version:** `ORT_VERSION` in `lib/anime-cutout.ts`. Use an exact
  version; the `ort.webgpu.min.mjs` and `ort.min.mjs` file names must exist
  in that release's `dist/` folder.
- **Sticker size or file limit:** `S` (512) and `WEBP_LIMIT` (100 KB) at the
  top of `StickerMaker.tsx`.
- **Licences:** anime-seg is Apache-2.0 and onnxruntime-web is MIT. The panel
  credits the model; keep that line if you change the UI.
