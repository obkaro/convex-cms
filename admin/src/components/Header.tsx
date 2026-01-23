import { useRouterState, useNavigate, Link } from '@tanstack/react-router'
import { useAuth, useAdminConfig, useBreadcrumbContext } from '~/contexts'
import { getRole } from '../../../src/component/roles'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  Bell,
  HelpCircle,
  Home,
  LogOut,
  Settings,
  User,
  ChevronDown,
  ExternalLink,
  Book,
  Code,
  MessageSquare,
} from 'lucide-react'
import { cn } from '~/lib/cn'
import { Fragment } from 'react'

interface BreadcrumbData {
  label: string
  to?: string
}

const KEYBOARD_SHORTCUTS = [
  { keys: ['⌘', 'S'], description: 'Save entry' },
  { keys: ['⌘', '⇧', 'P'], description: 'Publish entry' },
  { keys: ['⌘', 'K'], description: 'Quick search' },
  { keys: ['Esc'], description: 'Close modal/panel' },
]

const HELP_RESOURCES = [
  { label: 'Documentation', url: 'https://docs.convex.dev', icon: Book },
  { label: 'API Reference', url: 'https://docs.convex.dev/api', icon: Code },
  { label: 'Community Discord', url: 'https://discord.gg/convex', icon: MessageSquare },
]

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/content': 'Content',
  '/media': 'Media Library',
  '/content-types': 'Content Types',
  '/settings': 'Settings',
  '/taxonomies': 'Taxonomies',
  '/trash': 'Trash',
  '/entries': 'Entries',
  '/entries/type': 'Content Types',
  '/entries/new': 'New Entry',
}

function getBreadcrumbs(
  pathname: string,
  appName: string,
  overrides: Map<string, string>
): BreadcrumbData[] {
  const breadcrumbs: BreadcrumbData[] = [{ label: appName, to: '/' }]

  if (pathname === '/') {
    return breadcrumbs
  }

  const segments = pathname.split('/').filter(Boolean)
  let currentPath = ''

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1

    // Check for dynamic overrides first, then static labels, then fallback
    let label = overrides.get(currentPath) ?? routeLabels[currentPath]
    if (!label) {
      label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    }

    if (isLast) {
      breadcrumbs.push({ label })
    } else {
      breadcrumbs.push({ label, to: currentPath })
    }
  })

  return breadcrumbs
}

export function Header() {
  const routerState = useRouterState()
  const navigate = useNavigate()
  const { branding } = useAdminConfig()

  let overrides = new Map<string, string>()
  try {
    const breadcrumbContext = useBreadcrumbContext()
    overrides = breadcrumbContext.overrides
  } catch {
    // BreadcrumbProvider not available, use empty overrides
  }

  const breadcrumbs = getBreadcrumbs(routerState.location.pathname, branding.appName, overrides)

  let user = null
  let role = null
  let logout = async () => {}
  let isAuthenticated = false

  try {
    const auth = useAuth()
    user = auth.user
    role = auth.role
    logout = auth.logout
    isAuthenticated = auth.isAuthenticated
  } catch {
    // AuthProvider not available
  }

  const roleDefinition = role ? getRole(role) : null
  const roleDisplayName = roleDefinition?.displayName ?? role ?? 'No Role'
  const userDisplayName = user?.name ?? user?.email ?? 'User'

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const userInitials = user?.name ? getInitials(user.name) : 'U'

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.to ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to} className="flex items-center gap-1.5">
                      {index === 0 && <Home className="size-3.5" />}
                      <span>{crumb.label}</span>
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <Bell className="size-4" />
              <span className="sr-only">Notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="flex items-center justify-between pb-2">
              <h4 className="font-medium">Notifications</h4>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-muted-foreground">You're all caught up!</p>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <HelpCircle className="size-4" />
              <span className="sr-only">Help</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="pb-2">
              <h4 className="font-medium">Help & Resources</h4>
            </div>
            <div className="space-y-4">
              <div>
                <h5 className="mb-2 text-xs font-medium text-muted-foreground">Keyboard Shortcuts</h5>
                <div className="space-y-1">
                  {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{shortcut.description}</span>
                      <div className="flex gap-0.5">
                        {shortcut.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="mb-2 text-xs font-medium text-muted-foreground">Resources</h5>
                <div className="space-y-1">
                  {HELP_RESOURCES.map((resource) => (
                    <a
                      key={resource.label}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <resource.icon className="size-4 text-muted-foreground" />
                      <span className="flex-1">{resource.label}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 pl-2 pr-3">
              <Avatar className="size-6">
                <AvatarImage src={user?.avatarUrl} alt={userDisplayName} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{userDisplayName}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userDisplayName}</p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
                <p className="text-xs text-muted-foreground">{roleDisplayName}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: '/settings' })}>
              <User className="mr-2 size-4" />
              <span>Profile & Settings</span>
            </DropdownMenuItem>
            {isAuthenticated && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
