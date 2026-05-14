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
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarViewProps {
  reservations: (Reservation & { clients?: { name: string } | null; drivers?: { name: string; color: string } | null; vehicles?: { vehicle_type: string } | null })[]
  drivers: Driver[]
  role: UserRole
  driverId: string | null
}

const VIEWS = [
  { key: 'dayGridMonth', label: '月' },
  { key: 'timeGridWeek', label: '週' },
  { key: 'timeGridDay', label: '日' },
  { key: 'listWeek', label: '一覧' },
] as const

export function CalendarView({ reservations, drivers, role, driverId }: CalendarViewProps) {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentView, setCurrentView] = useState<string>('dayGridMonth')
  const [title, setTitle] = useState('')

  const displayReservations = role === 'driver' && driverId
    ? reservations.filter(r => r.driver_id === driverId)
    : reservations

  const events = displayReservations.map(r => ({
    id: r.id,
    title: r.clients?.name ?? '利用者未設定',
    start: `${r.reservation_date}T${r.departure_time}`,
    end: r.return_time ? `${r.reservation_date}T${r.return_time}` : undefined,
    backgroundColor: r.drivers?.color ?? '#1a73e8',
    borderColor: 'transparent',
    textColor: '#fff',
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
    const isMonth = info.view.type === 'dayGridMonth'
    return (
      <div className="px-1.5 py-0.5 text-xs overflow-hidden w-full rounded-sm" style={{ backgroundColor: info.event.backgroundColor }}>
        <div className="font-medium truncate text-white">
          {!isMonth && <span className="opacity-90 mr-1">{formatTime(r.departure_time)}</span>}
          {info.event.title}
        </div>
        {!isMonth && r.drivers?.name && (
          <div className="truncate text-white/80 text-[10px]">{r.drivers.name}</div>
        )}
      </div>
    )
  }

  function navigate(dir: 'prev' | 'next' | 'today') {
    const api = calendarRef.current?.getApi()
    if (!api) return
    if (dir === 'prev') api.prev()
    else if (dir === 'next') api.next()
    else api.today()
    setTitle(api.view.title)
  }

  function switchView(view: string) {
    const api = calendarRef.current?.getApi()
    if (!api) return
    api.changeView(view)
    setCurrentView(view)
    setTitle(api.view.title)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Google Calendar-style header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        {/* Left: nav + title */}
        <div className="flex items-center gap-2">
          {/* Today button */}
          <button
            onClick={() => navigate('today')}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
          >
            今日
          </button>
          <button
            onClick={() => navigate('prev')}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-medium text-gray-800 ml-1 min-w-[140px]">{title}</h2>
        </div>

        {/* Right: view switcher + add button */}
        <div className="flex items-center gap-2">
          {/* View switcher pills */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {VIEWS.map(v => (
              <button
                key={v.key}
                onClick={() => switchView(v.key)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentView === v.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {role !== 'driver' && (
            <Button size="sm" onClick={() => router.push('/reservations/new')} className="gap-1">
              <Plus className="w-4 h-4" />
              予約作成
            </Button>
          )}
        </div>
      </div>

      {/* Driver legend */}
      {role !== 'driver' && drivers.length > 0 && (
        <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
          {drivers.map(d => (
            <div key={d.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              {d.name}
            </div>
          ))}
        </div>
      )}

      {/* FullCalendar — all native toolbar hidden, we use our own above */}
      <div className="fc-google-style">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          locale={jaLocale}
          headerToolbar={false}
          datesSet={(info) => {
            setTitle(info.view.title)
            setCurrentView(info.view.type)
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
          dayMaxEvents={4}
          moreLinkText={(n) => `+${n}件`}
        />
      </div>

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

      <style>{`
        .fc-google-style .fc-theme-standard th {
          background: #fff;
          border-color: #e5e7eb;
          padding: 8px 0;
          font-size: 11px;
          font-weight: 500;
          color: #70757a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .fc-google-style .fc-theme-standard td,
        .fc-google-style .fc-theme-standard .fc-scrollgrid {
          border-color: #e5e7eb;
        }
        .fc-google-style .fc-daygrid-day-number {
          font-size: 12px;
          color: #70757a;
          padding: 4px 8px;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px;
          text-decoration: none !important;
        }
        .fc-google-style .fc-day-today .fc-daygrid-day-number {
          background-color: #1a73e8;
          color: #fff !important;
          font-weight: 600;
        }
        .fc-google-style .fc-day-today {
          background-color: rgba(26, 115, 232, 0.04) !important;
        }
        .fc-google-style .fc-event {
          border: none !important;
          border-radius: 4px;
          box-shadow: none;
        }
        .fc-google-style .fc-event:hover {
          filter: brightness(0.92);
        }
        .fc-google-style .fc-daygrid-event-dot {
          display: none;
        }
        .fc-google-style .fc-list-event:hover td {
          background: #f1f3f4;
        }
        .fc-google-style .fc-list-day-cushion {
          background: #f8f9fa;
          font-size: 12px;
          font-weight: 600;
          color: #70757a;
        }
        .fc-google-style .fc-timegrid-slot {
          height: 48px;
          border-color: #e5e7eb;
        }
        .fc-google-style .fc-timegrid-slot-label {
          font-size: 10px;
          color: #70757a;
        }
        .fc-google-style .fc-now-indicator-line {
          border-color: #ea4335;
        }
        .fc-google-style .fc-now-indicator-arrow {
          border-top-color: #ea4335;
          border-bottom-color: #ea4335;
        }
        .fc-google-style .fc-more-link {
          color: #1a73e8;
          font-size: 11px;
          font-weight: 500;
        }
        .fc-google-style .fc-col-header-cell-cushion {
          text-decoration: none !important;
          color: #70757a;
        }
      `}</style>
    </div>
  )
}
