import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FileText,
  Image,
  Layers,
  Tags,
  FileCode,
  Settings,
  Trash2,
} from 'lucide-react'
import { cn } from '~/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  exact?: boolean
}

const mainNavItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="size-5" />, exact: true },
  { to: '/content', label: 'Content', icon: <FileText className="size-5" /> },
  { to: '/media', label: 'Media', icon: <Image className="size-5" /> },
  { to: '/taxonomies', label: 'Taxonomies', icon: <Tags className="size-5" /> },
]

const configNavItems: NavItem[] = [
  { to: '/content-types', label: 'Content Types', icon: <Layers className="size-5" /> },
  { to: '/audit-logs', label: 'Audit Logs', icon: <FileCode className="size-5" /> },
  { to: '/trash', label: 'Trash', icon: <Trash2 className="size-5" /> },
  { to: '/settings', label: 'Settings', icon: <Settings className="size-5" /> },
]

export function Sidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const isActive = (to: string, exact?: boolean) => {
    if (exact) {
      return currentPath === to
    }
    return currentPath.startsWith(to)
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Layers className="size-4" />
          </div>
          <span className="text-base">Convex CMS</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="space-y-1">
          <span className="px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Main
          </span>
          <div className="space-y-1 pt-2">
            {mainNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  isActive(item.to, item.exact)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Configuration
          </span>
          <div className="space-y-1 pt-2">
            {configNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  isActive(item.to, item.exact)
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
          <span>Version</span>
          <span className="font-mono">0.1.0</span>
        </div>
      </div>
    </aside>
  )
}
