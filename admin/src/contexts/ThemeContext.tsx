import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  canToggleDarkMode: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'convex-cms-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function getParentDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export interface ThemeProviderProps {
  children: ReactNode
  themeMode?: 'isolated' | 'inherit'
  darkModeControl?: 'independent' | 'follow-parent'
}

export function ThemeProvider({
  children,
  themeMode = 'isolated',
  darkModeControl = 'independent',
}: ThemeProviderProps) {
  const canToggleDarkMode = themeMode === 'isolated' || darkModeControl === 'independent'
  const shouldFollowParent = themeMode === 'inherit' && darkModeControl === 'follow-parent'

  const [theme, setThemeState] = useState<Theme>(() => {
    if (shouldFollowParent) {
      return getParentDarkMode() ? 'dark' : 'light'
    }
    return getStoredTheme()
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (shouldFollowParent) {
      return getParentDarkMode() ? 'dark' : 'light'
    }
    const stored = getStoredTheme()
    return stored === 'system' ? getSystemTheme() : stored
  })

  const applyTheme = useCallback((newTheme: Theme) => {
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme
    setResolvedTheme(resolved)

    if (canToggleDarkMode) {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    }
  }, [canToggleDarkMode])

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (!canToggleDarkMode) return

      setThemeState(newTheme)
      localStorage.setItem(STORAGE_KEY, newTheme)
      applyTheme(newTheme)
    },
    [applyTheme, canToggleDarkMode]
  )

  useEffect(() => {
    if (!shouldFollowParent) {
      applyTheme(theme)
    }
  }, [theme, applyTheme, shouldFollowParent])

  useEffect(() => {
    if (!shouldFollowParent) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = () => {
        if (theme === 'system') {
          applyTheme('system')
        }
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, applyTheme, shouldFollowParent])

  useEffect(() => {
    if (!shouldFollowParent) return

    const handleParentThemeChange = () => {
      const isDark = getParentDarkMode()
      const newTheme = isDark ? 'dark' : 'light'
      setThemeState(newTheme)
      setResolvedTheme(newTheme)
    }

    handleParentThemeChange()

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          handleParentThemeChange()
          break
        }
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [shouldFollowParent])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, canToggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
