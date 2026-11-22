import { getBaseUrl } from "@/lib/site";

/*
"Save to Pinterest" for one image. A plain link to Pinterest's pin-create URL:
no Pinterest script, so it costs nothing in page speed. Each Pin links back
to the page the image is on (with its #anchor), so it brings referral
visits and links from Pinterest, the main place people collect PFPs and
wallpapers.
*/
export default function PinButton({ path, image, description }: { path: string; image: string; description: string }) {
  const base = getBaseUrl();
  const href =
    "https://www.pinterest.com/pin/create/button/?" +
    new URLSearchParams({
      url: path.startsWith("http") ? path : `${base}${path}`,
      media: image.startsWith("http") ? image : `${base}${image}`,
      description,
    }).toString();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={`Save to Pinterest: ${description}`}
      className="inline-flex shrink-0 items-center rounded-full border-2 border-ink px-2 py-0.5 text-xs font-bold hover:bg-fog"
    >
      Pin
    </a>
  );
}
