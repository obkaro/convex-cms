import { useState, useRef, useEffect } from 'react'
import { useRouterState, useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import { getRole } from '../../../src/component/roles'

interface Breadcrumb {
  label: string
  to?: string
}

// Keyboard shortcuts for the help panel
const KEYBOARD_SHORTCUTS = [
  { keys: ['⌘', 'S'], description: 'Save entry' },
  { keys: ['⌘', '⇧', 'P'], description: 'Publish entry' },
  { keys: ['⌘', 'K'], description: 'Quick search' },
  { keys: ['Esc'], description: 'Close modal/panel' },
]

// Help resources
const HELP_RESOURCES = [
  { label: 'Documentation', url: 'https://docs.convex.dev', icon: 'book' },
  { label: 'API Reference', url: 'https://docs.convex.dev/api', icon: 'code' },
  { label: 'Community Discord', url: 'https://discord.gg/convex', icon: 'chat' },
]

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
  const navigate = useNavigate()
  const breadcrumbs = getBreadcrumbs(routerState.location.pathname)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const helpPanelRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Try to use auth context, but gracefully handle if not available
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
    // AuthProvider not available, use defaults
  }

  // Get role display name
  const roleDefinition = role ? getRole(role) : null
  const roleDisplayName = roleDefinition?.displayName ?? role ?? 'No Role'

  // Get user display name
  const userDisplayName = user?.name ?? user?.email ?? 'User'

  // Get user initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const userInitials = user?.name ? getInitials(user.name) : 'U'

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (helpPanelRef.current && !helpPanelRef.current.contains(event.target as Node)) {
        setIsHelpPanelOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close help panel with Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHelpPanelOpen(false)
        setIsNotificationsOpen(false)
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle logout
  const handleLogout = async () => {
    setIsUserMenuOpen(false)
    await logout()
  }

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
        {/* Notifications Dropdown */}
        <div className="header-dropdown-container" ref={notificationsRef}>
          <button
            className="header-action"
            title="Notifications"
            aria-label="View notifications"
            aria-expanded={isNotificationsOpen}
            aria-haspopup="true"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            data-testid="notifications-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>

          {isNotificationsOpen && (
            <div className="header-dropdown notifications-dropdown" data-testid="notifications-dropdown">
              <div className="header-dropdown-header">
                <h3>Notifications</h3>
              </div>
              <div className="header-dropdown-divider" />
              <div className="notifications-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                <p>No notifications yet</p>
                <span>You're all caught up!</span>
              </div>
            </div>
          )}
        </div>

        {/* Help Panel */}
        <div className="header-dropdown-container" ref={helpPanelRef}>
          <button
            className="header-action"
            title="Help"
            aria-label="Get help"
            aria-expanded={isHelpPanelOpen}
            aria-haspopup="true"
            onClick={() => setIsHelpPanelOpen(!isHelpPanelOpen)}
            data-testid="help-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {isHelpPanelOpen && (
            <div className="header-dropdown help-dropdown" data-testid="help-dropdown">
              <div className="header-dropdown-header">
                <h3>Help & Resources</h3>
              </div>
              <div className="header-dropdown-divider" />

              <div className="help-section">
                <h4>Keyboard Shortcuts</h4>
                <ul className="shortcuts-list">
                  {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                    <li key={index} className="shortcut-item">
                      <span className="shortcut-description">{shortcut.description}</span>
                      <span className="shortcut-keys">
                        {shortcut.keys.map((key, keyIndex) => (
                          <kbd key={keyIndex}>{key}</kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="header-dropdown-divider" />

              <div className="help-section">
                <h4>Resources</h4>
                <ul className="resources-list">
                  {HELP_RESOURCES.map((resource, index) => (
                    <li key={index}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        {resource.icon === 'book' && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                        )}
                        {resource.icon === 'code' && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                          </svg>
                        )}
                        {resource.icon === 'chat' && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        )}
                        <span>{resource.label}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="external-link-icon">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="user-menu" ref={userMenuRef}>
          <button
            className="user-button"
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={isUserMenuOpen}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <div className="user-avatar" data-initials={userInitials}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={userDisplayName} className="user-avatar-img" />
              ) : (
                <span className="user-avatar-initials">{userInitials}</span>
              )}
            </div>
            <span className="user-name">{userDisplayName}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`chevron-icon ${isUserMenuOpen ? 'rotated' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isUserMenuOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-dropdown-avatar" data-initials={userInitials}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={userDisplayName} className="user-avatar-img" />
                  ) : (
                    <span className="user-avatar-initials">{userInitials}</span>
                  )}
                </div>
                <div className="user-dropdown-info">
                  <span className="user-dropdown-name">{userDisplayName}</span>
                  {user?.email && <span className="user-dropdown-email">{user.email}</span>}
                  <span className="user-dropdown-role">{roleDisplayName}</span>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              <div className="user-dropdown-menu">
                <button
                  className="user-dropdown-item"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    navigate({ to: '/settings' })
                  }}
                  data-testid="profile-button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Profile & Settings</span>
                </button>

                {isAuthenticated && (
                  <button className="user-dropdown-item user-dropdown-item--danger" onClick={handleLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
