'use client'
import { useRef, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import jaLocale from '@fullcalendar/core/locales/ja'
import type { EventClickArg, DateSelectArg, EventContentArg } from '@fullcalendar/core'
import { useRouter } from 'next/navigation'
import type { Reservation, Driver, UserRole } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, formatTime } from '@/lib/utils'
import { ReservationDetailModal } from './reservation-detail-modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface CalendarViewProps {
  reservations: (Reservation & { clients?: { name: string } | null; drivers?: { name: string; color: string } | null; vehicles?: { vehicle_type: string } | null })[]
  drivers: Driver[]
  role: UserRole
  driverId: string | null
}

export function CalendarView({ reservations, drivers, role, driverId }: CalendarViewProps) {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const displayReservations = role === 'driver' && driverId
    ? reservations.filter(r => r.driver_id === driverId)
    : reservations

  const events = displayReservations.map(r => ({
    id: r.id,
    title: r.clients?.name ?? '利用者未設定',
    start: `${r.reservation_date}T${r.departure_time}`,
    end: r.return_time ? `${r.reservation_date}T${r.return_time}` : undefined,
    backgroundColor: r.drivers?.color ?? '#3B82F6',
    borderColor: r.drivers?.color ?? '#3B82F6',
    extendedProps: { reservation: r },
  }))

  const handleEventClick = useCallback((info: EventClickArg) => {
    const reservation = info.event.extendedProps.reservation as Reservation
    setSelectedReservation(reservation)
    setModalOpen(true)
  }, [])

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    if (role === 'driver') return
    const dateStr = selectInfo.startStr.split('T')[0]
    const timeStr = selectInfo.startStr.includes('T') ? selectInfo.startStr.split('T')[1].slice(0, 5) : '09:00'
    router.push(`/reservations/new?date=${dateStr}&time=${timeStr}`)
  }, [role, router])

  function renderEventContent(info: EventContentArg) {
    const r = info.event.extendedProps.reservation as Reservation
    return (
      <div className="p-0.5 text-xs overflow-hidden">
        <div className="font-medium truncate">{info.event.title}</div>
        {info.view.type !== 'dayGridMonth' && (
          <div className="truncate opacity-80">{r.drivers?.name ?? ''}</div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Driver legend */}
      {role !== 'driver' && drivers.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-100">
          {drivers.map(d => (
            <div key={d.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              {d.name}
            </div>
          ))}
        </div>
      )}

      {role !== 'driver' && (
        <div className="flex justify-end mb-3">
          <Button size="sm" onClick={() => router.push('/reservations/new')}>
            <Plus className="w-4 h-4" />
            予約作成
          </Button>
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        locale={jaLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        buttonText={{
          today: '今日',
          month: '月',
          week: '週',
          day: '日',
          list: '一覧',
        }}
        events={events}
        eventClick={handleEventClick}
        selectable={role !== 'driver'}
        select={handleDateSelect}
        eventContent={renderEventContent}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        nowIndicator
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
      />

      <ReservationDetailModal
        reservation={selectedReservation}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        role={role}
        onStatusUpdate={() => {
          setModalOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
