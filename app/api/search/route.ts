import { NextResponse } from "next/server";
import { searchSite } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  if (!query) {
    return NextResponse.json({ query, results: { movies: [], anime: [], franchises: [] } });
  }

  try {
    const { movies, anime, franchises } = await searchSite(query);
    return NextResponse.json({
      query,
      results: {
        movies: movies.map((m) => ({ slug: m.slug, title: m.title, year: m.year ?? null, posterUrl: m.posterUrl ?? null })),
        anime: anime.map((a) => ({ slug: a.slug, title: a.title, year: a.year ?? null, posterUrl: a.posterUrl ?? null })),
        franchises: franchises.map((f) => ({ slug: f.slug, title: f.title })),
      },
    });
  } catch (err) {
    console.error("search error:", err);
    return NextResponse.json({ error: "Search failed." }, { status: 502 });
  }
}
