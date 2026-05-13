import { createClient } from '@/lib/supabase/server'
import { DestinationsManager } from '@/components/masters/destinations-manager'

export default async function DestinationsPage() {
  const supabase = await createClient()
  const { data: destinations } = await supabase.from('destinations').select('*').order('name')
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">目的地管理（病院・施設）</h1>
      <DestinationsManager initialDestinations={destinations ?? []} />
    </div>
  )
}
