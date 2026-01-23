import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'

interface BreadcrumbContextValue {
  overrides: Map<string, string>
  setOverride: (path: string, label: string) => void
  clearOverride: (path: string) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map())

  const setOverride = useCallback((path: string, label: string) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(path, label)
      return next
    })
  }, [])

  const clearOverride = useCallback((path: string) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.delete(path)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ overrides, setOverride, clearOverride }),
    [overrides, setOverride, clearOverride]
  )

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumbContext must be used within a BreadcrumbProvider')
  }
  return context
}
