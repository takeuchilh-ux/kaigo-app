import { createClient } from '@/lib/supabase/server'
import { CareAssistantsManager } from '@/components/masters/care-assistants-manager'

export default async function CareAssistantsPage() {
  const supabase = await createClient()
  const { data: careAssistants } = await supabase.from('care_assistants').select('*').order('name')
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">介補士管理</h1>
      <CareAssistantsManager initialCareAssistants={careAssistants ?? []} />
    </div>
  )
}
