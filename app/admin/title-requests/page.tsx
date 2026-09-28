import TitleRequestModeration from "@/components/admin/TitleRequestModeration";

export default function AdminTitleRequestsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Title requests</h1>
      <p className="mt-2 text-sm text-muted">Recent requests from the homepage. Remove a request after review.</p>
      <div className="mt-6">
        <TitleRequestModeration />
      </div>
    </div>
  );
}