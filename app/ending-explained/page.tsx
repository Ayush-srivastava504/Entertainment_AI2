import EndingHub from "@/components/hubs/EndingHub";
import { endingHubMetadata } from "@/components/hubs/endingHubMetadata";

// Static, rebuilt hourly. ?page=N is served by app/ending-explained/p/[n] via
// a middleware rewrite, so this page never reads searchParams.
export const revalidate = 3600;

export const metadata = endingHubMetadata(1);

export default function EndingExplainedIndexPage() {
  return <EndingHub page={1} />;
}
