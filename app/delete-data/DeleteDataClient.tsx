"use client";

import { useState } from "react";

const LOCAL_PREFIX = "animegirl4u:";

export default function DeleteDataClient() {
  const [msg, setMsg] = useState("");

  async function wipe() {
    try {
      const push = window.Capacitor?.Plugins?.PushNotifications;
      const token = window.localStorage.getItem(LOCAL_PREFIX + "pushToken");
      if (token) {
        await fetch("/api/push/unregister", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
      await push?.unregister?.().catch(() => {});

      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(LOCAL_PREFIX))
        .forEach((k) => window.localStorage.removeItem(k));
      setMsg("Done. Saved titles, coins, scores and your notification token were removed.");
    } catch {
      setMsg("Something went wrong. Clear the app's storage in Android settings instead.");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border-2 border-ink bg-surface p-5 shadow-block">
      <button
        type="button"
        onClick={wipe}
        className="rounded-full bg-beam px-5 py-2.5 text-sm font-bold text-white hover:bg-beamDeep"
      >
        Delete data from this device
      </button>
      {msg && <p className="mt-3 text-sm" role="status">{msg}</p>}
    </div>
  );
}
