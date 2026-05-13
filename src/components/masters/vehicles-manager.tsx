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
import type { Vehicle } from '@/types'
import { Trash2 } from 'lucide-react'

const EMPTY: Partial<Vehicle> = {
  vehicle_type: '', license_plate: '', max_passengers: undefined, notes: '',
}

export function VehiclesManager({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Vehicle>>(EMPTY)
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(EMPTY); setOpen(true) }
  function openEdit(v: Vehicle) { setEditing(v); setOpen(true) }

  async function handleSave() {
    if (!editing.vehicle_type) return
    setSaving(true)
    const payload = {
      vehicle_type: editing.vehicle_type,
      license_plate: editing.license_plate ?? null,
      max_passengers: editing.max_passengers ?? null,
      notes: editing.notes ?? null,
    }
    if (editing.id) {
      await supabase.from('vehicles').update(payload).eq('id', editing.id)
      setVehicles(prev => prev.map(v => v.id === editing.id ? { ...v, ...payload } as Vehicle : v))
    } else {
      const { data } = await supabase.from('vehicles').insert(payload).select().single()
      if (data) setVehicles(prev => [...prev, data])
    }
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除してよいですか？')) return
    await supabase.from('vehicles').delete().eq('id', id)
    setVehicles(prev => prev.filter(v => v.id !== id))
  }

  const columns = [
    { key: 'vehicle_type', label: '車種', className: 'font-medium' },
    { key: 'license_plate', label: 'ナンバープレート' },
    { key: 'max_passengers', label: '最大乗車人数', render: (v: Vehicle) => v.max_passengers ? `${v.max_passengers}名` : '-' },
    { key: 'notes', label: '備考' },
    {
      key: 'actions', label: '',
      render: (v: Vehicle) => (
        <button onClick={e => { e.stopPropagation(); handleDelete(v.id) }} className="text-red-400 hover:text-red-600 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-10',
    },
  ]

  return (
    <>
      <DataTable data={vehicles} columns={columns as any} onAdd={openNew} addLabel="車両を追加" onRowClick={openEdit} searchKeys={['vehicle_type', 'license_plate']} searchPlaceholder="車種・ナンバーで検索..." />
      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? '車両を編集' : '車両を追加'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>車種 *</Label>
              <Input value={editing.vehicle_type ?? ''} onChange={e => setEditing(p => ({ ...p, vehicle_type: e.target.value }))} placeholder="例: トヨタ ハイエース" />
            </div>
            <div className="space-y-1.5">
              <Label>ナンバープレート</Label>
              <Input value={editing.license_plate ?? ''} onChange={e => setEditing(p => ({ ...p, license_plate: e.target.value }))} placeholder="例: 品川 300 あ 1234" />
            </div>
            <div className="space-y-1.5">
              <Label>最大乗車人数</Label>
              <Input type="number" value={editing.max_passengers ?? ''} onChange={e => setEditing(p => ({ ...p, max_passengers: parseInt(e.target.value) || undefined }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>備考</Label>
              <Textarea value={editing.notes ?? ''} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !editing.vehicle_type}>{saving ? '保存中...' : '保存'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
