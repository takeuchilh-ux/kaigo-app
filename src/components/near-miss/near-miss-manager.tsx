'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import type { NearMissReport, UserRole } from '@/types'
import { Plus, AlertTriangle, Calendar, MapPin, Image as ImageIcon, Search } from 'lucide-react'

interface Props {
  initialReports: NearMissReport[]
  drivers: { id: string; name: string }[]
  role: UserRole
  currentDriverId: string | null
}

const EMPTY = {
  driver_id: '',
  occurred_at: '',
  location: '',
  description: '',
  response_content: '',
  responder: '',
}

export function NearMissManager({ initialReports, drivers, role, currentDriverId }: Props) {
  const supabase = createSupabaseClient()
  const [reports, setReports] = useState(initialReports)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<NearMissReport | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY, driver_id: currentDriverId ?? '' })
  const [photos, setPhotos] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  // Google Places Autocomplete
  const locationInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const placesInitialized = useRef(false)

  useEffect(() => {
    if (!open || placesInitialized.current) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || apiKey === 'your_google_maps_api_key') return

    placesInitialized.current = true
    setOptions({ key: apiKey, v: 'weekly' })
    importLibrary('places').then(() => {
      if (!locationInputRef.current) return
      autocompleteRef.current = new google.maps.places.Autocomplete(locationInputRef.current, {
        componentRestrictions: { country: 'jp' },
        fields: ['formatted_address', 'name'],
        types: ['establishment', 'geocode'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace()
        if (place) {
          const loc = place.name
            ? `${place.name}（${place.formatted_address ?? ''}）`
            : (place.formatted_address ?? '')
          setForm(p => ({ ...p, location: loc }))
        }
      })
    })
  }, [open])

  async function handleSave() {
    if (!form.occurred_at || !form.driver_id) return
    setSaving(true)

    const { data: report } = await supabase
      .from('near_miss_reports')
      .insert({
        driver_id: form.driver_id || null,
        occurred_at: form.occurred_at,
        location: form.location || null,
        description: form.description || null,
        response_content: form.response_content || null,
        responder: form.responder || null,
      })
      .select('*, drivers(name), near_miss_photos(id, photo_url)')
      .single()

    if (report) {
      for (const photo of photos) {
        const ext = photo.name.split('.').pop()
        const path = `near-miss/${report.id}/${Date.now()}.${ext}`
        const { data: uploadData } = await supabase.storage.from('near-miss-photos').upload(path, photo)
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('near-miss-photos').getPublicUrl(path)
          await supabase.from('near_miss_photos').insert({ report_id: report.id, photo_url: publicUrl })
        }
      }
      setReports(prev => [report, ...prev])
    }

    setForm({ ...EMPTY, driver_id: currentDriverId ?? '' })
    setPhotos([])
    setSaving(false)
    setOpen(false)
  }

  function openDetail(r: NearMissReport) {
    setSelected(r)
    setDetailOpen(true)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          ヒヤリハット報告
        </Button>
      </div>

      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">報告はありません</p>
          </div>
        ) : (
          reports.map(r => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => openDetail(r)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 flex-wrap">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.occurred_at).toLocaleString('ja-JP')}
                    {(r as any).drivers?.name && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        {(r as any).drivers.name}
                      </span>
                    )}
                  </div>
                  {r.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{r.location}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-700 line-clamp-2">{r.description}</p>
                </div>
                {(r as any).near_miss_photos?.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <ImageIcon className="w-3 h-3" />
                    {(r as any).near_miss_photos.length}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New report dialog */}
      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ヒヤリハット報告</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {role === 'admin' && (
              <div className="space-y-1.5">
                <Label>ドライバー *</Label>
                <Select value={form.driver_id} onValueChange={v => setForm(p => ({ ...p, driver_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 発生日時 + 発生場所 — stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>発生日時 *</Label>
                <Input
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={e => setForm(p => ({ ...p, occurred_at: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  発生場所
                  <span className="text-xs text-gray-400 font-normal">（候補が表示されます）</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    ref={locationInputRef}
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="例: ○○交差点"
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>内容・状況</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="何が起きたか詳しく記述..."
              />
            </div>

            {/* 対応内容 + 対応者 — stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>対応内容</Label>
                <Textarea
                  value={form.response_content}
                  onChange={e => setForm(p => ({ ...p, response_content: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>対応者</Label>
                <Input
                  value={form.responder}
                  onChange={e => setForm(p => ({ ...p, responder: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>写真添付</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={e => setPhotos(Array.from(e.target.files ?? []))}
                className="text-sm"
              />
              {photos.length > 0 && (
                <p className="text-xs text-gray-500">{photos.length}枚選択済み</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !form.occurred_at || !form.driver_id}
            >
              {saving ? '送信中...' : '報告を送信'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={v => !v && setDetailOpen(false)}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ヒヤリハット詳細</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">発生日時</p>
                  <p className="font-medium">{new Date(selected.occurred_at).toLocaleString('ja-JP')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">発生場所</p>
                  <div className="flex items-start gap-1">
                    <p className="font-medium flex-1">{selected.location ?? '-'}</p>
                    {selected.location && (
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(selected.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex-shrink-0 mt-0.5"
                        title="Google Mapsで確認"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ドライバー</p>
                  <p className="font-medium">{(selected as any).drivers?.name ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">対応者</p>
                  <p className="font-medium">{selected.responder ?? '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">内容・状況</p>
                <p className="bg-gray-50 rounded p-3 whitespace-pre-wrap">{selected.description ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">対応内容</p>
                <p className="bg-gray-50 rounded p-3 whitespace-pre-wrap">{selected.response_content ?? '-'}</p>
              </div>
              {(selected as any).near_miss_photos?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">添付写真</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(selected as any).near_miss_photos.map((p: { id: string; photo_url: string }) => (
                      <img key={p.id} src={p.photo_url} alt="ヒヤリハット写真" className="w-full h-24 object-cover rounded" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
