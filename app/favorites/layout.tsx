import type { Metadata } from "next";

// Saved titles live in the visitor's browser: nothing here is worth indexing.
export const metadata: Metadata = {
  title: "Saved titles",
  robots: { index: false, follow: true },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
