import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/calendar/calendar-view'
import { redirect } from 'next/navigation'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, driver_id')
    .eq('id', user.id)
    .single()

  const role = roleData?.role ?? 'staff'
  const driverId = roleData?.driver_id ?? null

  const { data: reservations } = await supabase
    .from('reservations')
    .select(`
      *,
      clients(name),
      drivers(name, color),
      vehicles(vehicle_type)
    `)
    .order('reservation_date', { ascending: true })

  const { data: drivers } = await supabase
    .from('drivers')
    .select('*')
    .order('name')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">カレンダー</h1>
      </div>
      <CalendarView
        reservations={reservations ?? []}
        drivers={drivers ?? []}
        role={role as any}
        driverId={driverId}
      />
    </div>
  )
}
