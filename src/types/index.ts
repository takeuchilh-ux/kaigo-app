export type UserRole = 'admin' | 'driver' | 'staff'

export interface UserRoleRecord {
  id: string
  role: UserRole
  driver_id: string | null
  name: string | null
  email: string | null
}

export interface Client {
  id: string
  name: string
  age: number | null
  physical_condition: string | null
  address: string | null
  phone: string | null
  emergency_contact: string | null
  emergency_contact_relationship: string | null
  notes: string | null
  created_at: string
}

export interface Vehicle {
  id: string
  vehicle_type: string
  photo_url: string | null
  license_plate: string | null
  inspection_cert_url: string | null
  max_passengers: number | null
  notes: string | null
  created_at: string
}

export interface Driver {
  id: string
  name: string
  age: number | null
  license_number: string | null
  license_expiry: string | null
  color: string
  created_at: string
}

export interface CareAssistant {
  id: string
  facility_name: string | null
  affiliation: string | null
  name: string
  role_title: string | null
  contact: string | null
  created_at: string
}

export interface Destination {
  id: string
  name: string
  address: string | null
  phone: string | null
  contact_person: string | null
  contact_phone: string | null
  notes: string | null
  created_at: string
}

export interface StaffMember {
  id: string
  type: 'receptionist' | 'reporter'
  name: string
}

export interface MasterOption {
  id: string
  category: string
  value: string
  sort_order: number
}

export interface RouteStop {
  id: string
  reservation_id: string
  sort_order: number
  address: string
  destination_id: string | null
}

export interface Reservation {
  id: string
  reservation_date: string
  departure_time: string
  return_time: string | null
  trip_type: 'one_way' | 'round_trip'
  client_id: string | null
  driver_id: string | null
  care_assistant_id: string | null
  vehicle_id: string | null
  receptionist_id: string | null
  reporter_id: string | null
  departure_address: string | null
  destination_address: string | null
  distance_km: number | null
  duration_minutes: number | null
  estimated_amount: number | null
  notes: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  cancel_reason: string | null
  created_at: string
  updated_at: string
  clients?: Client
  drivers?: Driver
  care_assistants?: CareAssistant
  vehicles?: Vehicle
  route_stops?: RouteStop[]
}

export interface NearMissReport {
  id: string
  driver_id: string | null
  reservation_id: string | null
  occurred_at: string
  location: string | null
  description: string | null
  response_content: string | null
  responder: string | null
  created_at: string
  drivers?: Driver
  near_miss_photos?: { id: string; photo_url: string }[]
}
