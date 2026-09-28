export default function Loading() {
  // min-h keeps the footer below the fold while the page streams in. With a
  // short skeleton the footer sat right under it and jumped down when the
  // real content arrived, which was the bulk of the layout shift.
  return (
    <div className="mx-auto min-h-[100svh] max-w-6xl px-6 py-24" role="status" aria-live="polite">
      <div className="h-10 w-2/3 max-w-xl rounded-full bg-fog" />
      <div className="mt-6 h-5 w-1/2 max-w-md rounded-full bg-fog" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
