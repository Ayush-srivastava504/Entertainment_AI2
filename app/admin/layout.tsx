import type { Metadata } from "next";
import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/anime", label: "Anime" },
  { href: "/admin/movies", label: "Movies" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/title-requests", label: "Title requests" },
];

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-6 py-10">
      <aside className="w-48 shrink-0">
        <p className="text-sm font-bold text-beam">admin</p>
        <nav className="mt-6 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm text-muted hover:bg-surface hover:text-ink focus-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <LogoutButton />
        </div>
        <div className="mt-8">
          <Link href="/" className="text-xs text-muted hover:underline">
            ← Back to site
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
