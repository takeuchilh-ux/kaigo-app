'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Client } from '@/types'
import { Trash2 } from 'lucide-react'

interface Props {
  initialClients: Client[]
  physicalConditionOptions: string[]
}

const EMPTY: Partial<Client> = {
  name: '', age: undefined, physical_condition: '', address: '',
  phone: '', emergency_contact: '', emergency_contact_relationship: '', notes: '',
}

export function ClientsManager({ initialClients, physicalConditionOptions }: Props) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [clients, setClients] = useState(initialClients)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Client>>(EMPTY)
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(EMPTY); setOpen(true) }
  function openEdit(c: Client) { setEditing(c); setOpen(true) }

  async function handleSave() {
    if (!editing.name) return
    setSaving(true)
    const payload = {
      name: editing.name,
      age: editing.age ?? null,
      physical_condition: editing.physical_condition ?? null,
      address: editing.address ?? null,
      phone: editing.phone ?? null,
      emergency_contact: editing.emergency_contact ?? null,
      emergency_contact_relationship: editing.emergency_contact_relationship ?? null,
      notes: editing.notes ?? null,
    }
    if (editing.id) {
      await supabase.from('clients').update(payload).eq('id', editing.id)
      setClients(prev => prev.map(c => c.id === editing.id ? { ...c, ...payload } as Client : c))
    } else {
      const { data } = await supabase.from('clients').insert(payload).select().single()
      if (data) setClients(prev => [...prev, data])
    }
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除してよいですか？')) return
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  const columns = [
    { key: 'name', label: '名前', className: 'font-medium' },
    { key: 'age', label: '年齢', render: (c: Client) => c.age ? `${c.age}歳` : '-' },
    { key: 'physical_condition', label: '身体状況' },
    { key: 'phone', label: '電話番号' },
    { key: 'emergency_contact', label: '緊急連絡先' },
    {
      key: 'actions', label: '',
      render: (c: Client) => (
        <button
          onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
          className="text-red-400 hover:text-red-600 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-10',
    },
  ]

  return (
    <>
      <DataTable
        data={clients}
        columns={columns as any}
        onAdd={openNew}
        addLabel="利用者を追加"
        onRowClick={openEdit}
        searchKeys={['name', 'phone']}
        searchPlaceholder="名前・電話で検索..."
      />

      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing.id ? '利用者を編集' : '利用者を追加'}</DialogTitle>
          </DialogHeader>
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
              <Label>身体状況</Label>
              <Select value={editing.physical_condition ?? ''} onValueChange={v => setEditing(p => ({ ...p, physical_condition: v }))}>
                <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                <SelectContent>
                  {physicalConditionOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Label>緊急連絡先</Label>
              <Input value={editing.emergency_contact ?? ''} onChange={e => setEditing(p => ({ ...p, emergency_contact: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>続柄</Label>
              <Input value={editing.emergency_contact_relationship ?? ''} onChange={e => setEditing(p => ({ ...p, emergency_contact_relationship: e.target.value }))} placeholder="例: 長男, 配偶者" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>備考</Label>
              <Textarea value={editing.notes ?? ''} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !editing.name}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
