import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const stats = useQuery(api.stats.getDashboardStats)

  // Determine loading and error states
  const isLoading = stats === undefined
  const hasError = stats === null

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="page-description">
          Welcome to Convex CMS Admin. Manage your content, media, and publishing workflows.
        </p>
      </header>

      <div className="dashboard-grid">
        <DashboardCard
          title="Content Entries"
          description="Create and manage your content"
          href="/content"
          icon="content"
        />
        <DashboardCard
          title="Media Library"
          description="Upload and organize media assets"
          href="/media"
          icon="media"
        />
        <DashboardCard
          title="Content Types"
          description="Define content schemas and fields"
          href="/content-types"
          icon="types"
        />
        <DashboardCard
          title="Settings"
          description="Configure CMS settings"
          href="/settings"
          icon="settings"
        />
      </div>

      <section className="dashboard-section">
        <h2>Quick Stats</h2>
        <div className="stats-grid">
          <StatCard
            label="Content Types"
            value={isLoading ? '...' : hasError ? '—' : String(stats.contentTypes)}
            isLoading={isLoading}
          />
          <StatCard
            label="Content Entries"
            value={isLoading ? '...' : hasError ? '—' : String(stats.contentEntries)}
            isLoading={isLoading}
          />
          <StatCard
            label="Media Assets"
            value={isLoading ? '...' : hasError ? '—' : String(stats.mediaAssets)}
            isLoading={isLoading}
          />
          <StatCard
            label="Published"
            value={isLoading ? '...' : hasError ? '—' : String(stats.published)}
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
  icon: string
}) {
  return (
    <a href={href} className="dashboard-card">
      <div className={`card-icon icon-${icon}`} />
      <h3>{title}</h3>
      <p>{description}</p>
    </a>
  )
}

function StatCard({
  label,
  value,
  isLoading = false,
}: {
  label: string
  value: string
  isLoading?: boolean
}) {
  return (
    <div className={`stat-card${isLoading ? ' stat-card-loading' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
