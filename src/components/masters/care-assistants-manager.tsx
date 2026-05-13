'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CareAssistant } from '@/types'
import { Trash2 } from 'lucide-react'

const EMPTY: Partial<CareAssistant> = { facility_name: '', affiliation: '', name: '', role_title: '', contact: '' }

export function CareAssistantsManager({ initialCareAssistants }: { initialCareAssistants: CareAssistant[] }) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [items, setItems] = useState(initialCareAssistants)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<CareAssistant>>(EMPTY)
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(EMPTY); setOpen(true) }
  function openEdit(c: CareAssistant) { setEditing(c); setOpen(true) }

  async function handleSave() {
    if (!editing.name) return
    setSaving(true)
    const payload = {
      facility_name: editing.facility_name ?? null,
      affiliation: editing.affiliation ?? null,
      name: editing.name,
      role_title: editing.role_title ?? null,
      contact: editing.contact ?? null,
    }
    if (editing.id) {
      await supabase.from('care_assistants').update(payload).eq('id', editing.id)
      setItems(prev => prev.map(c => c.id === editing.id ? { ...c, ...payload } as CareAssistant : c))
    } else {
      const { data } = await supabase.from('care_assistants').insert(payload).select().single()
      if (data) setItems(prev => [...prev, data])
    }
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除してよいですか？')) return
    await supabase.from('care_assistants').delete().eq('id', id)
    setItems(prev => prev.filter(c => c.id !== id))
  }

  const columns = [
    { key: 'name', label: '名前', className: 'font-medium' },
    { key: 'facility_name', label: '施設名' },
    { key: 'affiliation', label: '所属' },
    { key: 'role_title', label: '役職' },
    { key: 'contact', label: '連絡先' },
    {
      key: 'actions', label: '',
      render: (c: CareAssistant) => (
        <button onClick={e => { e.stopPropagation(); handleDelete(c.id) }} className="text-red-400 hover:text-red-600 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-10',
    },
  ]

  return (
    <>
      <DataTable data={items} columns={columns as any} onAdd={openNew} addLabel="介補士を追加" onRowClick={openEdit} searchKeys={['name', 'facility_name']} searchPlaceholder="名前・施設で検索..." />
      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? '介補士を編集' : '介補士を追加'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>名前 *</Label>
              <Input value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>施設名</Label>
              <Input value={editing.facility_name ?? ''} onChange={e => setEditing(p => ({ ...p, facility_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>所属</Label>
              <Input value={editing.affiliation ?? ''} onChange={e => setEditing(p => ({ ...p, affiliation: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>役職</Label>
              <Input value={editing.role_title ?? ''} onChange={e => setEditing(p => ({ ...p, role_title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>連絡先</Label>
              <Input value={editing.contact ?? ''} onChange={e => setEditing(p => ({ ...p, contact: e.target.value }))} />
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
