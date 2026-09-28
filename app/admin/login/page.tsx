"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setLoading(false);
        return;
      }
      router.push(searchParams.get("next") || "/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <p className="text-sm font-bold text-beam">admin</p>
      <h1 className="mt-2 font-display text-3xl text-ink">Sign in</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full rounded border border-fog bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus-ring"
        />
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded bg-beam px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50 focus-ring"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
