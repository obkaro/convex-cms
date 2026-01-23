import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import { X, ArrowRight, Plus, Minus, RefreshCw, GitCompare } from 'lucide-react'
import { cn } from '~/lib/cn'

interface VersionCompareProps {
  entryId: string
  fromVersion: number
  toVersion: number
  onClose: () => void
  onRollback: (version: number) => void
}

interface FieldDiff {
  field: string
  fromValue: unknown
  toValue: unknown
  changeType: 'added' | 'removed' | 'modified'
}

interface VersionInfo {
  versionNumber: number
  status: string
  slug: string
  wasPublished: boolean
  createdAt: number
}

interface ComparisonResult {
  hasChanges: boolean
  fromVersion: VersionInfo
  toVersion: VersionInfo
  changedFields: string[]
  fieldDiffs: FieldDiff[]
  slugChanged: boolean
  statusChanged: boolean
  changeSummary: string
}

export function VersionCompare({
  entryId,
  fromVersion,
  toVersion,
  onClose,
  onRollback,
}: VersionCompareProps) {
  const comparisonQuery = useQuery(api.versions.compare, {
    entryId,
    fromVersionNumber: fromVersion,
    toVersionNumber: toVersion,
  })

  const isLoading = comparisonQuery === undefined
  const comparison = comparisonQuery as ComparisonResult | null

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '(empty)'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return <Plus className="size-3" />
      case 'removed':
        return <Minus className="size-3" />
      case 'modified':
        return <RefreshCw className="size-3" />
      default:
        return null
    }
  }

  const getChangeStyles = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return 'border-emerald-200 bg-emerald-50'
      case 'removed':
        return 'border-red-200 bg-red-50'
      case 'modified':
        return 'border-amber-200 bg-amber-50'
      default:
        return 'border-border bg-card'
    }
  }

  const getChangeIconStyles = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return 'bg-emerald-100 text-emerald-700'
      case 'removed':
        return 'bg-red-100 text-red-700'
      case 'modified':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <GitCompare className="size-4 text-muted-foreground" />
          <h3 className="font-semibold">
            Comparing v{fromVersion} → v{toVersion}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close comparison"
        >
          <X className="size-4" />
        </button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Loading comparison...
              </p>
            </div>
          ) : !comparison ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Could not load version comparison
            </div>
          ) : !comparison.hasChanges ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No differences found between these versions
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-center gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="text-center">
                  <Badge variant="secondary" className="font-mono">
                    v{comparison.fromVersion.versionNumber}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(comparison.fromVersion.createdAt)}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
                <div className="text-center">
                  <Badge variant="secondary" className="font-mono">
                    v{comparison.toVersion.versionNumber}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(comparison.toVersion.createdAt)}
                  </p>
                </div>
              </div>

              {comparison.changeSummary && (
                <p className="mb-4 text-sm text-muted-foreground">
                  {comparison.changeSummary}
                </p>
              )}

              <div className="space-y-3">
                {comparison.fieldDiffs.map((change, index) => (
                  <div
                    key={index}
                    className={cn(
                      'rounded-lg border p-3',
                      getChangeStyles(change.changeType)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex size-5 items-center justify-center rounded',
                          getChangeIconStyles(change.changeType)
                        )}
                      >
                        {getChangeIcon(change.changeType)}
                      </span>
                      <span className="font-medium text-foreground">
                        {change.field}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {change.changeType}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-2">
                      {change.changeType !== 'added' && (
                        <div className="rounded border border-red-200 bg-white p-2">
                          <p className="mb-1 text-xs font-medium text-red-700">
                            Before:
                          </p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-red-900">
                            {formatValue(change.fromValue)}
                          </pre>
                        </div>
                      )}
                      {change.changeType !== 'removed' && (
                        <div className="rounded border border-emerald-200 bg-white p-2">
                          <p className="mb-1 text-xs font-medium text-emerald-700">
                            After:
                          </p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-emerald-900">
                            {formatValue(change.toValue)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between border-t px-4 py-3">
        <CmsButton variant="outline" onClick={onClose}>
          Back to History
        </CmsButton>
        <CmsButton variant="ghost" onClick={() => onRollback(fromVersion)}>
          Rollback to v{fromVersion}
        </CmsButton>
      </div>
    </div>
  )
}
