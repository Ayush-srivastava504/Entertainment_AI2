import { notFound, permanentRedirect } from "next/navigation";
import EndingHub from "@/components/hubs/EndingHub";
import { endingHubMetadata } from "@/components/hubs/endingHubMetadata";

/*
Page N (2+) of the ending explained hub. The public URL stays
/ending-explained?page=N (middleware.ts rewrites it here; Pagination links use
it), and that is the canonical. Built on first visit, then cached (ISR).
*/
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ n: string }>;

function parsePage(n: string): number {
  const page = Number(n);
  if (!Number.isInteger(page) || page < 1) notFound();
  if (page === 1) permanentRedirect("/ending-explained");
  return page;
}

export async function generateMetadata({ params }: { params: Params }) {
  return endingHubMetadata(parsePage((await params).n));
}

export default async function EndingHubPage({ params }: { params: Params }) {
  return <EndingHub page={parsePage((await params).n)} />;
}
