begin;
create table if not exists public.planes_suscripcion (
 id uuid primary key default gen_random_uuid(), nombre text not null check(length(nombre) between 2 and 80),
 precio_pen numeric(10,2) not null check(precio_pen>0), dias integer not null default 30 check(dias between 1 and 366), activo boolean not null default true
);
create table if not exists public.suscripciones_empresas (
 empresa_id uuid primary key references public.empresas_distribuidoras(id), plan_id uuid references public.planes_suscripcion(id),
 estado text not null default 'pendiente' check(estado in ('pendiente','activa','suspendida')), vigente_hasta timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.pagos_membresia (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas_distribuidoras(id),
 plan_id uuid not null references public.planes_suscripcion(id), importe_pen numeric(10,2) not null check(importe_pen>0),
 referencia text not null check(length(trim(referencia)) between 3 and 150), estado text not null default 'pendiente' check(estado in ('pendiente','verificado','rechazado')),
 dias integer not null check(dias between 1 and 366), revisado_por uuid references public.perfiles(id), created_at timestamptz not null default now(),
 unique(empresa_id,referencia)
);
create table if not exists public.invitaciones_personal (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas_distribuidoras(id),
 correo text not null, cargo text not null check(cargo in ('motorizado','operador_flota')),
 estado text not null default 'pendiente' check(estado in ('pendiente','aceptada','revocada')),
 usuario_id uuid references public.perfiles(id), creado_por uuid not null references public.perfiles(id), created_at timestamptz not null default now(),
 unique(empresa_id,correo)
);
create table if not exists public.notificaciones (
 id uuid primary key default gen_random_uuid(), usuario_id uuid not null references public.perfiles(id), titulo text not null,
 leida boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.auditoria_operaciones (
 id bigint generated always as identity primary key, empresa_id uuid references public.empresas_distribuidoras(id),
 usuario_id uuid references public.perfiles(id), operacion text not null, entidad_id uuid, detalle jsonb not null default '{}', created_at timestamptz not null default now()
);

create or replace function public.es_superadmin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfiles where id=auth.uid() and activo and rol='super_admin');
$$;
create or replace function public.puede_gestionar(p_empresa uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.es_superadmin() or exists(select 1 from public.perfiles where id=auth.uid() and activo and rol='empresa_admin' and empresa_id=p_empresa);
$$;
create or replace function public.membresia_activa(p_empresa uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.suscripciones_empresas s join public.empresas_distribuidoras e on e.id=s.empresa_id
 where s.empresa_id=p_empresa and s.estado='activa' and s.vigente_hasta>now() and e.estado='activo');
$$;
create or replace function public.exigir_operacion(p_empresa uuid) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='No tienes permiso para gestionar esta empresa.'; end if;
 if not public.es_superadmin() and not public.membresia_activa(p_empresa) then raise exception using errcode='P0001',message='La membresía no está vigente. Revisa Membresía.'; end if;
end; $$;

alter table public.planes_suscripcion enable row level security;
alter table public.suscripciones_empresas enable row level security;
alter table public.pagos_membresia enable row level security;
alter table public.invitaciones_personal enable row level security;
alter table public.notificaciones enable row level security;
alter table public.auditoria_operaciones enable row level security;
drop policy if exists planes_lectura on public.planes_suscripcion;
create policy planes_lectura on public.planes_suscripcion for select to authenticated using(activo or public.es_superadmin());
drop policy if exists suscripciones_lectura on public.suscripciones_empresas;
create policy suscripciones_lectura on public.suscripciones_empresas for select to authenticated using(public.puede_gestionar(empresa_id));
drop policy if exists pagos_membresia_lectura on public.pagos_membresia;
create policy pagos_membresia_lectura on public.pagos_membresia for select to authenticated using(public.puede_gestionar(empresa_id));
drop policy if exists invitaciones_lectura on public.invitaciones_personal;
create policy invitaciones_lectura on public.invitaciones_personal for select to authenticated using(public.puede_gestionar(empresa_id) or exists(select 1 from auth.users u where u.id=auth.uid() and lower(u.email)=correo));
-- La comparación de correo se hace en una función para no otorgar SELECT sobre auth.users.
create or replace function public.mi_correo() returns text language sql stable security definer set search_path='' as $$ select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null; $$;
drop policy invitaciones_lectura on public.invitaciones_personal;
create policy invitaciones_lectura on public.invitaciones_personal for select to authenticated using(public.puede_gestionar(empresa_id) or correo=public.mi_correo());
drop policy if exists notificaciones_propias on public.notificaciones;
create policy notificaciones_propias on public.notificaciones for select to authenticated using(usuario_id=auth.uid());
drop policy if exists auditoria_lectura on public.auditoria_operaciones;
create policy auditoria_lectura on public.auditoria_operaciones for select to authenticated using(public.puede_gestionar(empresa_id));
grant select on public.planes_suscripcion,public.suscripciones_empresas,public.pagos_membresia,public.invitaciones_personal,public.notificaciones,public.auditoria_operaciones to authenticated;
revoke insert,update,delete on public.planes_suscripcion,public.suscripciones_empresas,public.pagos_membresia,public.invitaciones_personal,public.notificaciones,public.auditoria_operaciones from anon,authenticated;

create or replace function public.gestion_membresia(p_accion text,p_datos jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_empresa uuid; plan public.planes_suscripcion; pago public.pagos_membresia;
begin
 if p_accion='plan' then
  if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS administra planes.'; end if;
  insert into public.planes_suscripcion(nombre,precio_pen,dias) values(trim(p_datos->>'nombre'),(p_datos->>'precio')::numeric,(p_datos->>'dias')::integer) returning id into v_id;
 elsif p_accion='pago' then
  v_empresa:=(p_datos->>'empresa_id')::uuid;
  if not public.puede_gestionar(v_empresa) then raise exception using errcode='42501',message='Empresa no autorizada.'; end if;
  select * into plan from public.planes_suscripcion where id=(p_datos->>'plan_id')::uuid and activo;
  if not found then raise exception using errcode='P0001',message='El plan no está disponible.'; end if;
  insert into public.pagos_membresia(empresa_id,plan_id,importe_pen,referencia,dias) values(v_empresa,plan.id,plan.precio_pen,trim(p_datos->>'referencia'),plan.dias) returning id into v_id;
 elsif p_accion in ('verificar','rechazar') then
  if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS verifica pagos.'; end if;
  select * into pago from public.pagos_membresia where id=(p_datos->>'pago_id')::uuid for update;
  if not found or pago.estado<>'pendiente' then raise exception using errcode='P0001',message='El pago ya fue revisado o no existe.'; end if;
  v_empresa:=pago.empresa_id; v_id:=pago.id;
  -- Serializa renovaciones de la misma empresa, aunque sean pagos diferentes.
  perform 1 from public.empresas_distribuidoras where id=v_empresa for update;
  update public.pagos_membresia set estado=case when p_accion='verificar' then 'verificado' else 'rechazado' end,revisado_por=auth.uid() where id=pago.id;
  if p_accion='verificar' then
   insert into public.suscripciones_empresas(empresa_id,plan_id,estado,vigente_hasta) values(v_empresa,pago.plan_id,'activa',now()+make_interval(days=>pago.dias))
   on conflict(empresa_id) do update set plan_id=excluded.plan_id,estado='activa',vigente_hasta=greatest(now(),public.suscripciones_empresas.vigente_hasta)+make_interval(days=>pago.dias),updated_at=now();
  end if;
 elsif p_accion in ('suspender','reanudar') then
  if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS gestiona suscripciones.'; end if;
  v_empresa:=(p_datos->>'empresa_id')::uuid; v_id:=v_empresa;
  update public.suscripciones_empresas set estado=case when p_accion='suspender' then 'suspendida' else 'activa' end,updated_at=now() where empresa_id=v_empresa;
  if not found then raise exception using errcode='P0001',message='Esta empresa aún no tiene suscripción.'; end if;
 else raise exception using errcode='P0001',message='Acción no válida.';
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(v_empresa,auth.uid(),'membresia_'||p_accion,v_id);
 return v_id;
end; $$;

create or replace function public.gestion_personal(p_accion text,p_empresa uuid,p_correo text default '',p_cargo text default '',p_usuario uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid; invitacion public.invitaciones_personal; v_perfil public.perfiles;
begin
 if p_accion='aceptar' then
  select * into invitacion from public.invitaciones_personal where empresa_id=p_empresa and correo=public.mi_correo() and estado='pendiente' for update;
  if not found or not public.membresia_activa(p_empresa) then raise exception using errcode='P0001',message='No hay una invitación activa para tu correo o la empresa no tiene membresía.'; end if;
  select * into v_perfil from public.perfiles where id=auth.uid() for update;
  if not found or not v_perfil.activo or v_perfil.rol<>'cliente_comun' or v_perfil.empresa_id is not null then raise exception using errcode='P0001',message='Tu cuenta ya tiene un rol empresarial o está desactivada.'; end if;
  update public.perfiles set empresa_id=p_empresa,rol=case when invitacion.cargo='motorizado' then 'chofer_repartidor'::public.rol_usuario else 'planta_operador'::public.rol_usuario end where id=auth.uid();
  update public.invitaciones_personal set estado='aceptada',usuario_id=auth.uid() where id=invitacion.id;
 else
  perform public.exigir_operacion(p_empresa);
  if p_accion='invitar' then
   if p_cargo not in ('motorizado','operador_flota') or p_cargo is null or p_correo !~ '^[^ @]+@[^ @]+\.[^ @]+$' or length(p_correo)>120 then raise exception using errcode='P0001',message='Revisa el correo y el cargo.'; end if;
   insert into public.invitaciones_personal(empresa_id,correo,cargo,creado_por) values(p_empresa,lower(trim(p_correo)),p_cargo,auth.uid());
  elsif p_accion='revocar' then
   update public.invitaciones_personal set estado='revocada' where empresa_id=p_empresa and correo=lower(trim(p_correo)) and estado='pendiente';
  elsif p_accion in ('desactivar','activar') then
   update public.perfiles set activo=(p_accion='activar') where id=p_usuario and empresa_id=p_empresa and rol in ('chofer_repartidor','planta_operador');
   if not found then raise exception using errcode='P0001',message='Trabajador no encontrado en esta empresa.'; end if;
  else raise exception using errcode='P0001',message='Acción no válida.';
  end if;
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),'personal_'||p_accion,p_usuario);
end; $$;

create or replace function public.listar_personal(p_empresa uuid) returns table(id uuid,nombres text,correo text,rol text,activo boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Empresa no autorizada.'; end if;
 return query select p.id,(p.nombres||' '||p.apellidos)::text,p.correo::text,p.rol::text,p.activo from public.perfiles p where p.empresa_id=p_empresa and p.rol in ('chofer_repartidor','planta_operador') order by p.nombres;
end; $$;

-- La suspensión conserva historial y lectura, pero bloquea nueva operación comercial.
create or replace function public.validar_membresia_operacion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='pedidos' and tg_op='INSERT' then
  if not public.membresia_activa(new.empresa_id) then raise exception using errcode='P0001',message='Esta distribuidora no tiene una membresía vigente.'; end if;
 elsif not public.es_superadmin() and not public.membresia_activa(new.empresa_id) then
  raise exception using errcode='P0001',message='La membresía no está vigente. No se puede modificar la operación.';
 end if;
 return new;
end; $$;
drop trigger if exists validar_membresia_pedido on public.pedidos;
create trigger validar_membresia_pedido before insert or update on public.pedidos for each row execute function public.validar_membresia_operacion();
drop trigger if exists validar_membresia_inventario on public.inventario_empresa;
create trigger validar_membresia_inventario before insert or update on public.inventario_empresa for each row execute function public.validar_membresia_operacion();

create or replace function public.ofertas_distribuidoras()
returns table(empresa_id uuid,empresa_nombre text,ciudad text,capacidad public.capacidad_cilindro,precio_pen numeric,stock integer)
language sql stable security definer set search_path='' as $$
 select i.empresa_id,coalesce(e.nombre_comercial,e.razon_social)::text,e.ciudad::text,i.capacidad,i.precio_pen,i.stock
 from public.inventario_empresa i join public.empresas_distribuidoras e on e.id=i.empresa_id
 where e.estado='activo' and i.activo and public.membresia_activa(e.id) order by e.razon_social,i.capacidad;
$$;

revoke all on function public.gestion_membresia(text,jsonb),public.gestion_personal(text,uuid,text,text,uuid),public.listar_personal(uuid) from public;
grant execute on function public.gestion_membresia(text,jsonb),public.gestion_personal(text,uuid,text,text,uuid),public.listar_personal(uuid) to authenticated;
revoke all on function public.es_superadmin(),public.puede_gestionar(uuid),public.mi_correo(),public.exigir_operacion(uuid) from public;
grant execute on function public.es_superadmin(),public.puede_gestionar(uuid),public.mi_correo() to authenticated;
-- membresia_activa expone solo un booleano, usado por el catálogo público.
revoke all on function public.membresia_activa(uuid) from public;
grant execute on function public.membresia_activa(uuid) to anon,authenticated;
commit;
