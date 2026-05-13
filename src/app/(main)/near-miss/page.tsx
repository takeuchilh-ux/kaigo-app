import { createClient } from '@/lib/supabase/server'
import { NearMissManager } from '@/components/near-miss/near-miss-manager'
import { redirect } from 'next/navigation'

export default async function NearMissPage() {
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

  const { data: reports } = await supabase
    .from('near_miss_reports')
    .select('*, drivers(name), near_miss_photos(id, photo_url)')
    .order('occurred_at', { ascending: false })

  const { data: drivers } = await supabase.from('drivers').select('id, name').order('name')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ヒヤリハット</h1>
      <NearMissManager
        initialReports={reports ?? []}
        drivers={drivers ?? []}
        role={role as any}
        currentDriverId={driverId}
      />
    </div>
  )
}
