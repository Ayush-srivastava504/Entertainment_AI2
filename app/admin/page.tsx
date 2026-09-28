import Link from "next/link";
import { getAdminStats } from "@/lib/admin-db";

// This page always needs a live DB read (stats change constantly, and it's
// gated behind login anyway) — force dynamic rendering so Vercel never
// tries to statically pre-render it at build time against whatever DB
// happens to be reachable during the build.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  const cards = [
    {
      label: "Anime titles",
      value: stats.animeTotal,
      sub: `${stats.animeNoindex} noindexed · ${stats.animeFeatured} featured`,
      href: "/admin/anime",
    },
    {
      label: "Movie titles",
      value: stats.movieTotal,
      sub: `${stats.movieNoindex} noindexed · ${stats.movieFeatured} featured`,
      href: "/admin/movies",
    },
    {
      label: "Comments",
      value: stats.commentsTotal,
      sub: "across ending-explained + watch-order",
      href: "/admin/comments",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Dashboard</h1>
      <p className="mt-2 text-sm text-muted">
        Quick view of catalog size and moderation queue. Use Anime / Movies to flip{" "}
        <code className="text-beam">noindex</code>, <code className="text-beam">featured</code>, or
        write a real synopsis for thin pages.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="ticket p-5 transition hover:border-beam"
          >
            <p className="text-sm font-bold text-muted">{c.label}</p>
            <p className="mt-2 font-display text-3xl text-ink">{c.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted">{c.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 ticket p-5">
        <p className="text-sm font-bold text-beam">Suggested workflow</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Open Anime or Movies, filter by "Thin description".</li>
          <li>For titles worth keeping, write a real synopsis override.</li>
          <li>For the rest, flip noindex — the sitemap updates automatically.</li>
          <li>Flip featured on your best titles to surface them across the site.</li>
        </ol>
      </div>
    </div>
  );
}
