'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Driver } from '@/types'
import { Trash2 } from 'lucide-react'

const DRIVER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
const EMPTY: Partial<Driver> = { name: '', age: undefined, license_number: '', license_expiry: '', color: '#3B82F6' }

export function DriversManager({ initialDrivers }: { initialDrivers: Driver[] }) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [drivers, setDrivers] = useState(initialDrivers)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Driver>>(EMPTY)
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(EMPTY); setOpen(true) }
  function openEdit(d: Driver) { setEditing(d); setOpen(true) }

  async function handleSave() {
    if (!editing.name) return
    setSaving(true)
    const payload = {
      name: editing.name,
      age: editing.age ?? null,
      license_number: editing.license_number ?? null,
      license_expiry: editing.license_expiry || null,
      color: editing.color ?? '#3B82F6',
    }
    if (editing.id) {
      await supabase.from('drivers').update(payload).eq('id', editing.id)
      setDrivers(prev => prev.map(d => d.id === editing.id ? { ...d, ...payload } as Driver : d))
    } else {
      const { data } = await supabase.from('drivers').insert(payload).select().single()
      if (data) setDrivers(prev => [...prev, data])
    }
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除してよいですか？')) return
    await supabase.from('drivers').delete().eq('id', id)
    setDrivers(prev => prev.filter(d => d.id !== id))
  }

  const columns = [
    { key: 'name', label: '名前', render: (d: Driver) => (
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
        <span className="font-medium">{d.name}</span>
      </div>
    )},
    { key: 'age', label: '年齢', render: (d: Driver) => d.age ? `${d.age}歳` : '-' },
    { key: 'license_number', label: '免許証番号' },
    { key: 'license_expiry', label: '免許有効期限', render: (d: Driver) => d.license_expiry ? new Date(d.license_expiry).toLocaleDateString('ja-JP') : '-' },
    {
      key: 'actions', label: '',
      render: (d: Driver) => (
        <button onClick={e => { e.stopPropagation(); handleDelete(d.id) }} className="text-red-400 hover:text-red-600 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-10',
    },
  ]

  return (
    <>
      <DataTable data={drivers} columns={columns as any} onAdd={openNew} addLabel="ドライバーを追加" onRowClick={openEdit} searchKeys={['name']} searchPlaceholder="名前で検索..." />
      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? 'ドライバーを編集' : 'ドライバーを追加'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>名前 *</Label>
              <Input value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>年齢</Label>
              <Input type="number" value={editing.age ?? ''} onChange={e => setEditing(p => ({ ...p, age: parseInt(e.target.value) || undefined }))} />
            </div>
            <div className="space-y-1.5">
              <Label>免許証番号</Label>
              <Input value={editing.license_number ?? ''} onChange={e => setEditing(p => ({ ...p, license_number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>免許有効期限</Label>
              <Input type="date" value={editing.license_expiry ?? ''} onChange={e => setEditing(p => ({ ...p, license_expiry: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>カレンダー表示色</Label>
              <div className="flex gap-2 flex-wrap">
                {DRIVER_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-all ${editing.color === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditing(p => ({ ...p, color }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !editing.name}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
