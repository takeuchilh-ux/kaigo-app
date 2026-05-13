'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Destination } from '@/types'
import { Trash2 } from 'lucide-react'

const EMPTY: Partial<Destination> = { name: '', address: '', phone: '', contact_person: '', contact_phone: '', notes: '' }

export function DestinationsManager({ initialDestinations }: { initialDestinations: Destination[] }) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [items, setItems] = useState(initialDestinations)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Destination>>(EMPTY)
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(EMPTY); setOpen(true) }
  function openEdit(d: Destination) { setEditing(d); setOpen(true) }

  async function handleSave() {
    if (!editing.name) return
    setSaving(true)
    const payload = {
      name: editing.name,
      address: editing.address ?? null,
      phone: editing.phone ?? null,
      contact_person: editing.contact_person ?? null,
      contact_phone: editing.contact_phone ?? null,
      notes: editing.notes ?? null,
    }
    if (editing.id) {
      await supabase.from('destinations').update(payload).eq('id', editing.id)
      setItems(prev => prev.map(d => d.id === editing.id ? { ...d, ...payload } as Destination : d))
    } else {
      const { data } = await supabase.from('destinations').insert(payload).select().single()
      if (data) setItems(prev => [...prev, data])
    }
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除してよいですか？')) return
    await supabase.from('destinations').delete().eq('id', id)
    setItems(prev => prev.filter(d => d.id !== id))
  }

  const columns = [
    { key: 'name', label: '施設名', className: 'font-medium' },
    { key: 'address', label: '住所' },
    { key: 'phone', label: '電話番号' },
    { key: 'contact_person', label: '担当者' },
    { key: 'contact_phone', label: '担当者連絡先' },
    {
      key: 'actions', label: '',
      render: (d: Destination) => (
        <button onClick={e => { e.stopPropagation(); handleDelete(d.id) }} className="text-red-400 hover:text-red-600 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-10',
    },
  ]

  return (
    <>
      <DataTable data={items} columns={columns as any} onAdd={openNew} addLabel="施設を追加" onRowClick={openEdit} searchKeys={['name', 'address']} searchPlaceholder="施設名・住所で検索..." />
      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? '施設を編集' : '施設を追加'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>施設名 *</Label>
              <Input value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="例: ○○病院" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>住所</Label>
              <Input value={editing.address ?? ''} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>電話番号</Label>
              <Input value={editing.phone ?? ''} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>担当者</Label>
              <Input value={editing.contact_person ?? ''} onChange={e => setEditing(p => ({ ...p, contact_person: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>担当者連絡先</Label>
              <Input value={editing.contact_phone ?? ''} onChange={e => setEditing(p => ({ ...p, contact_phone: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>備考</Label>
              <Textarea value={editing.notes ?? ''} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} rows={2} />
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
