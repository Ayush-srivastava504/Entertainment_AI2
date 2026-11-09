import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import DeleteDataClient from "./DeleteDataClient";

export const metadata: Metadata = {
  title: { absolute: `Delete My Data | ${SITE_NAME}` },
  description: `Remove the data ${SITE_NAME} stores about you or your device.`,
  alternates: { canonical: `${getBaseUrl()}/delete-data` },
};

export default function DeleteDataPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Delete my data</h1>
      <p className="mt-2 text-muted">
        {SITE_NAME} has no accounts. The only things tied to you are what is saved on this device and, in the Android
        app, a push notification token.
      </p>
      <DeleteDataClient />
      <p className="mt-6 text-sm text-muted">
        To remove a comment you posted, use the contact details on the About page and include its page link.
      </p>
    </div>
  );
}
