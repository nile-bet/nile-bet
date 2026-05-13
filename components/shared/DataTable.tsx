'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { SkeletonTableRow }
  from './SkeletonCard'
import { EmptyState } from './EmptyState'
import { FileX } from 'lucide-react'

export interface Column<T = unknown> {
  key: string
  label: string
  render?: (
    value: unknown,
    row: T
  ) => React.ReactNode
  sortable?: boolean
  width?: string
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  className?: string
  keyField?: string
}

export function DataTable<
  T extends Record<string, unknown>
>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data found',
  onRowClick,
  className,
  keyField = 'id',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<
    string | null
  >(null)
  const [sortDir, setSortDir] = useState<
    'asc' | 'desc'
  >('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) =>
        d === 'asc' ? 'desc' : 'asc'
      )
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av == null) return 1
    if (bv == null) return -1
    const cmp =
      typeof av === 'number' &&
      typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(
            String(bv)
          )
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div
      className={cn(
        'border border-nile-blue/30 rounded-xl overflow-hidden',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-dark border-b border-nile-blue/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wide whitespace-nowrap',
                    col.sortable &&
                      'cursor-pointer hover:text-white select-none',
                    col.width,
                    col.className
                  )}
                  onClick={() =>
                    col.sortable &&
                    handleSort(col.key)
                  }
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={cn(
                            'w-2.5 h-2.5',
                            sortKey === col.key &&
                              sortDir === 'asc'
                              ? 'text-gold'
                              : 'text-white/20'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'w-2.5 h-2.5 -mt-1',
                            sortKey === col.key &&
                              sortDir === 'desc'
                              ? 'text-gold'
                              : 'text-white/20'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td
                    colSpan={columns.length}
                    className="p-0"
                  >
                    <SkeletonTableRow />
                  </td>
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title="No data"
                    message={emptyMessage}
                    icon={FileX}
                  />
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={
                    (row[keyField] as string) ??
                    i
                  }
                  onClick={() =>
                    onRowClick?.(row)
                  }
                  className={cn(
                    'border-b border-nile-blue/20 transition-colors',
                    i % 2 === 0
                      ? 'bg-charcoal'
                      : 'bg-charcoal/60',
                    onRowClick &&
                      'cursor-pointer hover:bg-gold/5'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-white/80 whitespace-nowrap',
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(
                            row[col.key],
                            row
                          )
                        : (row[col.key] as
                            | string
                            | number
                            | null
                            | undefined) ??
                          '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}