import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { socialMeta } from "@/lib/og";

export const metadata: Metadata = {
  title: { absolute: `Privacy Policy | ${SITE_NAME}` },
  description: `How ${SITE_NAME} and its Android app handle your data: what is stored in your browser, comments, analytics and how to delete it.`,
  alternates: { canonical: `${getBaseUrl()}/privacy` },
  ...socialMeta({ title: `Privacy Policy | ${SITE_NAME}`, description: `How ${SITE_NAME} and its Android app handle your data: what is stored in your browser, comments, analytics and how to delete it.`, path: "/privacy", cardTitle: "Privacy Policy", badge: "PRIVACY" }),
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: November 2026</p>

      <div className="mt-6 space-y-6 leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-bold">No accounts</h2>
          <p className="mt-1">{SITE_NAME} has no sign-up or login. We do not ask for your name, email or phone number.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">What is stored on your device</h2>
          <p className="mt-1">
            Saved titles, game coins, collected stickers and best scores are kept in your browser or app storage only.
            They never reach our servers, and clearing app data removes them.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">What we collect</h2>
          <ul className="mt-1 list-disc space-y-1 pl-6">
            <li><strong>Comments and title requests</strong> you choose to submit, with the name you type.</li>
            <li><strong>Push notification token</strong> (Android app, only if you allow notifications). It is a random device identifier from Firebase Cloud Messaging used to send new-post alerts. Tokens unused for 90 days are deleted.</li>
            <li><strong>Anonymous analytics</strong> (Google Analytics 4) such as pages viewed and app opens, used to improve the site.</li>
            <li><strong>Standard server logs</strong> (IP address, user agent) kept briefly for security and rate limiting.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Sharing</h2>
          <p className="mt-1">We do not sell your data. It is processed only by our hosting, database, Firebase and Google Analytics providers to run the service.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Children</h2>
          <p className="mt-1">The service is not directed to children under 13 and we do not knowingly collect their personal data.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-bold">Your choices</h2>
          <p className="mt-1">
            You can turn off notifications in Android settings, and remove stored data any time on the{" "}
            <Link href="/delete-data" className="font-semibold text-beam hover:underline">Delete my data</Link> page.
          </p>
        </section>
      </div>
    </div>
  );
}
