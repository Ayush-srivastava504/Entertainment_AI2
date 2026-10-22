import { NextResponse } from "next/server";

/*
Android App Links verification file for the Marquee app (package site.marquees.app).
Set ANDROID_SHA256_CERT_FINGERPRINTS in Vercel to a comma-separated list of SHA-256
fingerprints, for example the Play Console "App signing key certificate" (Release >
Setup > App signing) and, if you sideload debug builds, your debug key. No code change or
redeploy of code is needed when the list changes; just update the env var.
Until it is set this returns an empty list, so links keep opening in the browser.
*/
export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "site.marquees.app",
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];

  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=300" } });
}
