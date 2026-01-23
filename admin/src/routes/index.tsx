import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { CmsPageHeader } from '~/components/cmsds'
import { FileText, Image, Layers, Settings, TrendingUp } from 'lucide-react'
import { cn } from '~/lib/cn'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const stats = useQuery(api.stats.getDashboardStats)
  const isLoading = stats === undefined
  const hasError = stats === null

  return (
    <div className="space-y-8">
      <CmsPageHeader
        title="Dashboard"
        description="Welcome to Convex CMS Admin. Manage your content, media, and publishing workflows."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Content Entries"
          description="Create and manage your content"
          href="/content"
          icon={<FileText className="size-5" />}
        />
        <DashboardCard
          title="Media Library"
          description="Upload and organize media assets"
          href="/media"
          icon={<Image className="size-5" />}
        />
        <DashboardCard
          title="Content Types"
          description="Define content schemas and fields"
          href="/content-types"
          icon={<Layers className="size-5" />}
        />
        <DashboardCard
          title="Settings"
          description="Configure CMS settings"
          href="/settings"
          icon={<Settings className="size-5" />}
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Quick Stats</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Content Types"
            value={isLoading ? undefined : hasError ? '—' : String(stats.contentTypes)}
            isLoading={isLoading}
          />
          <StatCard
            label="Content Entries"
            value={isLoading ? undefined : hasError ? '—' : String(stats.contentEntries)}
            isLoading={isLoading}
          />
          <StatCard
            label="Media Assets"
            value={isLoading ? undefined : hasError ? '—' : String(stats.mediaAssets)}
            isLoading={isLoading}
          />
          <StatCard
            label="Published"
            value={isLoading ? undefined : hasError ? '—' : String(stats.published)}
            isLoading={isLoading}
          />
        </div>
      </section>
    </div>
  )
}

function DashboardCard({
  title,
  description,
  href,
  icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link to={href}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="pb-2">
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatCard({
  label,
  value,
  isLoading = false,
}: {
  label: string
  value?: string
  isLoading?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        {isLoading ? (
          <Skeleton className="mb-1 h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}
