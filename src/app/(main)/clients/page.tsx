import { createClient } from '@/lib/supabase/server'
import { ClientsManager } from '@/components/masters/clients-manager'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('*').order('name')
  const { data: physicalConditions } = await supabase
    .from('master_options').select('*').eq('category', 'physical_condition').order('sort_order')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">利用者管理</h1>
      <ClientsManager
        initialClients={clients ?? []}
        physicalConditionOptions={(physicalConditions ?? []).map(o => o.value)}
      />
    </div>
  )
}
