'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MasterOption, StaffMember } from '@/types'
import { Plus, Trash2, Settings } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  physical_condition: '身体状況区分',
  wheelchair_type: '車椅子種別',
  cancel_reason: 'キャンセル理由',
  service_content: '付添サービス内容',
}

interface Props {
  initialMasterOptions: MasterOption[]
  initialStaffMembers: StaffMember[]
  initialTab?: string
}

export function SettingsManager({ initialMasterOptions, initialStaffMembers, initialTab }: Props) {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [options, setOptions] = useState(initialMasterOptions)
  const [staff, setStaff] = useState(initialStaffMembers)
  const [activeCategory, setActiveCategory] = useState(
    initialTab && initialTab !== 'staff' ? initialTab : 'physical_condition'
  )
  const [showStaff, setShowStaff] = useState(initialTab === 'staff')
  const [newValue, setNewValue] = useState('')
  const [addingStaff, setAddingStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({ name: '', type: 'receptionist' as 'receptionist' | 'reporter' })
  const [staffOpen, setStaffOpen] = useState(false)

  const categories = Object.keys(CATEGORY_LABELS)
  const filteredOptions = options.filter(o => o.category === activeCategory)

  async function handleAddOption() {
    if (!newValue.trim()) return
    const { data } = await supabase
      .from('master_options')
      .insert({ category: activeCategory, value: newValue.trim(), sort_order: filteredOptions.length })
      .select()
      .single()
    if (data) {
      setOptions(prev => [...prev, data])
      setNewValue('')
    }
  }

  async function handleDeleteOption(id: string) {
    await supabase.from('master_options').delete().eq('id', id)
    setOptions(prev => prev.filter(o => o.id !== id))
  }

  async function handleAddStaff() {
    if (!newStaff.name.trim()) return
    setAddingStaff(true)
    const { data } = await supabase
      .from('staff_members')
      .insert({ name: newStaff.name.trim(), type: newStaff.type })
      .select()
      .single()
    if (data) setStaff(prev => [...prev, data])
    setNewStaff({ name: '', type: 'receptionist' })
    setAddingStaff(false)
    setStaffOpen(false)
    router.refresh()
  }

  async function handleDeleteStaff(id: string) {
    await supabase.from('staff_members').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Master options */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          プルダウン項目管理
        </h2>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setShowStaff(false) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat && !showStaff ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filteredOptions.map(opt => (
            <div key={opt.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-sm">{opt.value}</span>
              <button onClick={() => handleDeleteOption(opt.id)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            placeholder={`${CATEGORY_LABELS[activeCategory]}を追加...`}
            onKeyDown={e => e.key === 'Enter' && handleAddOption()}
          />
          <Button size="sm" onClick={handleAddOption}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Staff members */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">応対者・報告者管理</h2>
          <Button size="sm" onClick={() => setStaffOpen(true)}>
            <Plus className="w-4 h-4" />
            追加
          </Button>
        </div>
        <div className="space-y-1">
          {['receptionist', 'reporter'].map(type => (
            <div key={type}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1 mt-3">
                {type === 'receptionist' ? '応対者' : '報告者'}
              </p>
              {staff.filter(s => s.type === type).map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg mb-1">
                  <span className="text-sm">{s.name}</span>
                  <button onClick={() => handleDeleteStaff(s.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {staff.filter(s => s.type === type).length === 0 && (
                <p className="text-xs text-gray-400 px-3">未登録</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={staffOpen} onOpenChange={v => !v && setStaffOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>応対者・報告者を追加</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>種別</Label>
              <Select value={newStaff.type} onValueChange={v => setNewStaff(p => ({ ...p, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receptionist">応対者</SelectItem>
                  <SelectItem value="reporter">報告者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>名前 *</Label>
              <Input value={newStaff.name} onChange={e => setNewStaff(p => ({ ...p, name: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStaffOpen(false)}>キャンセル</Button>
            <Button className="flex-1" onClick={handleAddStaff} disabled={addingStaff || !newStaff.name}>
              {addingStaff ? '保存中...' : '追加'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
