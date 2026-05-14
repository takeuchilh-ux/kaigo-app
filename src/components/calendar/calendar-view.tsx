'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import jaLocale from '@fullcalendar/core/locales/ja'
import type { EventClickArg, DateSelectArg, EventContentArg } from '@fullcalendar/core'
import { useRouter } from 'next/navigation'
import type { Reservation, Driver, UserRole } from '@/types'
import { formatTime } from '@/lib/utils'
import { ReservationDetailModal } from './reservation-detail-modal'
import { Button } from '@/components/ui/button'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarViewProps {
  reservations: (Reservation & { clients?: { name: string } | null; drivers?: { name: string; color: string } | null; vehicles?: { vehicle_type: string } | null })[]
  drivers: Driver[]
  role: UserRole
  driverId: string | null
}

const DESKTOP_VIEWS = [
  { key: 'dayGridMonth', label: '月' },
  { key: 'timeGridWeek', label: '週' },
  { key: 'timeGridDay', label: '日' },
  { key: 'listWeek', label: '一覧' },
] as const

// モバイル: 月=dayGridMonth / 週=listWeek / 日=listDay
const MOBILE_VIEWS = [
  { key: 'dayGridMonth', label: '月' },
  { key: 'listWeek',    label: '週' },
  { key: 'listDay',     label: '日' },
] as const

export function CalendarView({ reservations, drivers, role, driverId }: CalendarViewProps) {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentView, setCurrentView] = useState<string>('dayGridMonth')
  const [title, setTitle] = useState('')

  // モバイル判定 — リサイズ対応
  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
      <div className="px-1 py-0.5 text-xs overflow-hidden w-full rounded-sm" style={{ backgroundColor: info.event.backgroundColor }}>
        <div className="font-medium truncate text-white leading-tight">
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

  const views = isMobile ? MOBILE_VIEWS : DESKTOP_VIEWS

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
      {/* ヘッダー */}
      <div className="flex items-center gap-1.5 px-2 sm:px-4 py-2.5 border-b border-gray-100 flex-wrap">
        {/* 左: ナビ */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <button
            onClick={() => navigate('today')}
            className="px-2 py-1 text-xs sm:text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 whitespace-nowrap"
          >
            今日
          </button>
          <button onClick={() => navigate('prev')} className="p-1 rounded-full hover:bg-gray-100 text-gray-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('next')} className="p-1 rounded-full hover:bg-gray-100 text-gray-600">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-sm sm:text-base font-medium text-gray-800 ml-0.5 whitespace-nowrap">{title}</h2>
        </div>

        {/* 右: ビュー切替 + 予約作成 */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {views.map(v => (
              <button
                key={v.key}
                onClick={() => switchView(v.key)}
                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
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
            <button
              onClick={() => router.push('/reservations/new')}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>予約作成</span>
            </button>
          )}
        </div>
      </div>

      {/* ドライバー凡例 */}
      {role !== 'driver' && drivers.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 sm:px-4 py-1.5 border-b border-gray-100 bg-gray-50/50">
          {drivers.map(d => (
            <div key={d.id} className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="truncate max-w-[80px] sm:max-w-none">{d.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* カレンダー本体 */}
      <div className="fc-google-style overflow-x-hidden">
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
          dayCellContent={(e) => ({ html: `<span class="fc-day-num">${e.date.getDate()}</span>` })}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayMaxEvents={2}
          moreLinkText={(n) => `+${n}件`}
          listDayFormat={{ month: 'numeric', day: 'numeric', weekday: 'short' }}
          listDaySideFormat={false}
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
        /* 曜日ヘッダー */
        .fc-google-style .fc-theme-standard th {
          background: #fff;
          border-color: #e5e7eb;
          padding: 4px 0;
          font-size: 10px;
          font-weight: 500;
          color: #70757a;
          text-transform: uppercase;
        }
        .fc-google-style .fc-theme-standard td,
        .fc-google-style .fc-theme-standard .fc-scrollgrid {
          border-color: #e5e7eb;
        }

        /* 日付数字 */
        .fc-google-style .fc-daygrid-day-top {
          justify-content: flex-end;
          padding: 1px 2px;
        }
        .fc-google-style .fc-daygrid-day-number { padding: 0; text-decoration: none !important; }
        .fc-google-style .fc-day-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 11px;
          color: #70757a;
          margin: 2px;
        }
        .fc-google-style .fc-day-today .fc-day-num {
          background-color: #1a73e8;
          color: #fff !important;
          font-weight: 600;
        }
        .fc-google-style .fc-day-today { background-color: rgba(26,115,232,0.04) !important; }

        /* イベント */
        .fc-google-style .fc-event { border: none !important; border-radius: 3px; cursor: pointer; }
        .fc-google-style .fc-event:hover { filter: brightness(0.92); }
        .fc-google-style .fc-daygrid-event-dot { display: none; }
        .fc-google-style .fc-more-link { color: #1a73e8; font-size: 10px; font-weight: 500; }

        /* 月グリッド セル高さ */
        .fc-google-style .fc-daygrid-day-frame { min-height: 52px; }

        /* タイムグリッド */
        .fc-google-style .fc-timegrid-slot { height: 40px; border-color: #e5e7eb; }
        .fc-google-style .fc-timegrid-slot-label { font-size: 10px; color: #70757a; }
        .fc-google-style .fc-now-indicator-line { border-color: #ea4335; }
        .fc-google-style .fc-now-indicator-arrow { border-top-color: #ea4335; border-bottom-color: #ea4335; }

        /* リスト表示 */
        .fc-google-style .fc-list-event:hover td { background: #f1f3f4; }
        .fc-google-style .fc-list-day-cushion {
          background: #f8f9fa;
          font-size: 11px;
          font-weight: 600;
          color: #3c4043;
          padding: 5px 10px;
        }
        .fc-google-style .fc-list-event td { padding: 7px 10px; font-size: 12px; }
        .fc-google-style .fc-list-event-dot { display: none; }
        .fc-google-style .fc-list-empty { background:#fff; color:#70757a; font-size:12px; }
        .fc-google-style .fc-col-header-cell-cushion { text-decoration:none !important; color:#70757a; }

        /* スマホ専用コンパクト */
        @media (max-width: 767px) {
          .fc-google-style .fc-daygrid-day-frame { min-height: 44px; }
          .fc-google-style .fc-day-num { width: 18px; height: 18px; font-size: 10px; margin: 1px; }
          .fc-google-style .fc-daygrid-event { margin: 0 1px 1px; }
          .fc-google-style .fc-timegrid-slot { height: 32px; }
          .fc-google-style .fc-scrollgrid-sync-table { width: 100% !important; }
          /* 月グリッドを画面幅に強制フィット */
          .fc-google-style .fc-daygrid-body { width: 100% !important; }
          .fc-google-style table { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}
