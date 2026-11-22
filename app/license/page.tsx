import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { INDEX_ROBOTS } from "@/lib/seo";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

/*
Image licence page. Every image's structured data points here (license and
acquireLicensePage in lib/jsonld.ts imageObject), which is what lets Google
Images show licence details for the GIFs, stickers, PFPs and wallpapers.
Keep it accurate: it describes what the site can grant (use of its own
drawings) and what it cannot (rights in the anime characters themselves).
*/

const PATH = "/license";
const TITLE = `Image Licence: Free for Personal Use | ${SITE_NAME}`;
const DESCRIPTION = `How you can use the anime girl GIFs, stickers, PFPs and wallpapers on ${SITE_NAME}: free for personal use, with no sign-up and no attribution required.`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${getBaseUrl()}${PATH}` },
  robots: INDEX_ROBOTS,
};

export default function LicensePage() {
  const BASE_URL = getBaseUrl();
  const jsonLd = graph(
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}${PATH}#webpage`,
      url: `${BASE_URL}${PATH}`,
      name: "Image licence",
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Image licence", path: PATH },
    ])
  );

  const h2 = "mt-10 font-display text-2xl font-extrabold";
  const link = "font-semibold text-beam underline underline-offset-2";
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 leading-relaxed sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Image licence" }]} />
      <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Image licence</h1>
      <p className="mt-3 text-lg text-muted">
        The short version: every GIF, sticker, PFP and wallpaper on {SITE_NAME} is free to download and use for personal,
        non-commercial purposes. You don&rsquo;t need to sign up, pay or credit us.
      </p>

      <h2 className={h2}>What you can do</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Use any image as your profile picture (PFP) on Discord, WhatsApp, Instagram, X, Telegram or any other app.</li>
        <li>Send the stickers and GIFs in chats and group chats, and use them as reactions.</li>
        <li>Set the wallpapers as your phone, tablet or computer background.</li>
        <li>Resize, crop, add a background or a caption for your own use, for example with the PFP download or the sticker maker.</li>
        <li>Share a link to any page on the site.</li>
      </ul>

      <h2 className={h2}>What this licence does not cover</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Selling the images, or putting them on products you sell (prints, stickers, shirts, phone cases and so on).</li>
        <li>Re-uploading the collections to another website, app or sticker pack as your own.</li>
        <li>Using the images in advertising, or to suggest that {SITE_NAME} endorses something.</li>
      </ul>
      <p className="mt-3">If you want to do something not covered here, do not assume it is allowed.</p>

      <h2 className={h2}>About the anime characters</h2>
      <p className="mt-3">
        The drawings are made for {SITE_NAME}, but several collections show well-known characters, such as Sakura Haruno
        (Naruto), Nami (One Piece), Orihime Inoue (Bleach), Noelle Silva (Black Clover), Mitsuha Miyamizu (Your Name) and the
        My Hero Academia heroines. Those characters, their names and their designs belong to their creators and publishers.
        This licence covers only the drawings on this site, for personal use; it gives no rights in the characters themselves.
        The Ghibli-style, gothic, crush, tsundere, reactions and animated collections show original characters.
      </p>

      <h2 className={h2}>Credit</h2>
      <p className="mt-3">
        Credit is never required for personal use. If you would like to credit the images anyway, &ldquo;{SITE_NAME}&rdquo; with
        a link to <Link href="/" className={link}>animegirl4u.com</Link> is perfect.
      </p>

      <h2 className={h2}>Character guides and profiles</h2>
      <p className="mt-3">
        This licence is about images. The ending explained guides, watch orders and character profiles are written for reading
        on the site; you are welcome to quote a sentence or two with a link back, but please do not copy whole guides.
      </p>

      <p className="mt-12 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/stickers" className={link}>Stickers &amp; GIFs</Link>
        <Link href="/anime-girl-pfp" className={link}>Anime girl PFP</Link>
        <Link href="/wallpapers" className={link}>Wallpapers</Link>
        <Link href="/privacy" className={link}>Privacy</Link>
      </p>
    </article>
  );
}
