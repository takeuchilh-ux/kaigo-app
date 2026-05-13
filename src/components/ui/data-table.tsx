'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: Column<T>[]
  onAdd?: () => void
  addLabel?: string
  onRowClick?: (row: T) => void
  searchKeys?: (keyof T)[]
  searchPlaceholder?: string
}

export function DataTable<T extends { id: string }>({
  data, columns, onAdd, addLabel = '新規追加', onRowClick, searchKeys = [], searchPlaceholder = '検索...'
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')

  const filtered = query
    ? data.filter(row =>
        searchKeys.some(key => String((row as any)[key] ?? '').toLowerCase().includes(query.toLowerCase()))
      )
    : data

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-100">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4" />
            {addLabel}
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map(col => (
                <th key={String(col.key)} className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className ?? ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400 text-sm">
                  データがありません
                </td>
              </tr>
            ) : (
              filtered.map(row => (
                <tr
                  key={row.id}
                  className={onRowClick ? 'hover:bg-blue-50 cursor-pointer transition-colors' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={String(col.key)} className={`px-4 py-3 text-gray-700 ${col.className ?? ''}`}>
                      {col.render
                        ? col.render(row)
                        : String((row as any)[col.key] ?? '-')}
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
