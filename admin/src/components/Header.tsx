import { useRouterState } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

interface Breadcrumb {
  label: string
  to?: string
}

// Map routes to readable names
const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/content': 'Content',
  '/media': 'Media Library',
  '/content-types': 'Content Types',
  '/settings': 'Settings',
}

function getBreadcrumbs(pathname: string): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [{ label: 'Home', to: '/' }]

  if (pathname === '/') {
    return breadcrumbs
  }

  const segments = pathname.split('/').filter(Boolean)
  let currentPath = ''

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')

    // Last segment doesn't need a link
    if (index === segments.length - 1) {
      breadcrumbs.push({ label })
    } else {
      breadcrumbs.push({ label, to: currentPath })
    }
  })

  return breadcrumbs
}

export function Header() {
  const routerState = useRouterState()
  const breadcrumbs = getBreadcrumbs(routerState.location.pathname)
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard'

  return (
    <header className="admin-header">
      <div className="header-left">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="breadcrumb-item">
                {index > 0 && (
                  <span className="breadcrumb-separator" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                )}
                {crumb.to ? (
                  <Link to={crumb.to} className="breadcrumb-link">
                    {index === 0 && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="home-icon">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    )}
                    <span>{crumb.label}</span>
                  </Link>
                ) : (
                  <span className="breadcrumb-current" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="header-right">
        <button className="header-action" title="Notifications" aria-label="View notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </button>

        <button className="header-action" title="Help" aria-label="Get help">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        <div className="user-menu">
          <button className="user-button" aria-label="User menu" aria-haspopup="true">
            <div className="user-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="user-name">Admin</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chevron-icon">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
