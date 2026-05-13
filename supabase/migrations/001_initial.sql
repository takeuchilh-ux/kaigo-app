-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User roles
create table public.user_roles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'driver', 'staff')),
  driver_id uuid,
  name text,
  email text,
  created_at timestamptz default now()
);
alter table public.user_roles enable row level security;
create policy "Users can view their own role" on public.user_roles for select using (auth.uid() = id);
create policy "Admins can manage all roles" on public.user_roles using (
  exists (select 1 from public.user_roles where id = auth.uid() and role = 'admin')
);

-- Clients (利用者)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer,
  physical_condition text,
  address text,
  phone text,
  emergency_contact text,
  emergency_contact_relationship text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.clients enable row level security;
create policy "Authenticated users can read clients" on public.clients for select using (auth.role() = 'authenticated');
create policy "Admins can manage clients" on public.clients for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Vehicles (車両)
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_type text not null,
  photo_url text,
  license_plate text,
  inspection_cert_url text,
  max_passengers integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.vehicles enable row level security;
create policy "Authenticated users can read vehicles" on public.vehicles for select using (auth.role() = 'authenticated');
create policy "Admins can manage vehicles" on public.vehicles for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Drivers (ドライバー)
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer,
  license_number text,
  license_expiry date,
  color text default '#3B82F6',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.drivers enable row level security;
create policy "Authenticated users can read drivers" on public.drivers for select using (auth.role() = 'authenticated');
create policy "Admins can manage drivers" on public.drivers for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Care assistants (介補士)
create table public.care_assistants (
  id uuid primary key default gen_random_uuid(),
  facility_name text,
  affiliation text,
  name text not null,
  role_title text,
  contact text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.care_assistants enable row level security;
create policy "Authenticated users can read care_assistants" on public.care_assistants for select using (auth.role() = 'authenticated');
create policy "Admins can manage care_assistants" on public.care_assistants for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Destinations (目的地：病院・施設)
create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  contact_person text,
  contact_phone text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.destinations enable row level security;
create policy "Authenticated users can read destinations" on public.destinations for select using (auth.role() = 'authenticated');
create policy "Admins can manage destinations" on public.destinations for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Staff members (応対者・報告者)
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('receptionist', 'reporter')),
  name text not null,
  created_at timestamptz default now()
);
alter table public.staff_members enable row level security;
create policy "Authenticated users can read staff_members" on public.staff_members for select using (auth.role() = 'authenticated');
create policy "Admins can manage staff_members" on public.staff_members for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Master options (プルダウン選択肢)
create table public.master_options (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  value text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.master_options enable row level security;
create policy "Authenticated users can read master_options" on public.master_options for select using (auth.role() = 'authenticated');
create policy "Admins can manage master_options" on public.master_options for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Reservations (予約)
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_date date not null,
  departure_time time not null,
  return_time time,
  trip_type text check (trip_type in ('one_way', 'round_trip')) default 'one_way',
  client_id uuid references public.clients(id),
  driver_id uuid references public.drivers(id),
  care_assistant_id uuid references public.care_assistants(id),
  vehicle_id uuid references public.vehicles(id),
  receptionist_id uuid references public.staff_members(id),
  reporter_id uuid references public.staff_members(id),
  departure_address text,
  destination_address text,
  distance_km numeric,
  duration_minutes integer,
  estimated_amount numeric,
  notes text,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  cancel_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.reservations enable row level security;
create policy "Authenticated users can read reservations" on public.reservations for select using (auth.role() = 'authenticated');
create policy "Admins can manage reservations" on public.reservations for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);
create policy "Drivers can update their reservations" on public.reservations for update using (
  exists (
    select 1 from public.user_roles ur
    join public.drivers d on d.id = ur.driver_id
    where ur.id = auth.uid() and d.id = reservations.driver_id
  )
);

-- Route stops (経由地)
create table public.route_stops (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete cascade,
  sort_order integer not null,
  address text not null,
  destination_id uuid references public.destinations(id),
  created_at timestamptz default now()
);
alter table public.route_stops enable row level security;
create policy "Authenticated users can read route_stops" on public.route_stops for select using (auth.role() = 'authenticated');
create policy "Admins can manage route_stops" on public.route_stops for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Near miss reports (ヒヤリハット)
create table public.near_miss_reports (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.drivers(id),
  reservation_id uuid references public.reservations(id),
  occurred_at timestamptz not null,
  location text,
  description text,
  response_content text,
  responder text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.near_miss_reports enable row level security;
create policy "Authenticated users can read near_miss_reports" on public.near_miss_reports for select using (auth.role() = 'authenticated');
create policy "Drivers and admins can insert near_miss_reports" on public.near_miss_reports for insert with check (auth.role() = 'authenticated');
create policy "Admins can manage near_miss_reports" on public.near_miss_reports for all using (
  exists (select 1 from public.user_roles where id = auth.uid() and role in ('admin', 'staff'))
);

-- Near miss photos
create table public.near_miss_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.near_miss_reports(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz default now()
);
alter table public.near_miss_photos enable row level security;
create policy "Authenticated users can read near_miss_photos" on public.near_miss_photos for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert near_miss_photos" on public.near_miss_photos for insert with check (auth.role() = 'authenticated');

-- Insert default master options
insert into public.master_options (category, value, sort_order) values
  ('physical_condition', '自立', 1),
  ('physical_condition', '要支援1', 2),
  ('physical_condition', '要支援2', 3),
  ('physical_condition', '要介護1', 4),
  ('physical_condition', '要介護2', 5),
  ('physical_condition', '要介護3', 6),
  ('physical_condition', '要介護4', 7),
  ('physical_condition', '要介護5', 8),
  ('wheelchair_type', '自走式車椅子', 1),
  ('wheelchair_type', '介助式車椅子', 2),
  ('wheelchair_type', '電動車椅子', 3),
  ('wheelchair_type', 'ストレッチャー', 4),
  ('wheelchair_type', 'なし', 5),
  ('cancel_reason', '体調不良', 1),
  ('cancel_reason', '天候不良', 2),
  ('cancel_reason', '利用者都合', 3),
  ('cancel_reason', '家族都合', 4),
  ('cancel_reason', '病院都合', 5),
  ('cancel_reason', 'その他', 6),
  ('service_content', '乗降車介助', 1),
  ('service_content', '間歇', 2),
  ('service_content', '関助リフト使用', 3),
  ('service_content', 'ストレッチャー対応', 4),
  ('service_content', '酸素吸入対応', 5);

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_reservations_updated_at before update on public.reservations
  for each row execute function public.handle_updated_at();
create trigger handle_clients_updated_at before update on public.clients
  for each row execute function public.handle_updated_at();
create trigger handle_drivers_updated_at before update on public.drivers
  for each row execute function public.handle_updated_at();
create trigger handle_vehicles_updated_at before update on public.vehicles
  for each row execute function public.handle_updated_at();
