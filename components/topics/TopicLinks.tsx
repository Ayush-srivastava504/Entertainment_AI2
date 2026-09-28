import Link from "next/link";
import type { GuideTopic } from "@/lib/topics";

export function TopicLinks({ topics, basePath }: { topics: GuideTopic[]; basePath: string }) {
  return (
    <section className="border-y-2 border-ink bg-tape">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-beam">Browse by topic</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Start with the kind of guide you need</h2>
          </div>
          <span className="hidden text-sm font-semibold text-muted sm:block">{topics.length} collections</span>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`${basePath}/topic/${topic.slug}`}
              className="group rounded-2xl border-2 border-ink bg-surface p-5 transition hover:-translate-y-1 hover:shadow-block"
            >
              <h3 className="font-display text-xl font-extrabold leading-tight group-hover:text-beam">{topic.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{topic.description}</p>
              <span className="mt-4 inline-block text-sm font-bold text-beam">Explore topic -&gt;</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}