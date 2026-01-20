import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
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
          <StatCard label="Content Types" value="—" />
          <StatCard label="Content Entries" value="—" />
          <StatCard label="Media Assets" value="—" />
          <StatCard label="Published" value="—" />
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
