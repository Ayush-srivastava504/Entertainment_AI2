export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24" role="status" aria-live="polite">
      <div className="h-10 w-2/3 max-w-xl animate-pulse rounded-full bg-fog" />
      <div className="mt-6 h-5 w-1/2 max-w-md animate-pulse rounded-full bg-fog" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
