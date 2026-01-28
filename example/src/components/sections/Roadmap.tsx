import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Circle, Loader2, CheckCircle2 } from "lucide-react";

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

const categoryConfig: Record<Category, { label: string; className: string }> = {
  core: { label: "Core", className: "cat-core" },
  integrations: { label: "Integrations", className: "cat-integrations" },
  performance: { label: "Performance", className: "cat-performance" },
  ux: { label: "UX", className: "cat-ux" },
};

function RoadmapCard({ item }: { item: RoadmapItem }) {
  const cat = categoryConfig[item.category];

  return (
    <div className="roadmap-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`cat-badge ${cat.className}`}>
          {cat.label}
        </span>
        {item.priority === "high" && (
          <span className="text-[10px] font-medium text-accent uppercase tracking-wider">
            High Priority
          </span>
        )}
      </div>

      <h4 className="text-base font-medium text-slate-900 mb-2">{item.title}</h4>

      <p className="text-sm text-slate-500 line-clamp-2 mb-4">
        {item.description}
      </p>

      <div className="flex items-center justify-between text-xs text-slate-400">
        {item.targetQuarter && <span>{item.targetQuarter}</span>}
        {item.votes !== undefined && item.votes > 0 && (
          <span className="flex items-center gap-1">
            <span className="font-medium text-slate-600">{item.votes}</span>
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
  count,
}: {
  title: string;
  icon: React.ReactNode;
  items: RoadmapItem[];
  count: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        {icon}
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {count}
        </Badge>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <RoadmapCard key={item._id} item={item} />
        ))}
        {items.length === 0 && (
          <p className="text-center text-slate-400 py-8 text-sm">
            No items
          </p>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function Roadmap() {
  const roadmap = useQuery(api.content.getRoadmapByStatus);

  const columns = [
    {
      id: "planned",
      title: "Planned",
      icon: <Circle className="h-4 w-4 fill-slate-200 text-slate-400" />,
      items: roadmap?.planned || [],
    },
    {
      id: "in_progress",
      title: "In Progress",
      icon: <Loader2 className="h-4 w-4 text-sky-600 animate-spin" />,
      items: roadmap?.in_progress || [],
    },
    {
      id: "completed",
      title: "Shipped",
      icon: <CheckCircle2 className="h-4 w-4 fill-emerald-600 text-emerald-600" />,
      items: roadmap?.completed || [],
    },
  ];

  return (
    <section id="roadmap" className="section bg-white">
      <div className="container-wide">
        <div className="mb-12">
          <p className="text-label mb-3">Roadmap</p>
          <h2 className="display-lg mb-4">What we're building</h2>
          <p className="text-body max-w-xl">
            Our product roadmap, updated in real-time. Everything here is shaped by
            how teams actually collaborate.
          </p>
        </div>

        {/* Desktop: Three columns */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
          {roadmap === undefined ? (
            <>
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </>
          ) : (
            columns.map((col) => (
              <StatusColumn
                key={col.id}
                title={col.title}
                icon={col.icon}
                items={col.items}
                count={col.items.length}
              />
            ))
          )}
        </div>

        {/* Mobile: Tabs */}
        <div className="lg:hidden">
          <Tabs defaultValue="planned" className="w-full">
            <TabsList className="w-full mb-6">
              {columns.map((col) => (
                <TabsTrigger key={col.id} value={col.id} className="flex-1 gap-2">
                  {col.icon}
                  {col.title}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {col.items.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {roadmap === undefined ? (
              <LoadingSkeleton />
            ) : (
              columns.map((col) => (
                <TabsContent key={col.id} value={col.id}>
                  <div className="space-y-4">
                    {col.items.map((item) => (
                      <RoadmapCard key={item._id} item={item} />
                    ))}
                    {col.items.length === 0 && (
                      <p className="text-center text-slate-400 py-8 text-sm">
                        No items
                      </p>
                    )}
                  </div>
                </TabsContent>
              ))
            )}
          </Tabs>
        </div>
      </div>
    </section>
  );
}
