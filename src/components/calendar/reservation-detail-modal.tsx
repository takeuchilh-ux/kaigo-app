'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import type { Reservation, UserRole } from '@/types'
import { STATUS_LABELS, TRIP_TYPE_LABELS, formatDate, formatTime, formatAmount } from '@/lib/utils'
import { Edit, MapPin, User, Car, Clock, Phone, Copy } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  reservation: Reservation | null
  open: boolean
  onClose: () => void
  role: UserRole
  onStatusUpdate: () => void
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: '予約済' },
  { value: 'in_progress', label: '輸送中' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
]

export function ReservationDetailModal({ reservation, open, onClose, role, onStatusUpdate }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState(reservation?.status ?? 'scheduled')
  const [cancelReason, setCancelReason] = useState(reservation?.cancel_reason ?? '')
  const [saving, setSaving] = useState(false)

  if (!reservation) return null

  const statusBadgeVariant: Record<string, any> = {
    scheduled: 'default',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'destructive',
  }

  async function handleStatusUpdate() {
    if (!reservation) return
    setSaving(true)
    const { error } = await supabase
      .from('reservations')
      .update({ status, cancel_reason: status === 'cancelled' ? cancelReason : null })
      .eq('id', reservation.id)
    setSaving(false)
    if (!error) onStatusUpdate()
  }

  async function handleCopy() {
    if (!reservation) return
    router.push(`/reservations/new?copy=${reservation.id}`)
    onClose()
  }

  const r = reservation as any

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>予約詳細</DialogTitle>
            <Badge variant={statusBadgeVariant[reservation.status]}>
              {STATUS_LABELS[reservation.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Date/time */}
          <div className="bg-blue-50 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 font-medium text-blue-900">
              <Clock className="w-4 h-4" />
              {formatDate(reservation.reservation_date)}
            </div>
            <div className="text-blue-700 pl-6">
              出発: {formatTime(reservation.departure_time)}
              {reservation.return_time && ` / 帰路: ${formatTime(reservation.return_time)}`}
              　{TRIP_TYPE_LABELS[reservation.trip_type]}
            </div>
          </div>

          {/* Client */}
          <div className="flex gap-2">
            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">利用者</p>
              <p className="font-medium">{r.clients?.name ?? '-'}</p>
            </div>
          </div>

          {/* Route */}
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-gray-500 text-xs">ルート</p>
              <p className="font-medium">{reservation.departure_address ?? '-'}</p>
              <p className="text-gray-400 text-xs">↓</p>
              <p className="font-medium">{reservation.destination_address ?? '-'}</p>
              {reservation.distance_km && (
                <p className="text-xs text-gray-500 mt-1">
                  {reservation.distance_km}km / 約{reservation.duration_minutes}分
                </p>
              )}
            </div>
          </div>

          {/* Driver & Vehicle */}
          <div className="flex gap-2">
            <Car className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">担当</p>
              <p className="font-medium">{r.drivers?.name ?? '-'} / {r.vehicles?.vehicle_type ?? '-'}</p>
            </div>
          </div>

          {/* Amount */}
          {reservation.estimated_amount && (
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-gray-600">見積金額</span>
              <span className="font-bold text-lg">{formatAmount(reservation.estimated_amount)}</span>
            </div>
          )}

          {/* Notes */}
          {reservation.notes && (
            <div className="bg-gray-50 rounded p-2 text-gray-600 text-xs">
              {reservation.notes}
            </div>
          )}

          {/* Status update (admin/driver) */}
          {(role === 'admin' || role === 'driver') && (
            <div className="border-t pt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>ステータス更新</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {status === 'cancelled' && (
                <div className="space-y-1.5">
                  <Label>キャンセル理由</Label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="キャンセル理由を入力..."
                    rows={2}
                  />
                </div>
              )}
              <Button className="w-full" onClick={handleStatusUpdate} disabled={saving}>
                {saving ? '保存中...' : 'ステータスを更新'}
              </Button>
            </div>
          )}

          {/* Admin actions */}
          {role === 'admin' && (
            <div className="flex gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { router.push(`/reservations/${reservation.id}`); onClose() }}
              >
                <Edit className="w-4 h-4" />
                編集
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
                <Copy className="w-4 h-4" />
                コピー作成
              </Button>
            </div>
          )}

          {/* Google Maps link */}
          {reservation.departure_address && reservation.destination_address && (
            <a
              href={`https://www.google.com/maps/dir/${encodeURIComponent(reservation.departure_address)}/${encodeURIComponent(reservation.destination_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs"
            >
              <MapPin className="w-3 h-3" />
              Google Mapsでルートを確認
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
