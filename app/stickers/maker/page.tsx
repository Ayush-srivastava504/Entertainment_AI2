import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { socialMeta } from "@/lib/og";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Faq } from "@/components/ui/Faq";
import StickerMaker from "@/components/stickers/StickerMaker";

const PATH = "/stickers/maker";
const TITLE = `Image to Sticker Maker: Turn Any Photo Into a Sticker | ${SITE_NAME}`;
const DESCRIPTION =
  "Free image to sticker maker for your phone: remove the background, add a white outline and a caption, then save a 512x512 WebP sticker. Your photo never leaves your device.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${getBaseUrl()}${PATH}` },
  ...socialMeta({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    cardTitle: "Image to Sticker Maker",
    cardSubtitle: "Photo in, sticker out. Free, on your phone",
    badge: "STICKER MAKER",
  }),
};

const FAQ = [
  {
    q: "Is my photo uploaded anywhere?",
    a: "No. The sticker maker runs entirely in your browser: the photo is read, edited and saved on your own device and is never sent to Animegirl4u or anyone else. Closing the page discards it.",
  },
  {
    q: "What size and format is the sticker?",
    a: "It is saved as a 512 × 512 pixel WebP image with a transparent background, kept under 100 KB where possible. That is the size messaging apps such as WhatsApp and Telegram use for stickers. If your browser cannot save WebP, you get a PNG instead, and there is also a PNG button.",
  },
  {
    q: "How does the background removal work?",
    a: "\"Remove background\" clears every area connected to the edges of the photo that has a similar colour, so it works best when the subject is on a plain, even background. Use the strength slider to remove more or less, \"Tap to erase\" to clear any leftover patch, and Undo or Restore if it removes too much.",
  },
  {
    q: "How do I add the sticker to WhatsApp or Telegram?",
    a: "Save the sticker, then add it the way your app supports: Telegram's @Stickers bot accepts 512 × 512 images, and WhatsApp lets you create a sticker from a saved image in its sticker panel on supported devices. On a phone the Share button sends the sticker straight to an app.",
  },
  {
    q: "Is it free?",
    a: "Yes. There is no sign-up, no watermark and no limit on how many stickers you make.",
  },
];

export default function StickerMakerPage() {
  const BASE_URL = getBaseUrl();
  const jsonLd = graph(
    {
      "@type": "WebApplication",
      "@id": `${BASE_URL}${PATH}#app`,
      name: "Image to Sticker Maker",
      url: `${BASE_URL}${PATH}`,
      description: DESCRIPTION,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any (runs in the browser)",
      browserRequirements: "Requires JavaScript and HTML5 canvas",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@id": WEBSITE_ID },
    },
    {
      "@id": `${BASE_URL}${PATH}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Stickers & GIFs", path: "/stickers" },
        { name: "Sticker maker", path: PATH },
      ]),
    }
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Stickers & GIFs", href: "/stickers" }, { name: "Sticker maker" }]} />

      <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Image to sticker maker</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Turn any photo or drawing into a sticker on your phone: cut out the background, add the white sticker border and a
        caption, then save it as a 512 × 512 sticker. Free, and your photo never leaves your device.
      </p>

      <div className="mt-8">
        <StickerMaker />
      </div>

      <section className="mt-16 max-w-3xl" aria-labelledby="how-to">
        <h2 id="how-to" className="font-display text-2xl font-extrabold">
          How to make a sticker from a photo
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6 leading-relaxed">
          <li>
            <strong>Choose a photo.</strong> On a phone you can take a new picture or pick one from your gallery. Photos with
            the subject in front of a plain wall or sky give the cleanest cut-out.
          </li>
          <li>
            <strong>Remove the background.</strong> Tap &ldquo;Remove background&rdquo;, then raise or lower the strength
            until only the subject is left. Switch on &ldquo;Tap to erase&rdquo; to clear any patch it missed.
          </li>
          <li>
            <strong>Frame it.</strong> Drag the picture to move it and pinch to zoom. Pick a square, rounded or circle shape and
            set the thickness of the white outline.
          </li>
          <li>
            <strong>Add a caption</strong> if you like, at the top or bottom, in one of five colours.
          </li>
          <li>
            <strong>Save or share.</strong> Download the WebP sticker, or use Share to send it straight to a chat app.
          </li>
        </ol>
      </section>

      <div className="mt-16 max-w-3xl">
        <Faq items={FAQ} title="Sticker maker questions" />
      </div>

      <p className="mt-10 max-w-3xl text-muted">
        Want something ready-made instead? Browse the{" "}
        <Link href="/stickers" className="font-semibold text-beam underline underline-offset-4">
          free anime girl stickers and GIFs
        </Link>{" "}
        or the{" "}
        <Link href="/stickers/reactions" className="font-semibold text-beam underline underline-offset-4">
          reaction stickers
        </Link>
        .
      </p>
    </div>
  );
}
