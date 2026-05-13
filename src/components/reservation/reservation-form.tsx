'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { Plus, Trash2, MapPin, ArrowDown } from 'lucide-react'
import type { Client, Driver, Vehicle, CareAssistant, Destination, StaffMember, MasterOption, Reservation, RouteStop } from '@/types'

interface ReservationFormProps {
  reservation?: Reservation & { route_stops?: RouteStop[] }
  copyData?: any
  clients: Client[]
  drivers: Driver[]
  vehicles: Vehicle[]
  careAssistants: CareAssistant[]
  destinations: Destination[]
  staffMembers: StaffMember[]
  cancelReasons: MasterOption[]
  defaultDate?: string
  defaultTime?: string
}

interface Stop {
  id?: string
  address: string
  destination_id: string | null
  sort_order: number
}

export function ReservationForm({
  reservation, copyData, clients, drivers, vehicles, careAssistants,
  destinations, staffMembers, cancelReasons, defaultDate, defaultTime,
}: ReservationFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const mapInitialized = useRef(false)

  const src = reservation ?? copyData
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [reservationDate, setReservationDate] = useState(src?.reservation_date ?? defaultDate ?? '')
  const [departureTime, setDepartureTime] = useState(src?.departure_time?.slice(0, 5) ?? defaultTime ?? '09:00')
  const [returnTime, setReturnTime] = useState(src?.return_time?.slice(0, 5) ?? '')
  const [tripType, setTripType] = useState<'one_way' | 'round_trip'>(src?.trip_type ?? 'one_way')
  const [clientId, setClientId] = useState(src?.client_id ?? '')
  const [departureAddress, setDepartureAddress] = useState(src?.departure_address ?? '')
  const [stops, setStops] = useState<Stop[]>(() => {
    if (src?.route_stops?.length) {
      return src.route_stops
        .sort((a: RouteStop, b: RouteStop) => a.sort_order - b.sort_order)
        .map((s: RouteStop) => ({ id: s.id, address: s.address, destination_id: s.destination_id, sort_order: s.sort_order }))
    }
    return [{ address: '', destination_id: null, sort_order: 0 }]
  })
  const [destinationAddress, setDestinationAddress] = useState(src?.destination_address ?? '')
  const [driverId, setDriverId] = useState(src?.driver_id ?? '')
  const [careAssistantId, setCareAssistantId] = useState(src?.care_assistant_id ?? '')
  const [vehicleId, setVehicleId] = useState(src?.vehicle_id ?? '')
  const [receptionistId, setReceptionistId] = useState(src?.receptionist_id ?? '')
  const [reporterId, setReporterId] = useState(src?.reporter_id ?? '')
  const [estimatedAmount, setEstimatedAmount] = useState(src?.estimated_amount?.toString() ?? '')
  const [notes, setNotes] = useState(src?.notes ?? '')
  const [distanceKm, setDistanceKm] = useState(src?.distance_km?.toString() ?? '')
  const [durationMinutes, setDurationMinutes] = useState(src?.duration_minutes?.toString() ?? '')

  // Auto-fill departure address from client
  useEffect(() => {
    if (!clientId) return
    const client = clients.find(c => c.id === clientId)
    if (client?.address && !departureAddress) {
      setDepartureAddress(client.address)
    }
  }, [clientId])

  // Initialize Google Maps
  useEffect(() => {
    if (mapInitialized.current || !mapRef.current) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || apiKey === 'your_google_maps_api_key') return

    mapInitialized.current = true
    setOptions({ key: apiKey, v: 'weekly' })
    importLibrary('maps').then(() => {
      if (!mapRef.current) return
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 35.6762, lng: 139.6503 },
        zoom: 12,
      })
      directionsServiceRef.current = new google.maps.DirectionsService()
      directionsRendererRef.current = new google.maps.DirectionsRenderer()
      directionsRendererRef.current.setMap(googleMapRef.current)
      geocoderRef.current = new google.maps.Geocoder()
    })
  }, [])

  // Update map when addresses change
  useEffect(() => {
    const allAddresses = [departureAddress, ...stops.map(s => s.address), destinationAddress].filter(Boolean)
    if (allAddresses.length < 2 || !directionsServiceRef.current || !directionsRendererRef.current) return

    const waypoints = stops
      .filter(s => s.address)
      .map(s => ({ location: s.address, stopover: true }))

    directionsServiceRef.current.route(
      {
        origin: departureAddress,
        destination: destinationAddress || stops[stops.length - 1]?.address || departureAddress,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result)
          const leg = result.routes[0]?.legs
          if (leg) {
            const totalDist = leg.reduce((sum, l) => sum + (l.distance?.value ?? 0), 0)
            const totalDur = leg.reduce((sum, l) => sum + (l.duration?.value ?? 0), 0)
            setDistanceKm((totalDist / 1000).toFixed(1))
            setDurationMinutes(Math.round(totalDur / 60).toString())
          }
        }
      }
    )
  }, [departureAddress, JSON.stringify(stops.map(s => s.address)), destinationAddress])

  function addStop() {
    setStops(prev => [...prev, { address: '', destination_id: null, sort_order: prev.length }])
  }

  function removeStop(idx: number) {
    setStops(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sort_order: i })))
  }

  function updateStop(idx: number, patch: Partial<Stop>) {
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function handleStopDestinationSelect(idx: number, destId: string) {
    const dest = destinations.find(d => d.id === destId)
    updateStop(idx, {
      destination_id: destId || null,
      address: dest?.address ?? '',
    })
    // If it's the last stop and no destination address, use it as destination
    if (idx === stops.length - 1 && dest?.address && !destinationAddress) {
      setDestinationAddress(dest.address)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!reservationDate || !departureTime) {
      setError('日付と出発時間は必須です')
      setSaving(false)
      return
    }

    const payload = {
      reservation_date: reservationDate,
      departure_time: departureTime,
      return_time: returnTime || null,
      trip_type: tripType,
      client_id: clientId || null,
      driver_id: driverId || null,
      care_assistant_id: careAssistantId || null,
      vehicle_id: vehicleId || null,
      receptionist_id: receptionistId || null,
      reporter_id: reporterId || null,
      departure_address: departureAddress || null,
      destination_address: destinationAddress || null,
      distance_km: distanceKm ? parseFloat(distanceKm) : null,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      estimated_amount: estimatedAmount ? parseFloat(estimatedAmount) : null,
      notes: notes || null,
      status: reservation?.status ?? 'scheduled',
    }

    let reservationId: string
    if (reservation?.id) {
      const { error: updateError } = await supabase
        .from('reservations')
        .update(payload)
        .eq('id', reservation.id)
      if (updateError) { setError(updateError.message); setSaving(false); return }
      reservationId = reservation.id
      await supabase.from('route_stops').delete().eq('reservation_id', reservationId)
    } else {
      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert(payload)
        .select('id')
        .single()
      if (insertError || !data) { setError(insertError?.message ?? 'エラーが発生しました'); setSaving(false); return }
      reservationId = data.id
    }

    // Insert route stops
    const validStops = stops.filter(s => s.address)
    if (validStops.length > 0) {
      await supabase.from('route_stops').insert(
        validStops.map((s, i) => ({
          reservation_id: reservationId,
          address: s.address,
          destination_id: s.destination_id,
          sort_order: i,
        }))
      )
    }

    router.push('/calendar')
    router.refresh()
  }

  const receptionists = staffMembers.filter(s => s.type === 'receptionist')
  const reporters = staffMembers.filter(s => s.type === 'reporter')

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column: form */}
      <div className="space-y-6">
        {/* ① 日時 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
            日時
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>予約日 *</Label>
              <Input type="date" value={reservationDate} onChange={e => setReservationDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>出発時間 *</Label>
              <Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>片道 / 往復</Label>
            <Select value={tripType} onValueChange={v => setTripType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="one_way">片道</SelectItem>
                <SelectItem value="round_trip">往復</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tripType === 'round_trip' && (
            <div className="space-y-1.5">
              <Label>帰路時間</Label>
              <Input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} />
            </div>
          )}
        </section>

        {/* ② 利用者 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2</span>
            利用者
          </h2>
          <div className="space-y-1.5">
            <Label>利用者</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="利用者を選択..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {clientId && (() => {
            const client = clients.find(c => c.id === clientId)
            if (!client) return null
            return (
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 space-y-0.5">
                {client.physical_condition && <p>身体状況: {client.physical_condition}</p>}
                {client.phone && <p>電話: {client.phone}</p>}
                {client.emergency_contact && <p>緊急連絡先: {client.emergency_contact}（{client.emergency_contact_relationship}）</p>}
              </div>
            )
          })()}
        </section>

        {/* ③ ルート */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
            ルート
          </h2>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-green-600" />
              出発地
            </Label>
            <Input
              value={departureAddress}
              onChange={e => setDepartureAddress(e.target.value)}
              placeholder="住所を入力..."
            />
          </div>

          <ArrowDown className="w-4 h-4 text-gray-400 mx-auto" />

          {stops.map((stop, idx) => (
            <div key={idx} className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  経由地 {idx + 1}
                </span>
                {stops.length > 1 && (
                  <button type="button" onClick={() => removeStop(idx)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </Label>
              <Select value={stop.destination_id ?? '__manual__'} onValueChange={v => {
                if (v === '__manual__') {
                  updateStop(idx, { destination_id: null })
                } else {
                  handleStopDestinationSelect(idx, v)
                }
              }}>
                <SelectTrigger><SelectValue placeholder="施設を選択または手入力..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">手動入力</SelectItem>
                  {destinations.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={stop.address}
                onChange={e => updateStop(idx, { address: e.target.value, destination_id: null })}
                placeholder="住所を入力..."
              />
            </div>
          ))}

          <button
            type="button"
            onClick={addStop}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-4 h-4" />
            経由地を追加
          </button>

          <ArrowDown className="w-4 h-4 text-gray-400 mx-auto" />

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-500" />
              目的地
            </Label>
            <Select value={destinations.find(d => d.address === destinationAddress)?.id ?? '__manual__'} onValueChange={v => {
              if (v === '__manual__') {
                setDestinationAddress('')
              } else {
                const dest = destinations.find(d => d.id === v)
                setDestinationAddress(dest?.address ?? '')
              }
            }}>
              <SelectTrigger><SelectValue placeholder="施設を選択または手入力..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">手動入力</SelectItem>
                {destinations.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={destinationAddress}
              onChange={e => setDestinationAddress(e.target.value)}
              placeholder="住所を入力..."
            />
          </div>

          {(distanceKm || durationMinutes) && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 flex gap-4">
              {distanceKm && <span>距離: <strong>{distanceKm}km</strong></span>}
              {durationMinutes && <span>所要時間: <strong>約{durationMinutes}分</strong></span>}
            </div>
          )}
        </section>

        {/* ④ 担当者 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">4</span>
            担当者
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ドライバー</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>使用車両</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.vehicle_type} {v.license_plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>介補士</Label>
              <Select value={careAssistantId} onValueChange={setCareAssistantId}>
                <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                <SelectContent>
                  {careAssistants.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>応対者</Label>
              <Select value={receptionistId} onValueChange={setReceptionistId}>
                <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                <SelectContent>
                  {receptionists.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>報告者</Label>
              <Select value={reporterId} onValueChange={setReporterId}>
                <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                <SelectContent>
                  {reporters.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* ⑤ 金額・備考 */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">5</span>
            金額・備考
          </h2>
          <div className="space-y-1.5">
            <Label>見積金額（円）</Label>
            <Input
              type="number"
              value={estimatedAmount}
              onChange={e => setEstimatedAmount(e.target.value)}
              placeholder="例: 5000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>備考</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="特記事項など..."
              rows={3}
            />
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-6">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            キャンセル
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? '保存中...' : reservation?.id ? '更新する' : '予約を登録'}
          </Button>
        </div>
      </div>

      {/* Right column: Google Maps */}
      <div className="lg:sticky lg:top-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">ルート確認</h2>
            <p className="text-xs text-gray-500 mt-0.5">住所を入力するとリアルタイムで更新されます</p>
          </div>
          <div ref={mapRef} className="w-full h-80 lg:h-[500px] bg-gray-100 flex items-center justify-center">
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key' ? (
              <div className="text-center text-gray-400 text-sm p-4">
                <MapPin className="w-8 h-8 mx-auto mb-2" />
                Google Maps APIキーを<br />.env.localに設定してください
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  )
}
