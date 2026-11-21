import { notFound, permanentRedirect } from "next/navigation";
import { WALLPAPERS, getWallpaper } from "@/lib/wallpapers";

/*
Single-wallpaper pages no longer exist as their own URLs: 85 near-identical
pages of 128-160 words. Each wallpaper, with its description and download
button, is on its category page, which is the page that ranks (and lists the
image in the image sitemap). Old links redirect there and land on the
wallpaper itself (#slug).
*/
export function generateStaticParams() {
  return WALLPAPERS.map((w) => ({ slug: w.slug }));
}

export default async function WallpaperRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wallpaper = getWallpaper(slug);
  if (!wallpaper) notFound();
  permanentRedirect(`/wallpapers/category/${wallpaper.category}#${wallpaper.slug}`);
}
