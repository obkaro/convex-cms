import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { VersionCompare } from './VersionCompare'
import { VersionRollbackModal } from './VersionRollbackModal'
import { CmsButton } from '~/components/cmsds/CmsButton'
import { CmsStatusBadge } from '~/components/cmsds/CmsStatusBadge'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import { X, CheckCircle, History } from 'lucide-react'
import { cn } from '~/lib/cn'

interface VersionHistoryProps {
  entryId: string
  currentVersion: number
  onRollbackComplete?: () => void
  onClose: () => void
}

interface VersionItem {
  _id: string
  versionNumber: number
  changeDescription?: string
  createdBy?: string
  _creationTime: number
  status: string
  data: Record<string, unknown>
  wasPublished?: boolean
}

export function VersionHistory({
  entryId,
  currentVersion,
  onRollbackComplete,
  onClose,
}: VersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<
    [number, number] | null
  >(null)
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [rollbackError, setRollbackError] = useState<string | null>(null)
  const [rollbackSuccess, setRollbackSuccess] = useState(false)

  const versionsQuery = useQuery(api.admin.getVersionHistory, {
    entryId,
    paginationOpts: { numItems: 50, cursor: null },
  })

  const rollbackMutation = useMutation(api.admin.rollbackVersion)

  const versions = (versionsQuery?.page ?? []) as VersionItem[]
  const isLoading = versionsQuery === undefined

  const handleCompare = useCallback(
    (fromVersion: number, toVersion: number) => {
      setSelectedVersions([fromVersion, toVersion])
    },
    []
  )

  const handleRollback = useCallback((versionNumber: number) => {
    setRollbackTarget(versionNumber)
    setRollbackError(null)
  }, [])

  const handleConfirmRollback = useCallback(async () => {
    if (rollbackTarget === null) return

    setIsRollingBack(true)
    setRollbackError(null)

    try {
      await rollbackMutation({
        entryId,
        versionNumber: rollbackTarget,
      })
      setRollbackTarget(null)
      setRollbackSuccess(true)
      setTimeout(() => {
        setRollbackSuccess(false)
        onRollbackComplete?.()
      }, 1500)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to rollback'
      setRollbackError(message)
    } finally {
      setIsRollingBack(false)
    }
  }, [entryId, rollbackTarget, rollbackMutation, onRollbackComplete])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Render compare view or history list - keep outer container stable to avoid DOM issues
  if (selectedVersions) {
    return (
      <div className="flex h-full flex-col border-l bg-background">
        <VersionCompare
          entryId={entryId}
          fromVersion={selectedVersions[0]}
          toVersion={selectedVersions[1]}
          onClose={() => setSelectedVersions(null)}
          onRollback={(version) => {
            setSelectedVersions(null)
            handleRollback(version)
          }}
        />
        {rollbackTarget !== null && (
          <VersionRollbackModal
            targetVersion={rollbackTarget}
            currentVersion={currentVersion}
            isLoading={isRollingBack}
            error={rollbackError}
            onConfirm={handleConfirmRollback}
            onCancel={() => {
              setRollbackTarget(null)
              setRollbackError(null)
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h3 className="font-semibold">Version History</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close version history"
        >
          <X className="size-4" />
        </button>
      </div>

      {rollbackSuccess && (
        <div className="flex items-center gap-2 border-b bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle className="size-4" />
          Successfully rolled back to previous version
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Loading versions...
              </p>
            </div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Save changes to start building version history
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => {
                const isCurrent = version.versionNumber === currentVersion
                const prevVersion = versions[index + 1]

                return (
                  <div
                    key={version._id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      isCurrent ? 'border-primary/50 bg-primary/5' : 'bg-card'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          v{version.versionNumber}
                        </Badge>
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="border-primary/50 text-primary"
                          >
                            Current
                          </Badge>
                        )}
                        {version.wasPublished && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/50 text-emerald-600"
                          >
                            Published
                          </Badge>
                        )}
                      </div>
                      <CmsStatusBadge
                        status={
                          version.status as
                            | 'draft'
                            | 'published'
                            | 'scheduled'
                            | 'archived'
                        }
                      />
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      <span>{formatDate(version._creationTime)}</span>
                      {version.createdBy && (
                        <span className="ml-2">by {version.createdBy}</span>
                      )}
                    </div>

                    {version.changeDescription && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {version.changeDescription}
                      </p>
                    )}

                    <div className="mt-3 flex gap-2">
                      {prevVersion && (
                        <CmsButton
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCompare(
                              prevVersion.versionNumber,
                              version.versionNumber
                            )
                          }
                        >
                          Compare with v{prevVersion.versionNumber}
                        </CmsButton>
                      )}
                      {!isCurrent && (
                        <CmsButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRollback(version.versionNumber)}
                        >
                          Rollback
                        </CmsButton>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {rollbackTarget !== null && (
        <VersionRollbackModal
          targetVersion={rollbackTarget}
          currentVersion={currentVersion}
          isLoading={isRollingBack}
          error={rollbackError}
          onConfirm={handleConfirmRollback}
          onCancel={() => {
            setRollbackTarget(null)
            setRollbackError(null)
          }}
        />
      )}
    </div>
  )
}
