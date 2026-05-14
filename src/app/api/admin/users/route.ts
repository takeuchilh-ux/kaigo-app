import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Verify the caller is an admin
async function getCallerRole() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('user_roles').select('role').eq('id', user.id).single()
  return data?.role ?? null
}

// Admin Supabase client (bypasses RLS)
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/admin/users — list all users
export async function GET() {
  const role = await getCallerRole()
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminClient()
  const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers()
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  const { data: roles } = await admin.from('user_roles').select('*')
  const roleMap = Object.fromEntries((roles ?? []).map(r => [r.id, r]))

  const users = authUsers.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    role: roleMap[u.id]?.role ?? 'staff',
    name: roleMap[u.id]?.name ?? '',
    driver_id: roleMap[u.id]?.driver_id ?? null,
  }))

  return NextResponse.json(users)
}

// POST /api/admin/users — create user
export async function POST(req: Request) {
  const role = await getCallerRole()
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password, name, userRole } = await req.json()
  if (!email || !password || !name || !userRole) {
    return NextResponse.json({ error: '全項目を入力してください' }, { status: 400 })
  }

  const admin = adminClient()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

  await admin.from('user_roles').upsert({
    id: created.user.id,
    role: userRole,
    name,
    email,
  })

  return NextResponse.json({ success: true })
}

// PUT /api/admin/users — update role/name/password
export async function PUT(req: Request) {
  const role = await getCallerRole()
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, userRole, password } = await req.json()
  const admin = adminClient()

  // Update role and name
  const { error } = await admin
    .from('user_roles')
    .update({ role: userRole, name })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update password if provided
  if (password && password.trim().length >= 6) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password })
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users — delete user
export async function DELETE(req: Request) {
  const role = await getCallerRole()
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const admin = adminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
