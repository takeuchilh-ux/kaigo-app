import { createClient } from '@/lib/supabase/server'
import { VehiclesManager } from '@/components/masters/vehicles-manager'

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: vehicles } = await supabase.from('vehicles').select('*').order('vehicle_type')
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">車両管理</h1>
      <VehiclesManager initialVehicles={vehicles ?? []} />
    </div>
  )
}
