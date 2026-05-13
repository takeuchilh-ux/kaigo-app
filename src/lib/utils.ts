import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

export function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return `¥${amount.toLocaleString('ja-JP')}`
}

export const STATUS_LABELS: Record<string, string> = {
  scheduled: '予約済',
  in_progress: '輸送中',
  completed: '完了',
  cancelled: 'キャンセル',
}

export const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const TRIP_TYPE_LABELS: Record<string, string> = {
  one_way: '片道',
  round_trip: '往復',
}
