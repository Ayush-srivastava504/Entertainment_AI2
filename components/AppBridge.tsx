"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/*
Runs only inside the Animegirl4u Android app (its WebView user agent contains
"Animegirl4uApp"). On the normal website it does nothing.

Two things happen here:
1. Share: Android WebView has no Web Share API, so this wires navigator.share
   to the native share sheet (Capacitor's Share plugin, injected into the page
   as window.Capacitor.Plugins.Share). Everything that already calls
   navigator.share, like <ShareButton />, then works unchanged.
2. Push: registers the device for Firebase Cloud Messaging push notifications
   (Capacitor's PushNotifications plugin, injected as
   window.Capacitor.Plugins.PushNotifications) and posts the resulting FCM
   token to /api/push/register. Tapping a notification navigates the WebView
   to its `link` data field, if the payload has one.
*/

export const APP_UA_TOKEN = "Animegirl4uApp";

type NativeShare = {
  share: (options: { title?: string; text?: string; url?: string; dialogTitle?: string }) => Promise<unknown>;
};

type PermissionStatus = { receive: "prompt" | "prompt-with-rationale" | "granted" | "denied" };
type PushToken = { value: string };
type PushNotificationSchema = { data?: Record<string, string> };
type ActionPerformed = { actionId: string; notification: PushNotificationSchema };
type ListenerHandle = { remove: () => Promise<void> };

type NativePushNotifications = {
  checkPermissions: () => Promise<PermissionStatus>;
  requestPermissions: () => Promise<PermissionStatus>;
  register: () => Promise<void>;
  addListener(eventName: "registration", listener: (token: PushToken) => void): Promise<ListenerHandle>;
  addListener(eventName: "registrationError", listener: (error: { error: string }) => void): Promise<ListenerHandle>;
  addListener(
    eventName: "pushNotificationReceived",
    listener: (notification: PushNotificationSchema) => void
  ): Promise<ListenerHandle>;
  addListener(
    eventName: "pushNotificationActionPerformed",
    listener: (action: ActionPerformed) => void
  ): Promise<ListenerHandle>;
};

declare global {
  interface Window {
    Capacitor?: { Plugins?: { Share?: NativeShare; PushNotifications?: NativePushNotifications } };
  }
}

export function isAnimegirl4uApp(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.includes(APP_UA_TOKEN);
}

function installShareBridge() {
  const nativeShare = window.Capacitor?.Plugins?.Share;
  if (!nativeShare || typeof navigator.share === "function") return;

  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: async (data: ShareData = {}) => {
      try {
        await nativeShare.share({
          title: data.title,
          text: data.text,
          url: data.url,
          dialogTitle: "Share",
        });
      } catch (err) {
        // Closing the share sheet rejects; the Web Share API calls that an AbortError.
        const message = err instanceof Error ? err.message : String(err);
        if (/cancel/i.test(message)) {
          throw new DOMException("Share canceled", "AbortError");
        }
        throw err;
      }
    },
  });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
}

async function installPushBridge() {
  const push = window.Capacitor?.Plugins?.PushNotifications;
  if (!push) return;

  push.addListener("registration", (token) => {
    fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.value, platform: "android" }),
    }).catch(() => {
      // Best-effort: a failed call here just means this device retries on next app open.
    });
    trackEvent("push_token_registered", { method: "fcm" });
  });

  push.addListener("registrationError", () => {
    trackEvent("push_permission_denied", { method: "registration_error" });
  });

  push.addListener("pushNotificationReceived", (notification) => {
    trackEvent("push_notification_received", { content_type: notification.data?.type || "unknown" });
  });

  push.addListener("pushNotificationActionPerformed", (action) => {
    const link = action.notification?.data?.link;
    trackEvent("push_notification_opened", { content_type: action.notification?.data?.type || "unknown" });
    if (link) {
      window.location.href = link;
    }
  });

  try {
    let status = await push.checkPermissions();
    if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
      status = await push.requestPermissions();
    }
    if (status.receive === "granted") {
      await push.register();
    } else {
      trackEvent("push_permission_denied", { method: "user_declined" });
    }
  } catch {
    // Permission dialog / registration can fail on odd OEM builds; the app
    // still works without push, so this is swallowed rather than surfaced.
  }
}

export default function AppBridge() {
  useEffect(() => {
    if (!isAnimegirl4uApp()) return;

    document.documentElement.classList.add("is-app");
    trackEvent("app_open", { method: "android_app" });

    installShareBridge();
    installPushBridge();
  }, []);

  return null;
}
