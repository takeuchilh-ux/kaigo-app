'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Users, Shield, User } from 'lucide-react'

interface AppUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'driver' | 'staff'
  created_at: string
  last_sign_in_at: string | null
}

const ROLE_LABELS = { admin: '管理者', driver: 'ドライバー', staff: 'スタッフ' }
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  driver: 'bg-blue-100 text-blue-700',
  staff: 'bg-gray-100 text-gray-700',
}

export function UsersManager() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AppUser | null>(null)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'staff' as AppUser['role'] })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    else setError('ユーザー一覧の取得に失敗しました')
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function openCreate() {
    setEditTarget(null)
    setForm({ email: '', password: '', name: '', role: 'staff' })
    setModalOpen(true)
  }

  function openEdit(u: AppUser) {
    setEditTarget(u)
    setForm({ email: u.email, password: '', name: u.name, role: u.role })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    if (editTarget) {
      // Update
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, name: form.name, userRole: form.role }),
      })
      if (!res.ok) { setError((await res.json()).error); setSaving(false); return }
    } else {
      // Create
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, name: form.name, userRole: form.role }),
      })
      if (!res.ok) { setError((await res.json()).error); setSaving(false); return }
    }
    setModalOpen(false)
    await fetchUsers()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) setError((await res.json()).error)
    else { setDeleteConfirm(null); await fetchUsers() }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4" />
          ログインユーザー管理
        </h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          ユーザー追加
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-4">読み込み中...</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                {u.role === 'admin' ? <Shield className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{u.name || '名前未設定'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteConfirm(u.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'ユーザー編集' : 'ユーザー追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>氏名</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="氏名" />
            </div>
            {!editTarget && (
              <>
                <div className="space-y-1.5">
                  <Label>メールアドレス</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>パスワード（初期）</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="8文字以上" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>ロール</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as AppUser['role'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理者</SelectItem>
                  <SelectItem value="driver">ドライバー</SelectItem>
                  <SelectItem value="staff">スタッフ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)}>キャンセル</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>ユーザーを削除しますか？</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">このユーザーのログイン情報と全データが削除されます。この操作は取り消せません。</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              削除する
            </Button>
            <Button className="flex-1" onClick={() => setDeleteConfirm(null)}>キャンセル</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
