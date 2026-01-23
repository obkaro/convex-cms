import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2, Calendar } from "lucide-react";

type ChangeType = "feature" | "improvement" | "fix" | "breaking";

interface ChangelogEntry {
  _id: string;
  title: string;
  description: string;
  version: string;
  releaseDate: number;
  type: ChangeType[];
  image?: string;
}

const typeLabels: Record<ChangeType, string> = {
  feature: "New Feature",
  improvement: "Improvement",
  fix: "Bug Fix",
  breaking: "Breaking",
};

const typeBadgeClass: Record<ChangeType, string> = {
  feature: "badge-feature",
  improvement: "badge-improvement",
  fix: "badge-fix",
  breaking: "badge-breaking",
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <div className="timeline-item">
      <div className="timeline-dot-accent" />

      <div className="card mb-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-mono text-sm font-medium text-tempo-600 bg-tempo-100 px-2 py-1">
            v{entry.version}
          </span>
          {entry.type.map((t) => (
            <span key={t} className={`badge ${typeBadgeClass[t]}`}>
              {typeLabels[t]}
            </span>
          ))}
        </div>

        <h3 className="heading-sm mb-2">{entry.title}</h3>

        <div className="flex items-center gap-2 text-sm text-tempo-400 mb-4">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(entry.releaseDate)}</span>
        </div>

        <div className="text-body whitespace-pre-line">{entry.description}</div>
      </div>
    </div>
  );
}

export function Changelog() {
  const changelog = useQuery(api.content.getChangelogEntries, { limit: 10 });

  if (changelog === undefined) {
    return (
      <section id="changelog" className="section bg-white">
        <div className="container-narrow">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-tempo-400 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="changelog" className="section bg-white">
      <div className="container-narrow">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">Changelog</h2>
          <p className="text-body max-w-2xl mx-auto">
            Stay up to date with the latest features, improvements, and fixes.
          </p>
        </div>

        <div className="relative">
          {changelog.map((entry: ChangelogEntry) => (
            <ChangelogCard key={entry._id} entry={entry} />
          ))}

          {changelog.length === 0 && (
            <div className="text-center py-12">
              <p className="text-tempo-500">No changelog entries yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
