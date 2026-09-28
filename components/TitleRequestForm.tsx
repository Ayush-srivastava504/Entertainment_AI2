"use client";

import { useState, type FormEvent } from "react";

export function TitleRequestForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setHasError(false);

    try {
      const response = await fetch("/api/title-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not send your request.");
      setTitle("");
      setMessage("Thanks. Your title request has been received.");
    } catch (error) {
      setHasError(true);
      setMessage(error instanceof Error ? error.message : "Could not send your request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="requested-title">Movie or anime title</label>
      <input
        id="requested-title"
        name="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={120}
        required
        placeholder="Enter a movie or anime title"
        className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-surface px-4 py-3 text-ink placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="rounded-xl border-2 border-ink bg-beam px-5 py-3 font-bold text-white transition hover:bg-beamDeep disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Request an Ending"}
      </button>
      <p className={`basis-full text-sm ${hasError ? "text-cue" : "text-muted"}`} aria-live="polite">
        {message}
      </p>
    </form>
  );
}