import { useEffect } from 'react'
import { useBreadcrumbContext } from '~/contexts/BreadcrumbContext'

export function useBreadcrumbLabel(path: string, label: string | undefined) {
  const { setOverride, clearOverride } = useBreadcrumbContext()

  useEffect(() => {
    if (label) {
      setOverride(path, label)
    }
    return () => {
      clearOverride(path)
    }
  }, [path, label, setOverride, clearOverride])
}
