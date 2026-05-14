import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  const role = roleData?.role ?? 'staff'
  const userName = roleData?.name ?? user.email ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role as any} userName={userName} />
      <main className="lg:pl-60 pt-14 lg:pt-0 min-h-screen">
        <div className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
