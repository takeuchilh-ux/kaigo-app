import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReservationForm } from '@/components/reservation/reservation-form'

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; copy?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const [clientsRes, driversRes, vehiclesRes, careAssistantsRes, destinationsRes, staffRes, cancelReasonsRes] =
    await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('drivers').select('*').order('name'),
      supabase.from('vehicles').select('*').order('vehicle_type'),
      supabase.from('care_assistants').select('*').order('name'),
      supabase.from('destinations').select('*').order('name'),
      supabase.from('staff_members').select('*').order('name'),
      supabase.from('master_options').select('*').eq('category', 'cancel_reason').order('sort_order'),
    ])

  let copyData = null
  if (params.copy) {
    const { data } = await supabase
      .from('reservations')
      .select('*, route_stops(*)')
      .eq('id', params.copy)
      .single()
    copyData = data
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {copyData ? '予約コピー作成' : '予約作成'}
      </h1>
      <ReservationForm
        clients={clientsRes.data ?? []}
        drivers={driversRes.data ?? []}
        vehicles={vehiclesRes.data ?? []}
        careAssistants={careAssistantsRes.data ?? []}
        destinations={destinationsRes.data ?? []}
        staffMembers={staffRes.data ?? []}
        cancelReasons={cancelReasonsRes.data ?? []}
        defaultDate={params.date}
        defaultTime={params.time}
        copyData={copyData}
      />
    </div>
  )
}
