"use client";

import { useEffect, useState } from "react";

interface RequestRow {
  id: string;
  title: string;
  createdAt: string;
}

export default function TitleRequestModeration() {
  const [rows, setRows] = useState<RequestRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/title-requests")
      .then((response) => response.json())
      .then((data) => setRows(data.rows ?? []))
      .catch(() => setRows([]));
  }, []);

  async function handleDelete(id: string) {
    const response = await fetch(`/api/admin/title-requests/${id}`, { method: "DELETE" });
    if (response.ok) setRows((current) => current?.filter((row) => row.id !== id) ?? null);
  }

  return (
    <div>
      {rows === null && <p className="text-sm text-muted">Loading title requests...</p>}
      {rows?.length === 0 && <p className="text-sm text-muted">No title requests yet.</p>}
      <div className="space-y-3">
        {rows?.map((row) => (
          <div key={row.id} className="ticket flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-bold text-ink">{row.title}</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(row.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(row.id)}
              className="shrink-0 rounded border border-fog px-3 py-1.5 text-xs text-red-300 hover:border-red-400 focus-ring"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {rows?.length === 100 && <p className="mt-4 text-xs text-muted">Showing the 100 most recent requests.</p>}
    </div>
  );
}