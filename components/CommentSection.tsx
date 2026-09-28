"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface Comment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export default function CommentSection({
  type,
  slug,
}: {
  type: "ending-explained" | "watch-order";
  slug: string;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/comments?type=${type}&slug=${slug}`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(() => setComments([]));
  }, [type, slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, slug, name, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not post that comment.");
        setStatus("error");
        return;
      }
      setComments((prev) => [data.comment, ...(prev ?? [])]);
      setBody("");
      setStatus("idle");
      trackEvent("post_comment", { content_type: type, slug });
    } catch {
      setError("Could not post that comment. Try again shortly.");
      setStatus("error");
    }
  }

  return (
    <section className="mt-16 border-t-2 border-ink pt-10">
      <h2 className="mb-5 font-display text-3xl font-bold tracking-tight text-ink">
        Comments {comments ? `(${comments.length})` : ""}
      </h2>

      <form onSubmit={handleSubmit} className="mb-8 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          className="w-full rounded-xl border-2 border-ink bg-surface px-4 py-3 text-base text-ink placeholder:text-muted"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say something..."
          maxLength={1000}
          rows={3}
          className="w-full rounded-xl border-2 border-ink bg-surface px-4 py-3 text-base text-ink placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={status === "sending" || !name.trim() || !body.trim()}
          className="rounded-full border-2 border-ink bg-beam px-6 py-2.5 font-bold text-white transition hover:bg-beamDeep disabled:opacity-50"
        >
          {status === "sending" ? "Posting..." : "Post comment"}
        </button>
        {error && <p className="text-sm font-semibold text-cue">{error}</p>}
      </form>

      {comments === null && (
        <p className="text-sm text-muted">Loading comments...</p>
      )}
      {comments?.length === 0 && (
        <p className="text-sm text-muted">
          No comments yet — be the first.
        </p>
      )}
      <div className="space-y-4">
        {comments?.map((c) => (
          <div key={c.id} className="rounded-2xl border-2 border-ink bg-surface p-4">
            <div className="flex items-baseline justify-between mb-1">
              <p className="font-display font-bold text-ink">{c.author_name}</p>
              <p className="text-xs font-semibold text-muted">
                {new Date(c.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <p className="font-body text-base text-ink whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
