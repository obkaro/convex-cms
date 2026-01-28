import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { CmsButton } from './CmsButton'
import { cn } from '~/lib/cn'

export interface CmsPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  className?: string
}

export function CmsPagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  className,
}: CmsPaginationProps) {
  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {showFirstLast && (
        <CmsButton
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" />
        </CmsButton>
      )}
      <CmsButton
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </CmsButton>
      <span className="px-3 text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <CmsButton
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </CmsButton>
      {showFirstLast && (
        <CmsButton
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          aria-label="Last page"
        >
          <ChevronsRight className="size-4" />
        </CmsButton>
      )}
    </div>
  )
}
