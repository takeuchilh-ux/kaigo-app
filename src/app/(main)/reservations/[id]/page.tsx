import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ReservationForm } from '@/components/reservation/reservation-form'

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const [reservationRes, clientsRes, driversRes, vehiclesRes, careAssistantsRes, destinationsRes, staffRes, cancelReasonsRes] =
    await Promise.all([
      supabase.from('reservations').select('*, route_stops(*)').eq('id', id).single(),
      supabase.from('clients').select('*').order('name'),
      supabase.from('drivers').select('*').order('name'),
      supabase.from('vehicles').select('*').order('vehicle_type'),
      supabase.from('care_assistants').select('*').order('name'),
      supabase.from('destinations').select('*').order('name'),
      supabase.from('staff_members').select('*').order('name'),
      supabase.from('master_options').select('*').eq('category', 'cancel_reason').order('sort_order'),
    ])

  if (!reservationRes.data) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">予約編集</h1>
      <ReservationForm
        reservation={reservationRes.data}
        clients={clientsRes.data ?? []}
        drivers={driversRes.data ?? []}
        vehicles={vehiclesRes.data ?? []}
        careAssistants={careAssistantsRes.data ?? []}
        destinations={destinationsRes.data ?? []}
        staffMembers={staffRes.data ?? []}
        cancelReasons={cancelReasonsRes.data ?? []}
      />
    </div>
  )
}
