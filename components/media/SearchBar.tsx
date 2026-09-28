"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

export function SearchBar({
  initialValue,
  path,
  size = "md",
  placeholder = "Search a movie, anime or franchise",
}: {
  initialValue?: string;
  path: string;
  size?: "md" | "lg";
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue ?? "");
  const big = size === "lg";

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        trackEvent("search", { search_term: query.trim() });
        router.push(`${path}?${params.toString()}`);
      }}
      className={`flex items-center gap-2 rounded-full border-2 border-ink bg-surface p-1.5 shadow-block ${big ? "sm:p-2" : ""}`}
    >
      <label htmlFor={`search-${path}`} className="sr-only">
        Search by title
      </label>
      <input
        id={`search-${path}`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent px-4 font-display font-medium text-ink placeholder:text-muted/70 focus:outline-none ${
          big ? "py-3 text-base sm:text-xl" : "py-2 text-base"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full border-2 border-ink bg-tape font-bold text-ink transition hover:bg-ink hover:text-tape ${
          big ? "px-4 py-3 text-base sm:px-6 sm:text-lg" : "px-4 py-2 sm:px-5"
        }`}
      >
        Search
      </button>
    </form>
  );
}
