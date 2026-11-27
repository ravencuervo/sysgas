-- ══════════════════════════════════════════════════════════════════════════════
-- SYSGAS · Migración 020: Locales con Google Maps, Lotes de Balones y Entregas
-- Compatible con Web (/admin, /panel, /gasero, Landing) y App Móvil Android
-- ══════════════════════════════════════════════════════════════════════════════
begin;

-- 1. Locales de dispensa (sedes propias SYSGAS y distribuidoras afiliadas)
create table if not exists public.locales_dispensa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas_distribuidoras(id) on delete cascade,
  nombre_local text not null check (length(trim(nombre_local)) between 2 and 160),
  tipo text not null default 'Distribuidora afiliada'
    check (tipo in ('Sede propia', 'Distribuidora afiliada', 'Centro de dispensa')),
  ruc text check (ruc is null or ruc = '' or ruc ~ '^[0-9]{11}$'),
  ciudad text not null default 'Puno' check (length(trim(ciudad)) between 2 and 80),
  zona text not null default '',
  direccion text not null check (length(trim(direccion)) between 4 and 300),
  coordenadas text not null default '',
  latitud numeric(9,6),
  longitud numeric(9,6),
  estado text not null default 'activo' check (estado in ('activo', 'piloto', 'suspendido', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_locales_dispensa_empresa on public.locales_dispensa(empresa_id);
create index if not exists idx_locales_dispensa_ciudad on public.locales_dispensa(ciudad);

alter table public.locales_dispensa enable row level security;

drop policy if exists "locales_lectura_autenticados" on public.locales_dispensa;
create policy "locales_lectura_autenticados" on public.locales_dispensa
  for select to authenticated using (true);

drop policy if exists "locales_admin_gestion" on public.locales_dispensa;
create policy "locales_admin_gestion" on public.locales_dispensa
  for all to authenticated
  using (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo and (
        p.rol = 'super_admin'
        or (p.rol = 'empresa_admin' and p.empresa_id = locales_dispensa.empresa_id)
      )
    )
  )
  with check (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo and (
        p.rol = 'super_admin'
        or (p.rol = 'empresa_admin' and p.empresa_id = locales_dispensa.empresa_id)
      )
    )
  );

grant select, insert, update, delete on public.locales_dispensa to authenticated;

-- 2. Lotes de balones (entrada / salida por kg y control de calidad)
create table if not exists public.lotes_balones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas_distribuidoras(id) on delete cascade,
  local_id uuid references public.locales_dispensa(id) on delete set null,
  codigo_lote text not null check (length(trim(codigo_lote)) between 2 and 60),
  capacidad public.capacidad_cilindro not null default '10kg',
  cantidad integer not null check (cantidad between 1 and 5000),
  movimiento text not null check (movimiento in ('Entrada', 'Salida')),
  tara_unitaria_kg numeric(6,2) not null check (tara_unitaria_kg >= 0),
  peso_neto_unitario_kg numeric(6,2) not null check (peso_neto_unitario_kg >= 0),
  peso_total_kg numeric(10,2) not null check (peso_total_kg >= 0),
  calidad text not null default 'Apto'
    check (calidad in ('Apto', 'En inspección', 'Mantenimiento')),
  codigos_qr text not null default '',
  ultima_prueba date not null default current_date,
  registrado_por uuid references public.perfiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_lotes_balones_empresa on public.lotes_balones(empresa_id, created_at desc);
create index if not exists idx_lotes_balones_local on public.lotes_balones(local_id);

alter table public.lotes_balones enable row level security;

drop policy if exists "lotes_gestion_autorizada" on public.lotes_balones;
create policy "lotes_gestion_autorizada" on public.lotes_balones
  for all to authenticated
  using (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo and (
        p.rol = 'super_admin'
        or (
          p.empresa_id = lotes_balones.empresa_id
          and p.rol in ('empresa_admin', 'supervisor_calidad', 'planta_operador', 'chofer_repartidor')
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo and (
        p.rol = 'super_admin'
        or (
          p.empresa_id = lotes_balones.empresa_id
          and p.rol in ('empresa_admin', 'supervisor_calidad', 'planta_operador')
        )
      )
    )
  );

grant select, insert, update, delete on public.lotes_balones to authenticated;

-- 3. Campos de Google Maps, pesaje en puerta y cobro en pedidos
alter table public.pedidos
  add column if not exists coordenadas text not null default '',
  add column if not exists metodo_pago text not null default 'Efectivo',
  add column if not exists vacio_recuperado boolean not null default false,
  add column if not exists peso_bruto_entrega_kg numeric(6,2),
  add column if not exists tara_entrega_kg numeric(6,2),
  add column if not exists peso_neto_entrega_kg numeric(6,2);

-- 4. Permitir envío de solicitudes de afiliación desde la landing page (sin WhatsApp)
drop policy if exists "Cualquiera puede enviar solicitud de afiliación" on public.solicitudes_afiliacion;
create policy "Cualquiera puede enviar solicitud de afiliación" on public.solicitudes_afiliacion
  for insert to anon, authenticated
  with check (
    length(trim(nombre_empresa)) between 2 and 150
    and length(trim(representante_nombre)) between 2 and 120
    and length(trim(telefono)) between 7 and 20
    and length(trim(correo)) between 5 and 120
    and volumen_mensual_balones > 0
  );

grant insert on public.solicitudes_afiliacion to anon, authenticated;

commit;
