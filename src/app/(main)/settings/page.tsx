import { createClient } from '@/lib/supabase/server'
import { SettingsManager } from '@/components/settings/settings-manager'
import { UsersManager } from '@/components/settings/users-manager'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const [masterOptionsRes, staffMembersRes] = await Promise.all([
    supabase.from('master_options').select('*').order('category').order('sort_order'),
    supabase.from('staff_members').select('*').order('type').order('name'),
  ])

  const showUsers = params.tab === 'users'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">設定・マスタ管理</h1>
        <SettingsManager
          key={params.tab ?? 'default'}
          initialMasterOptions={masterOptionsRes.data ?? []}
          initialStaffMembers={staffMembersRes.data ?? []}
          initialTab={params.tab}
        />
      </div>

      <div>
        <UsersManager />
      </div>
    </div>
  )
}
