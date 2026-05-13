import { createClient } from '@/lib/supabase/server'
import { DriversManager } from '@/components/masters/drivers-manager'

export default async function DriversPage() {
  const supabase = await createClient()
  const { data: drivers } = await supabase.from('drivers').select('*').order('name')
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ドライバー管理</h1>
      <DriversManager initialDrivers={drivers ?? []} />
    </div>
  )
}
