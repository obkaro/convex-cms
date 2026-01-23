import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Circle, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

type Category = "core" | "integrations" | "performance" | "ux";
type Priority = "high" | "medium" | "low";

interface RoadmapItem {
  _id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  targetQuarter?: string;
  votes?: number;
}

const categoryLabels: Record<Category, string> = {
  core: "Core Platform",
  integrations: "Integrations",
  performance: "Performance",
  ux: "User Experience",
};

const categoryColors: Record<Category, string> = {
  core: "bg-purple-100 text-purple-700 border-purple-200",
  integrations: "bg-blue-100 text-blue-700 border-blue-200",
  performance: "bg-green-100 text-green-700 border-green-200",
  ux: "bg-amber-100 text-amber-700 border-amber-200",
};

function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <div className="card-hover">
      <div className="flex items-start justify-between gap-4 mb-3">
        <span
          className={`badge text-[10px] ${categoryColors[item.category]}`}
        >
          {categoryLabels[item.category]}
        </span>
        {item.priority === "high" && (
          <span className="text-[10px] font-medium text-accent-coral uppercase tracking-wider">
            High Priority
          </span>
        )}
      </div>

      <h4 className="font-semibold text-tempo-800 mb-2">{item.title}</h4>

      <p className="text-sm text-tempo-500 line-clamp-2 mb-4">
        {item.description}
      </p>

      <div className="flex items-center justify-between text-xs text-tempo-400">
        {item.targetQuarter && <span>{item.targetQuarter}</span>}
        {item.votes !== undefined && (
          <span className="flex items-center gap-1">
            <span className="font-medium text-tempo-600">{item.votes}</span>
            votes
          </span>
        )}
      </div>
    </div>
  );
}

function StatusColumn({
  title,
  icon,
  items,
  colorClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: RoadmapItem[];
  colorClass: string;
}) {
  return (
    <div>
      <div className={`status-header ${colorClass}`}>
        {icon}
        <h3 className="font-semibold text-tempo-700">{title}</h3>
        <span className="ml-auto text-sm text-tempo-400">{items.length}</span>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <RoadmapCard key={item._id} item={item} />
        ))}
        {items.length === 0 && (
          <p className="text-center text-tempo-400 py-8 text-sm">
            No items yet
          </p>
        )}
      </div>
    </div>
  );
}

export function Roadmap() {
  const roadmap = useQuery(api.content.getRoadmapByStatus);

  if (roadmap === undefined) {
    return (
      <section id="roadmap" className="section bg-tempo-50">
        <div className="container-wide">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-tempo-400 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="roadmap" className="section bg-tempo-50">
      <div className="container-wide">
        <div className="text-center mb-12">
          <h2 className="heading-lg mb-4">Product Roadmap</h2>
          <p className="text-body max-w-2xl mx-auto">
            See what we're working on and what's coming next. Our roadmap is
            shaped by your feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <StatusColumn
            title="Planned"
            icon={<Circle className="w-5 h-5 text-status-planned" />}
            items={roadmap.planned}
            colorClass="status-header-planned"
          />

          <StatusColumn
            title="In Progress"
            icon={<ArrowRight className="w-5 h-5 text-status-progress" />}
            items={roadmap.in_progress}
            colorClass="status-header-progress"
          />

          <StatusColumn
            title="Completed"
            icon={<CheckCircle className="w-5 h-5 text-green-500" />}
            items={roadmap.completed}
            colorClass="status-header-completed"
          />
        </div>
      </div>
    </section>
  );
}
