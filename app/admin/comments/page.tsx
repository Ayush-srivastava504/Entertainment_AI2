import CommentModeration from "@/components/admin/CommentModeration";

export default function AdminCommentsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Comments</h1>
      <p className="mt-2 text-sm text-muted">Newest first. Delete is immediate — there's no undo.</p>
      <div className="mt-6">
        <CommentModeration />
      </div>
    </div>
  );
}
