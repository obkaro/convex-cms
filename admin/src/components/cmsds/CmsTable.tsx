import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Checkbox } from '../ui/checkbox'
import { cn } from '../../lib/cn'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

export interface CmsTableColumn<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface CmsTableProps<T> {
  columns: CmsTableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string) => void
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
}

export function CmsTable<T>({
  columns,
  data,
  getRowId,
  selectable,
  selectedIds = new Set(),
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  emptyMessage = 'No items found',
  className,
}: CmsTableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => selectedIds.has(getRowId(row)))
  const someSelected = data.some((row) => selectedIds.has(getRowId(row)))

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      onSelectionChange(new Set(data.map(getRowId)))
    } else {
      onSelectionChange(new Set())
    }
  }

  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (!onSelectionChange) return
    const newSelection = new Set(selectedIds)
    if (checked) {
      newSelection.add(rowId)
    } else {
      newSelection.delete(rowId)
    }
    onSelectionChange(newSelection)
  }

  const renderSortIcon = (column: CmsTableColumn<T>) => {
    if (!column.sortable) return null
    if (sortColumn !== column.key) {
      return <ChevronsUpDown className="ml-1 inline size-3.5 text-muted-foreground" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 inline size-3.5" />
    ) : (
      <ChevronDown className="ml-1 inline size-3.5" />
    )
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.sortable && 'cursor-pointer select-none',
                  column.className
                )}
                onClick={() => column.sortable && onSort?.(column.key)}
              >
                {column.header}
                {renderSortIcon(column)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const rowId = getRowId(row)
              const isSelected = selectedIds.has(rowId)

              return (
                <TableRow
                  key={rowId}
                  data-state={isSelected && 'selected'}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="w-12"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectRow(rowId, checked === true)
                        }
                        aria-label={`Select row ${rowId}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
