-- SYSGAS: ejecutar tras respaldo y después de las migraciones 001 y 002.
-- No borra tablas ni registros. Reemplaza funciones y políticas operativas.
-- Las empresas necesitan un pago de membresía verificado para operar.
begin;

-- 202610300003_operacion_empresa.sql
alter table public.pedidos add column if not exists stock_reservado boolean not null default false;
create table if not exists public.inventario_empresa (
  empresa_id uuid not null references public.empresas_distribuidoras(id),
  capacidad public.capacidad_cilindro not null,
  precio_pen numeric(8,2) not null check(precio_pen > 0),
  stock integer not null default 0 check(stock >= 0),
  activo boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(empresa_id,capacidad)
);
alter table public.inventario_empresa enable row level security;
drop policy if exists "inventario_de_empresa" on public.inventario_empresa;
create policy "inventario_de_empresa" on public.inventario_empresa for select to authenticated using (
  exists(select 1 from public.perfiles p where p.id=auth.uid() and p.activo
    and (p.rol='super_admin' or (p.rol='empresa_admin' and p.empresa_id=inventario_empresa.empresa_id)))
);
grant select on public.inventario_empresa to authenticated;

create or replace function public.ofertas_distribuidoras()
returns table(empresa_id uuid,empresa_nombre text,ciudad text,capacidad public.capacidad_cilindro,precio_pen numeric,stock integer)
language sql stable security definer set search_path='' as $$
  select i.empresa_id,coalesce(e.nombre_comercial,e.razon_social)::text,e.ciudad::text,i.capacidad,i.precio_pen,i.stock
  from public.inventario_empresa i join public.empresas_distribuidoras e on e.id=i.empresa_id
  where e.estado='activo' and i.activo order by e.razon_social,i.capacidad;
$$;
revoke all on function public.ofertas_distribuidoras() from public;
grant execute on function public.ofertas_distribuidoras() to anon,authenticated;

create or replace function public.guardar_inventario(p_empresa uuid,p_capacidad public.capacidad_cilindro,p_precio numeric,p_stock integer,p_activo boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.perfiles where id=auth.uid() and activo
    and (rol='super_admin' or (rol='empresa_admin' and empresa_id=p_empresa))) then
    raise exception using errcode='42501',message='Sin permiso para editar esta empresa.';
  end if;
  if p_precio is null or p_precio::text in ('NaN','Infinity','-Infinity') or p_precio<=0 or p_precio>999999.99 or p_stock is null or p_stock<0 or p_activo is null then
    raise exception using errcode='P0001',message='Revisa el precio y el stock.';
  end if;
  perform 1 from public.empresas_distribuidoras where id=p_empresa and estado='activo';
  if not found then raise exception using errcode='P0001',message='La empresa no está activa.'; end if;
  insert into public.inventario_empresa(empresa_id,capacidad,precio_pen,stock,activo)
    values(p_empresa,p_capacidad,p_precio,p_stock,p_activo)
    on conflict(empresa_id,capacidad) do update set precio_pen=excluded.precio_pen,stock=excluded.stock,activo=excluded.activo,updated_at=now();
end;
$$;
revoke all on function public.guardar_inventario(uuid,public.capacidad_cilindro,numeric,integer,boolean) from public;
grant execute on function public.guardar_inventario(uuid,public.capacidad_cilindro,numeric,integer,boolean) to authenticated;

-- Reemplaza el flujo antiguo que dejaba los pedidos sin distribuidora.
drop function if exists public.crear_pedido_web(text,text,text,text,public.capacidad_cilindro);
create or replace function public.crear_pedido_empresa(p_nombre text,p_telefono text,p_direccion text,p_referencia text,p_capacidad public.capacidad_cilindro,p_empresa uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_precio numeric; v_id uuid; v_cliente uuid; v_ticket text := 'TK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,24));
begin
  if p_nombre is null or length(trim(p_nombre)) not between 2 and 120 or p_telefono is null
    or length(p_telefono)>20 or p_telefono !~ '^\+?[0-9 ()-]{7,20}$' or p_direccion is null
    or length(trim(p_direccion)) not between 5 and 500 or length(coalesce(p_referencia,''))>500 then
    raise exception using errcode='P0001',message='Revisa el nombre, teléfono y dirección de entrega.';
  end if;
  perform 1 from public.empresas_distribuidoras where id=p_empresa and estado='activo' for share;
  if not found then raise exception using errcode='P0001',message='Selecciona una distribuidora activa.'; end if;
  -- La actualización bloquea el inventario: dos pedidos no pueden vender la última unidad.
  update public.inventario_empresa set stock=stock-1,updated_at=now()
    where empresa_id=p_empresa and capacidad=p_capacidad and activo and stock>0 returning precio_pen into v_precio;
  if v_precio is null then raise exception using errcode='P0001',message='El producto se agotó. Actualiza las opciones.'; end if;
  select id into v_cliente from public.perfiles where id=auth.uid() and activo;
  if auth.uid() is not null and v_cliente is null then raise exception using errcode='42501',message='Tu cuenta no está activa.'; end if;
  insert into public.pedidos(codigo_ticket,cliente_id,empresa_id,nombre_destinatario,telefono_contacto,direccion_entrega,referencia_direccion,total_pedido_pen,stock_reservado)
    values(v_ticket,v_cliente,p_empresa,trim(p_nombre),trim(p_telefono),trim(p_direccion),p_referencia,v_precio,true) returning id into v_id;
  insert into public.pedido_items(pedido_id,capacidad,cantidad,precio_unitario_pen,subtotal_pen) values(v_id,p_capacidad,1,v_precio,v_precio);
  return v_ticket;
end;
$$;
revoke all on function public.crear_pedido_empresa(text,text,text,text,public.capacidad_cilindro,uuid) from public;
grant execute on function public.crear_pedido_empresa(text,text,text,text,public.capacidad_cilindro,uuid) to anon,authenticated;

create or replace function public.cambiar_estado_pedido(p_pedido uuid,p_estado public.estado_pedido)
returns void language plpgsql security definer set search_path='' as $$
declare o public.pedidos; item record;
begin
  select * into o from public.pedidos where id=p_pedido for update;
  if not found or not exists(select 1 from public.perfiles p where p.id=auth.uid() and p.activo
    and (p.rol='super_admin' or (p.rol='empresa_admin' and p.empresa_id=o.empresa_id))) then
    raise exception using errcode='42501',message='Sin permiso para gestionar este pedido.';
  end if;
  if p_estado=o.estado then return; end if;
  if p_estado is null or o.estado in ('cancelado','entregado') or not (
    p_estado='cancelado' or (o.estado='pendiente' and p_estado='en_camino')
    or (o.estado='asignado_chofer' and p_estado='en_camino')
    or (o.estado='en_camino' and p_estado='en_puerta_pesaje')
    or (o.estado='en_puerta_pesaje' and p_estado='entregado')) then
    raise exception using errcode='P0001',message='Ese cambio de estado no está permitido.';
  end if;
  -- Solo los pedidos nuevos (con inventario reservado) se gestionan en este flujo.
  if not o.stock_reservado then
    raise exception using errcode='P0001',message='Pedido anterior al control de inventario: requiere revisión manual.';
  end if;
  if p_estado='cancelado' then
    for item in select capacidad,sum(cantidad) cantidad from public.pedido_items where pedido_id=o.id group by capacidad loop
      update public.inventario_empresa set stock=stock+item.cantidad,updated_at=now() where empresa_id=o.empresa_id and capacidad=item.capacidad;
    end loop;
  end if;
  update public.pedidos set estado=p_estado,fecha_hora_entrega=case when p_estado='entregado' then now() else fecha_hora_entrega end where id=o.id;
end;
$$;
revoke all on function public.cambiar_estado_pedido(uuid,public.estado_pedido) from public;
grant execute on function public.cambiar_estado_pedido(uuid,public.estado_pedido) to authenticated;
-- Solo el superadministrador necesita listar empresas para elegir cuál gestionar.
drop policy if exists "administrador_lista_empresas" on public.empresas_distribuidoras;
create policy "administrador_lista_empresas" on public.empresas_distribuidoras for select to authenticated
using(exists(select 1 from public.perfiles where id=auth.uid() and activo and (rol='super_admin' or empresa_id=empresas_distribuidoras.id)));
grant select on public.empresas_distribuidoras to authenticated;


-- 202610300004_membresias_personal.sql
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


-- 202610300005_logistica.sql
create table if not exists public.vehiculos_reparto (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 placa text not null unique check(length(trim(placa)) between 5 and 10),descripcion text not null,activo boolean not null default true
);
create table if not exists public.viajes_flota (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 camion_id uuid not null references public.camiones_flota(id),operador_id uuid not null references public.perfiles(id),
 origen text not null,destino text not null,cantidad_esperada integer not null default 0 check(cantidad_esperada>=0),estado text not null default 'preparacion' check(estado in ('preparacion','en_transito','recibido')),
 salida_at timestamptz,llegada_at timestamptz,created_at timestamptz not null default now()
);
alter table public.viajes_flota add column if not exists cantidad_esperada integer not null default 0 check(cantidad_esperada>=0);
create table if not exists public.detalle_cargas_balones (
 viaje_id uuid not null references public.viajes_flota(id),cilindro_id uuid not null references public.cilindros(id),
 lleno boolean not null,recibido_at timestamptz,primary key(viaje_id,cilindro_id)
);
alter table public.pedidos add column if not exists vehiculo_reparto_id uuid references public.vehiculos_reparto(id);
create table if not exists public.entregas_domiciliarias (
 pedido_id uuid primary key references public.pedidos(id),cilindro_id uuid not null references public.cilindros(id),
 vacio_id uuid references public.cilindros(id),responsable_id uuid not null references public.perfiles(id),created_at timestamptz not null default now()
);
create table if not exists public.ubicaciones_repartidores (
 pedido_id uuid primary key references public.pedidos(id),usuario_id uuid not null references public.perfiles(id),
 latitud numeric not null check(latitud between -90 and 90),longitud numeric not null check(longitud between -180 and 180),updated_at timestamptz not null default now()
);
create table if not exists public.incidencias (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 responsable_id uuid not null references public.perfiles(id),descripcion text not null check(length(trim(descripcion)) between 5 and 2000),
 estado text not null default 'abierta' check(estado in ('abierta','resuelta')),created_at timestamptz not null default now()
);
create table if not exists public.movimientos_inventario (
 id bigint generated always as identity primary key,empresa_id uuid not null references public.empresas_distribuidoras(id),
 capacidad public.capacidad_cilindro not null,diferencia integer not null,saldo integer not null,usuario_id uuid references public.perfiles(id),created_at timestamptz not null default now()
);

create or replace function public.pertenece_empresa(p_empresa uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.puede_gestionar(p_empresa) or exists(select 1 from public.perfiles where id=auth.uid() and activo and empresa_id=p_empresa and rol in ('chofer_repartidor','planta_operador'));
$$;
create or replace function public.registrar_movimiento_stock() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.movimientos_inventario(empresa_id,capacidad,diferencia,saldo,usuario_id) values(new.empresa_id,new.capacidad,new.stock,new.stock,auth.uid());
 elsif new.stock<>old.stock then
  insert into public.movimientos_inventario(empresa_id,capacidad,diferencia,saldo,usuario_id) values(new.empresa_id,new.capacidad,new.stock-old.stock,new.stock,auth.uid());
 end if;
 return new;
end; $$;
drop trigger if exists movimiento_stock on public.inventario_empresa;
create trigger movimiento_stock after insert or update on public.inventario_empresa for each row execute function public.registrar_movimiento_stock();

-- Accesos de lectura empresariales, escrituras solo mediante funciones autorizadas.
alter table public.vehiculos_reparto enable row level security;
alter table public.viajes_flota enable row level security;
alter table public.detalle_cargas_balones enable row level security;
alter table public.entregas_domiciliarias enable row level security;
alter table public.ubicaciones_repartidores enable row level security;
alter table public.incidencias enable row level security;
alter table public.movimientos_inventario enable row level security;
drop policy if exists vehiculos_empresa on public.vehiculos_reparto;
create policy vehiculos_empresa on public.vehiculos_reparto for select to authenticated using(public.puede_gestionar(empresa_id) or exists(select 1 from public.pedidos p where p.vehiculo_reparto_id=vehiculos_reparto.id and p.chofer_id=auth.uid() and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and public.pertenece_empresa(p.empresa_id)));
drop policy if exists camiones_empresa on public.camiones_flota;
create policy camiones_empresa on public.camiones_flota for select to authenticated using(public.puede_gestionar(empresa_id) or exists(select 1 from public.viajes_flota v where v.camion_id=camiones_flota.id and v.operador_id=auth.uid() and v.estado in ('preparacion','en_transito') and public.pertenece_empresa(v.empresa_id)));
drop policy if exists viajes_autorizados on public.viajes_flota;
create policy viajes_autorizados on public.viajes_flota for select to authenticated using(public.puede_gestionar(empresa_id) or (operador_id=auth.uid() and public.pertenece_empresa(empresa_id)));
drop policy if exists carga_autorizada on public.detalle_cargas_balones;
create policy carga_autorizada on public.detalle_cargas_balones for select to authenticated using(exists(select 1 from public.viajes_flota where id=viaje_id));
drop policy if exists incidencias_empresa on public.incidencias;
create policy incidencias_empresa on public.incidencias for select to authenticated using(public.puede_gestionar(empresa_id) or (responsable_id=auth.uid() and public.pertenece_empresa(empresa_id)));
drop policy if exists movimientos_empresa on public.movimientos_inventario;
create policy movimientos_empresa on public.movimientos_inventario for select to authenticated using(public.puede_gestionar(empresa_id));
drop policy if exists entrega_autorizada on public.entregas_domiciliarias;
create policy entrega_autorizada on public.entregas_domiciliarias for select to authenticated using(exists(select 1 from public.pedidos where id=pedido_id));
drop policy if exists ubicacion_activa on public.ubicaciones_repartidores;
create policy ubicacion_activa on public.ubicaciones_repartidores for select to authenticated using(exists(select 1 from public.pedidos p where p.id=pedido_id
 and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and (p.cliente_id=auth.uid() or p.chofer_id=auth.uid() or public.puede_gestionar(p.empresa_id))));
drop policy if exists "Los clientes ven sus propios pedidos" on public.pedidos;
create policy "Los clientes ven sus propios pedidos" on public.pedidos for select to authenticated using(
 exists(select 1 from public.perfiles p where p.id=auth.uid() and p.activo and
 (pedidos.cliente_id=p.id or public.puede_gestionar(pedidos.empresa_id) or (pedidos.chofer_id=p.id and p.empresa_id=pedidos.empresa_id and p.rol='chofer_repartidor'))));
drop policy if exists "Lectura pública de pasaporte QR de cilindros" on public.cilindros;
drop policy if exists cilindros_empresa on public.cilindros;
create policy cilindros_empresa on public.cilindros for select to authenticated using(public.puede_gestionar(empresa_duena_id) or exists(
 select 1 from public.detalle_cargas_balones d join public.viajes_flota v on v.id=d.viaje_id where d.cilindro_id=cilindros.id and v.operador_id=auth.uid() and public.pertenece_empresa(v.empresa_id)) or exists(
 select 1 from public.pedido_items i join public.pedidos p on p.id=i.pedido_id where i.cilindro_asignado_id=cilindros.id and p.chofer_id=auth.uid() and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and public.pertenece_empresa(p.empresa_id)));
drop policy if exists "Lectura pública del historial de eventos de trazabilidad" on public.cilindros_trazabilidad;
drop policy if exists trazabilidad_empresa on public.cilindros_trazabilidad;
create policy trazabilidad_empresa on public.cilindros_trazabilidad for select to authenticated using(exists(select 1 from public.cilindros c where c.id=cilindro_id));
grant select on public.vehiculos_reparto,public.camiones_flota,public.viajes_flota,public.detalle_cargas_balones,public.entregas_domiciliarias,public.ubicaciones_repartidores,public.incidencias,public.movimientos_inventario,public.cilindros,public.cilindros_trazabilidad to authenticated;
revoke insert,update,delete on public.vehiculos_reparto,public.camiones_flota,public.viajes_flota,public.detalle_cargas_balones,public.entregas_domiciliarias,public.ubicaciones_repartidores,public.incidencias,public.movimientos_inventario,public.cilindros,public.cilindros_trazabilidad from anon,authenticated;

create or replace function public.gestion_logistica(p_accion text,p_empresa uuid,p_datos jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; o public.pedidos; c public.cilindros; vac public.cilindros; v public.viajes_flota; code text; codigo text; item record; perfil public.perfiles;
begin
 select * into perfil from public.perfiles where id=auth.uid() and activo;
 if not found or not public.pertenece_empresa(p_empresa) or not public.membresia_activa(p_empresa) then
  raise exception using errcode='42501',message='Empresa no autorizada o membresía vencida.';
 end if;
 if p_accion in ('moto','camion','cilindro','viaje','asignar','resolver') then perform public.exigir_operacion(p_empresa); end if;
 if p_accion in ('moto','camion') and length(trim(coalesce(p_datos->>'placa',''))) not between 5 and 10 then raise exception using errcode='P0001',message='La placa debe tener entre 5 y 10 caracteres.'; end if;
 if p_accion='camion' and ((p_datos->>'capacidad') is null or (p_datos->>'capacidad')::integer not between 1 and 10000) then raise exception using errcode='P0001',message='La capacidad del camión debe estar entre 1 y 10000 balones.'; end if;
 if p_accion='moto' then
  insert into public.vehiculos_reparto(empresa_id,placa,descripcion) values(p_empresa,upper(trim(p_datos->>'placa')),trim(p_datos->>'descripcion')) returning id into v_id;
 elsif p_accion='camion' then
  insert into public.camiones_flota(empresa_id,placa,numero_unidad,capacidad_balones) values(p_empresa,upper(trim(p_datos->>'placa')),trim(p_datos->>'unidad'),(p_datos->>'capacidad')::integer) returning id into v_id;
 elsif p_accion='cilindro' then
  codigo:=trim(p_datos->>'codigo');
  if codigo is null or codigo !~ '^[A-Za-z0-9_-]{3,60}$' or p_datos->>'tara' is null or (p_datos->>'tara')::numeric::text in ('NaN','Infinity','-Infinity') or (p_datos->>'tara')::numeric<=0 or length(trim(coalesce(p_datos->>'serie',''))) not between 1 and 60 then raise exception using errcode='P0001',message='Código o tara inválidos.'; end if;
  insert into public.cilindros(codigo_qr,uuid_inmutable,numero_serie_fabricacion,capacidad,empresa_duena_id,tara_calibrada_kg,estado,aprobado_calidad)
   values(codigo,gen_random_uuid()::text,trim(p_datos->>'serie'),(p_datos->>'capacidad')::public.capacidad_cilindro,p_empresa,(p_datos->>'tara')::numeric,'en_mantenimiento',false) returning id into v_id;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,es_conforme) values(v_id,'Registro inicial','Cilindro registrado; pendiente de inspección.',perfil.nombres,false);
 elsif p_accion='inspeccionar' then
  perform public.exigir_operacion(p_empresa);
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or c.estado not in ('en_mantenimiento','en_planta','recuperado_vacio') then raise exception using errcode='P0001',message='Cilindro no disponible para inspección.'; end if;
  if (p_datos->>'aprobado')::boolean then
   update public.cilindros set aprobado_calidad=true,estado='en_planta',motivo_bloqueo=null where id=c.id;
  else update public.cilindros set aprobado_calidad=false,estado='en_mantenimiento',motivo_bloqueo=p_datos->>'detalle' where id=c.id; end if;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,es_conforme) values(c.id,'Inspección',p_datos->>'detalle',perfil.nombres,(p_datos->>'aprobado')::boolean); v_id:=c.id;
 elsif p_accion='llenar' then
  perform public.exigir_operacion(p_empresa);
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or c.estado<>'en_planta' or not c.aprobado_calidad then raise exception using errcode='P0001',message='El cilindro requiere inspección aprobada antes de llenar.'; end if;
  if p_datos->>'peso' is null or (p_datos->>'peso')::numeric::text in ('NaN','Infinity','-Infinity') or abs((p_datos->>'peso')::numeric-c.tara_calibrada_kg-replace(c.capacidad::text,'kg','')::numeric)>0.05 then raise exception using errcode='P0001',message='El peso neto debe corresponder a la capacidad, con tolerancia de 0.05 kg.'; end if;
  update public.cilindros set estado='en_almacen',peso_bruto_actual_kg=(p_datos->>'peso')::numeric,fecha_ultimo_envasado=now() where id=c.id;
  update public.inventario_empresa set stock=stock+1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad;
  if not found then raise exception using errcode='P0001',message='Configura primero el precio de esta capacidad en inventario.'; end if;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,peso_registrado_kg) values(c.id,'Llenado','Llenado y pesaje registrados.',perfil.nombres,(p_datos->>'peso')::numeric); v_id:=c.id;
 elsif p_accion='viaje' then
  if not exists(select 1 from public.camiones_flota where id=(p_datos->>'camion_id')::uuid and empresa_id=p_empresa and activo) or
   not exists(select 1 from public.perfiles where id=(p_datos->>'operador_id')::uuid and empresa_id=p_empresa and activo and rol='planta_operador') then raise exception using errcode='P0001',message='Camión u operador no autorizado.'; end if;
  if length(trim(coalesce(p_datos->>'origen','')))<3 or length(trim(coalesce(p_datos->>'destino','')))<3 then raise exception using errcode='P0001',message='Completa origen y destino.'; end if;
  if p_datos->>'esperados' is null or (p_datos->>'esperados')::integer<1 or (p_datos->>'esperados')::integer>(select capacidad_balones from public.camiones_flota where id=(p_datos->>'camion_id')::uuid) then raise exception using errcode='P0001',message='La cantidad esperada debe ser positiva y respetar la capacidad del camión.'; end if;
  insert into public.viajes_flota(empresa_id,camion_id,operador_id,origen,destino,cantidad_esperada) values(p_empresa,(p_datos->>'camion_id')::uuid,(p_datos->>'operador_id')::uuid,p_datos->>'origen',p_datos->>'destino',(p_datos->>'esperados')::integer) returning id into v_id;
 elsif p_accion in ('cargar','recibir') then
  select * into v from public.viajes_flota where id=(p_datos->>'viaje_id')::uuid and empresa_id=p_empresa for update;
  if not found or not (public.puede_gestionar(p_empresa) or v.operador_id=auth.uid()) then raise exception using errcode='42501',message='Viaje no autorizado.'; end if;
  if jsonb_typeof(p_datos->'codigos')<>'array' or jsonb_array_length(p_datos->'codigos') not between 1 and 500 then raise exception using errcode='P0001',message='Registra entre 1 y 500 códigos.'; end if;
  if (select count(*)<>count(distinct value) from jsonb_array_elements_text(p_datos->'codigos')) then raise exception using errcode='P0001',message='La lista contiene códigos repetidos.'; end if;
  if (p_accion='cargar' and v.estado<>'preparacion') or (p_accion='recibir' and v.estado<>'en_transito') then raise exception using errcode='P0001',message='El estado del viaje no permite esta operación.'; end if;
  if p_accion='cargar' and jsonb_array_length(p_datos->'codigos')>(select capacidad_balones from public.camiones_flota where id=v.camion_id) then raise exception using errcode='P0001',message='La carga supera la capacidad del camión.'; end if;
  if p_accion='cargar' and v.cantidad_esperada<>jsonb_array_length(p_datos->'codigos') then
   if length(trim(coalesce(p_datos->>'diferencia','')))<5 then raise exception using errcode='P0001',message='La cantidad escaneada difiere de la esperada. Registra la justificación.'; end if;
   insert into public.incidencias(empresa_id,responsable_id,descripcion) values(p_empresa,auth.uid(),'Diferencia de carga: esperados '||v.cantidad_esperada||', registrados '||jsonb_array_length(p_datos->'codigos')||'. '||(p_datos->>'diferencia'));
  end if;
  for code in select value from jsonb_array_elements_text(p_datos->'codigos') order by value loop
   select * into c from public.cilindros where codigo_qr=code and empresa_duena_id=p_empresa for update;
   if not found then raise exception using errcode='P0001',message='Código no pertenece a la empresa: '||code; end if;
   if p_accion='cargar' then
    if c.estado not in ('en_almacen','recuperado_vacio') or (c.estado='en_almacen' and not c.aprobado_calidad) then raise exception using errcode='P0001',message='Cilindro no disponible: '||code; end if;
    insert into public.detalle_cargas_balones(viaje_id,cilindro_id,lleno) values(v.id,c.id,c.estado='en_almacen');
    if c.estado='en_almacen' then
     update public.inventario_empresa set stock=stock-1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad and stock>0;
     if not found then raise exception using errcode='P0001',message='Stock insuficiente para la carga.'; end if;
    end if;
    update public.cilindros set estado='cargado_camion',camion_actual_id=v.camion_id where id=c.id;
   else
    select * into item from public.detalle_cargas_balones where viaje_id=v.id and cilindro_id=c.id and recibido_at is null;
    if not found or c.camion_actual_id is distinct from v.camion_id or c.estado<>'cargado_camion' then raise exception using errcode='P0001',message='Cilindro no pendiente en este viaje: '||code; end if;
    update public.detalle_cargas_balones set recibido_at=now() where viaje_id=v.id and cilindro_id=c.id;
    update public.cilindros set estado=case when item.lleno then 'en_almacen'::public.estado_cilindro else 'recuperado_vacio'::public.estado_cilindro end,camion_actual_id=null where id=c.id;
    if item.lleno then update public.inventario_empresa set stock=stock+1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad; end if;
   end if;
   insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(c.id,case when p_accion='cargar' then 'Carga masiva' else 'Recepción de carga' end,v.origen||' → '||v.destino,perfil.nombres);
  end loop;
  if p_accion='cargar' then update public.viajes_flota set estado='en_transito',salida_at=now() where id=v.id;
  elsif not exists(select 1 from public.detalle_cargas_balones where viaje_id=v.id and recibido_at is null) then update public.viajes_flota set estado='recibido',llegada_at=now() where id=v.id; end if;
  v_id:=v.id;
 elsif p_accion='asignar' then
  select * into o from public.pedidos where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa for update;
  if not found or o.estado not in ('pendiente','asignado_chofer') or not o.stock_reservado then raise exception using errcode='P0001',message='Pedido no disponible para asignación.'; end if;
  if not exists(select 1 from public.perfiles where id=(p_datos->>'chofer_id')::uuid and empresa_id=p_empresa and activo and rol='chofer_repartidor') then raise exception using errcode='P0001',message='El motorizado debe pertenecer a tu empresa.'; end if;
  if not exists(select 1 from public.vehiculos_reparto where id=(p_datos->>'vehiculo_id')::uuid and empresa_id=p_empresa and activo) then raise exception using errcode='P0001',message='Vehículo no autorizado.'; end if;
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or not c.aprobado_calidad or c.estado<>'en_almacen' or not exists(select 1 from public.pedido_items where pedido_id=o.id and capacidad=c.capacidad) then raise exception using errcode='P0001',message='Cilindro no disponible o capacidad incorrecta.'; end if;
  -- En este flujo cada pedido web contiene una sola unidad.
  for item in select cilindro_asignado_id from public.pedido_items where pedido_id=o.id and cilindro_asignado_id is not null loop
   update public.cilindros set estado='en_almacen' where id=item.cilindro_asignado_id and id<>c.id;
  end loop;
  update public.pedido_items set cilindro_asignado_id=c.id where pedido_id=o.id;
  update public.cilindros set estado='en_ruta_entrega' where id=c.id;
  update public.pedidos set chofer_id=(p_datos->>'chofer_id')::uuid,vehiculo_reparto_id=(p_datos->>'vehiculo_id')::uuid,estado='asignado_chofer',fecha_hora_asignacion=now() where id=o.id;
  insert into public.notificaciones(usuario_id,titulo) values((p_datos->>'chofer_id')::uuid,'Nuevo pedido asignado: '||o.codigo_ticket); v_id:=o.id;
 elsif p_accion='entregar' then
  select * into o from public.pedidos where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa for update;
  if not found or o.estado<>'en_puerta_pesaje' or not (public.puede_gestionar(p_empresa) or o.chofer_id=auth.uid()) then raise exception using errcode='42501',message='Pedido no autorizado para entrega.'; end if;
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or not c.aprobado_calidad or c.estado<>'en_ruta_entrega' or not exists(select 1 from public.pedido_items where pedido_id=o.id and cilindro_asignado_id=c.id) then raise exception using errcode='P0001',message='El código no corresponde al balón asignado.'; end if;
  if nullif(trim(p_datos->>'vacio'),'') is not null then
   select * into vac from public.cilindros where codigo_qr=trim(p_datos->>'vacio') and empresa_duena_id=p_empresa for update;
   if not found or vac.id=c.id or vac.estado<>'entregado_cliente' or (vac.cliente_actual_id is not null and vac.cliente_actual_id is distinct from o.cliente_id) then raise exception using errcode='P0001',message='El balón vacío no corresponde a este cliente.'; end if;
   update public.cilindros set estado='recuperado_vacio',cliente_actual_id=null where id=vac.id;
   insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(vac.id,'Recuperación de vacío','Devolución registrada.',perfil.nombres);
  end if;
  if nullif(trim(p_datos->>'balanza'),'') is null or p_datos->>'peso' is null
   or (p_datos->>'peso')::numeric::text in ('NaN','Infinity','-Infinity')
   or abs((p_datos->>'peso')::numeric-c.tara_calibrada_kg-replace(c.capacidad::text,'kg','')::numeric)>0.05 then
   raise exception using errcode='P0001',message='Registra la balanza y un peso neto conforme a la capacidad (tolerancia 0.05 kg).';
  end if;
  insert into public.pesajes_entrega(pedido_id,cilindro_entregado_id,cilindro_vacio_retornado_id,chofer_id,id_balanza_bluetooth,peso_bruto_medido_kg,tara_descontada_kg,peso_neto_calculado_kg,pesaje_aprobado)
    values(o.id,c.id,vac.id,o.chofer_id,trim(p_datos->>'balanza'),(p_datos->>'peso')::numeric,c.tara_calibrada_kg,(p_datos->>'peso')::numeric-c.tara_calibrada_kg,true);
  insert into public.entregas_domiciliarias(pedido_id,cilindro_id,vacio_id,responsable_id) values(o.id,c.id,vac.id,auth.uid());
  update public.cilindros set estado='entregado_cliente',cliente_actual_id=o.cliente_id where id=c.id;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(c.id,'Entrega a cliente','Entrega confirmada mediante código del cilindro.',perfil.nombres);
  update public.pedidos set estado='entregado',fecha_hora_entrega=now() where id=o.id;
  delete from public.ubicaciones_repartidores where pedido_id=o.id;
  if o.cliente_id is not null then insert into public.notificaciones(usuario_id,titulo) values(o.cliente_id,'Pedido entregado: '||o.codigo_ticket); end if; v_id:=o.id;
 elsif p_accion='incidencia' then
  insert into public.incidencias(empresa_id,responsable_id,descripcion) values(p_empresa,auth.uid(),trim(p_datos->>'descripcion')) returning id into v_id;
 elsif p_accion='resolver' then
  update public.incidencias set estado='resuelta' where id=(p_datos->>'id')::uuid and empresa_id=p_empresa returning id into v_id;
 elsif p_accion='cobro' then
  perform public.exigir_operacion(p_empresa);
  update public.pedidos set estado_pago='completado',metodo_pago=(p_datos->>'metodo')::public.metodo_pago where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa and estado='entregado' and estado_pago='pendiente' returning id into v_id;
  if v_id is null then raise exception using errcode='P0001',message='Solo se registran cobros pendientes de pedidos entregados.'; end if;
 else raise exception using errcode='P0001',message='Operación no válida.';
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),p_accion,v_id);
 return v_id;
end; $$;

create or replace function public.compartir_ubicacion(p_pedido uuid,p_latitud numeric,p_longitud numeric) returns void language plpgsql security definer set search_path='' as $$
declare o public.pedidos;
begin
 select * into o from public.pedidos where id=p_pedido for share;
 if not found or o.chofer_id is distinct from auth.uid() or not public.pertenece_empresa(o.empresa_id) or not public.membresia_activa(o.empresa_id)
 or o.estado not in ('asignado_chofer','en_camino','en_puerta_pesaje') then raise exception using errcode='42501',message='Ubicación permitida solo durante tu entrega asignada.'; end if;
 insert into public.ubicaciones_repartidores(pedido_id,usuario_id,latitud,longitud) values(o.id,auth.uid(),p_latitud,p_longitud)
 on conflict(pedido_id) do update set usuario_id=excluded.usuario_id,latitud=excluded.latitud,longitud=excluded.longitud,updated_at=now();
end; $$;

-- El pasaporte público excluye nombres de trabajadores y descripciones/rutas internas.
create or replace function public.pasaporte_publico(p_codigo text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('codigo',c.codigo_qr,'uuid',c.uuid_inmutable,'tipo',c.capacidad::text,
 'tara',c.tara_calibrada_kg::text||' kg','pesoBruto',coalesce(c.peso_bruto_actual_kg::text||' kg','Sin registro'),
 'estado',upper(replace(c.estado::text,'_',' ')),'planta',coalesce(e.nombre_comercial,e.razon_social,'Sin registro'),
 'fechaLlenado',to_char(c.fecha_ultimo_envasado at time zone 'America/Lima','DD/MM/YYYY HH24:MI'),
 'operadorLlenado','Información reservada','eventos',coalesce((select jsonb_agg(jsonb_build_object('fecha',to_char(t.created_at at time zone 'America/Lima','DD/MM/YYYY HH24:MI'),
 'evento',t.tipo_evento,'detalle','Movimiento registrado por la empresa responsable.','operador','SYSGAS','icono',t.icono_bootstrap,'ok',t.es_conforme) order by t.created_at,t.id)
 from public.cilindros_trazabilidad t where t.cilindro_id=c.id),'[]'::jsonb),'certificados','[]'::jsonb)
 from public.cilindros c left join public.empresas_distribuidoras e on e.id=c.empresa_duena_id where c.codigo_qr=p_codigo limit 1;
$$;
revoke all on function public.pertenece_empresa(uuid),public.gestion_logistica(text,uuid,jsonb),public.compartir_ubicacion(uuid,numeric,numeric) from public;
grant execute on function public.pertenece_empresa(uuid),public.gestion_logistica(text,uuid,jsonb),public.compartir_ubicacion(uuid,numeric,numeric) to authenticated;


-- 202610300006_controles_reportes.sql
create table if not exists public.zonas_cobertura (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),ciudad text not null,zona text not null,
 unique(empresa_id,ciudad,zona)
);
alter table public.zonas_cobertura enable row level security;
drop policy if exists cobertura_publica on public.zonas_cobertura;
create policy cobertura_publica on public.zonas_cobertura for select using(true);
grant select on public.zonas_cobertura to anon,authenticated;
revoke insert,update,delete on public.zonas_cobertura from anon,authenticated;
create or replace function public.guardar_cobertura(p_empresa uuid,p_ciudad text,p_zona text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.exigir_operacion(p_empresa);
 if length(trim(coalesce(p_ciudad,''))) not between 2 and 80 or length(trim(coalesce(p_zona,''))) not between 2 and 100 then raise exception using errcode='P0001',message='Completa ciudad y zona.'; end if;
 insert into public.zonas_cobertura(empresa_id,ciudad,zona) values(p_empresa,trim(p_ciudad),trim(p_zona)) on conflict do nothing;
end; $$;

-- Los repartidores solo avanzan los pedidos asignados. La entrega exige código.
create or replace function public.cambiar_estado_pedido(p_pedido uuid,p_estado public.estado_pedido)
returns void language plpgsql security definer set search_path='' as $$
declare o public.pedidos; item record; gerente boolean;
begin
 select * into o from public.pedidos where id=p_pedido for update;
 if not found then raise exception using errcode='42501',message='Pedido no autorizado.'; end if;
 gerente:=public.puede_gestionar(o.empresa_id);
 if not gerente and not (o.chofer_id=auth.uid() and public.pertenece_empresa(o.empresa_id)) then raise exception using errcode='42501',message='Pedido no autorizado.'; end if;
 if not public.membresia_activa(o.empresa_id) then raise exception using errcode='P0001',message='La empresa no tiene una membresía vigente.'; end if;
 if p_estado=o.estado then return; end if;
 if not o.stock_reservado then raise exception using errcode='P0001',message='Pedido antiguo: requiere revisión manual de stock.'; end if;
 if p_estado is null or o.estado in ('cancelado','entregado') or not (
  (gerente and p_estado='cancelado') or (o.estado='asignado_chofer' and p_estado='en_camino' and o.chofer_id is not null)
  or (o.estado='en_camino' and p_estado='en_puerta_pesaje')) then
  raise exception using errcode='P0001',message='Asigna un repartidor y usa el código del balón para confirmar la entrega.';
 end if;
 if p_estado='cancelado' then
  for item in select capacidad,sum(cantidad) cantidad from public.pedido_items where pedido_id=o.id group by capacidad loop
   update public.inventario_empresa set stock=stock+item.cantidad,updated_at=now() where empresa_id=o.empresa_id and capacidad=item.capacidad;
  end loop;
  update public.cilindros set estado='en_almacen' where id in(select cilindro_asignado_id from public.pedido_items where pedido_id=o.id) and estado='en_ruta_entrega';
  delete from public.ubicaciones_repartidores where pedido_id=o.id;
 end if;
 update public.pedidos set estado=p_estado,fecha_hora_llegada=case when p_estado='en_puerta_pesaje' then now() else fecha_hora_llegada end where id=o.id;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id,detalle) values(o.empresa_id,auth.uid(),'estado_pedido',o.id,jsonb_build_object('estado',p_estado));
end; $$;

create or replace function public.reporte_empresa(p_empresa uuid,p_desde date,p_hasta date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare reporte jsonb;
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Reporte no autorizado.'; end if;
 if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>366 then raise exception using errcode='P0001',message='Selecciona un periodo de hasta 366 días.'; end if;
 select jsonb_build_object('pedidos',count(*),'entregados',count(*) filter(where estado='entregado'),
 'ventas_pen',coalesce(sum(total_pedido_pen) filter(where estado='entregado'),0),
 'cobrado_pen',coalesce(sum(total_pedido_pen) filter(where estado='entregado' and estado_pago='completado'),0),
 'cancelados',count(*) filter(where estado='cancelado')) into reporte
 from public.pedidos where empresa_id=p_empresa and (created_at at time zone 'America/Lima')::date between p_desde and p_hasta;
 return reporte||jsonb_build_object('stock_disponible',(select coalesce(sum(stock),0) from public.inventario_empresa where empresa_id=p_empresa),
 'cilindros',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select estado,count(*) cantidad from public.cilindros where empresa_duena_id=p_empresa group by estado)t),
 'productos',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select i.capacidad,sum(i.cantidad) unidades from public.pedido_items i join public.pedidos p on p.id=i.pedido_id where p.empresa_id=p_empresa and p.estado='entregado' and (p.created_at at time zone 'America/Lima')::date between p_desde and p_hasta group by i.capacidad)t),
 'viajes',(select count(*) from public.viajes_flota where empresa_id=p_empresa and (created_at at time zone 'America/Lima')::date between p_desde and p_hasta),
 'incidencias_abiertas',(select count(*) from public.incidencias where empresa_id=p_empresa and estado='abierta'));
end; $$;
create or replace function public.reporte_sysgas() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS puede consultar el reporte global.'; end if;
 return jsonb_build_object('empresas',(select count(*) from public.empresas_distribuidoras),
 'solicitudes_pendientes',(select count(*) from public.solicitudes_afiliacion where estado='pendiente_revision'),
 'membresias_activas',(select count(*) from public.suscripciones_empresas where estado='activa' and vigente_hasta>now()),
 'ingresos_membresias_pen',(select coalesce(sum(importe_pen),0) from public.pagos_membresia where estado='verificado'));
end; $$;
create or replace function public.leer_notificacion(p_id uuid) returns void language sql security definer set search_path='' as $$
 update public.notificaciones set leida=true where id=p_id and usuario_id=auth.uid();
$$;
revoke all on function public.guardar_cobertura(uuid,text,text),public.reporte_empresa(uuid,date,date),public.reporte_sysgas(),public.leer_notificacion(uuid) from public;
grant execute on function public.guardar_cobertura(uuid,text,text),public.reporte_empresa(uuid,date,date),public.reporte_sysgas(),public.leer_notificacion(uuid) to authenticated;
-- Evitar importes especiales de PostgreSQL (NaN/Infinity).
alter table public.planes_suscripcion drop constraint if exists planes_importe_finito;
alter table public.planes_suscripcion add constraint planes_importe_finito check(precio_pen::text not in ('NaN','Infinity','-Infinity'));


-- 202610300007_planes_gps.sql
create or replace function public.editar_plan(p_id uuid,p_nombre text,p_precio numeric,p_dias integer,p_activo boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS administra planes.'; end if;
 if p_nombre is null or length(trim(p_nombre)) not between 2 and 80 or p_precio is null or p_precio<=0 or p_precio::text in ('NaN','Infinity','-Infinity') or p_dias is null or p_dias not between 1 and 366 or p_activo is null then
  raise exception using errcode='P0001',message='Revisa nombre, precio y días del plan.';
 end if;
 update public.planes_suscripcion set nombre=trim(p_nombre),precio_pen=p_precio,dias=p_dias,activo=p_activo where id=p_id;
 if not found then raise exception using errcode='P0001',message='El plan no existe.'; end if;
 insert into public.auditoria_operaciones(usuario_id,operacion,entidad_id) values(auth.uid(),'editar_plan',p_id);
end; $$;

create or replace function public.compartir_ubicacion_flota(p_viaje uuid,p_latitud numeric,p_longitud numeric) returns void language plpgsql security definer set search_path='' as $$
declare v public.viajes_flota;
begin
 select * into v from public.viajes_flota where id=p_viaje for share;
 if not found or v.operador_id is distinct from auth.uid() or v.estado<>'en_transito' or not public.pertenece_empresa(v.empresa_id) or not public.membresia_activa(v.empresa_id) then
  raise exception using errcode='42501',message='Solo el operador del viaje activo puede compartir su GPS.';
 end if;
 if p_latitud is null or p_longitud is null or not p_latitud between -90 and 90 or not p_longitud between -180 and 180 then raise exception using errcode='P0001',message='Coordenadas inválidas.'; end if;
 insert into public.camiones_telemetria(camion_id,latitud,longitud) values(v.camion_id,p_latitud,p_longitud);
 update public.camiones_flota set ultima_latitud=p_latitud,ultima_longitud=p_longitud,ultima_telemetria=now() where id=v.camion_id;
end; $$;
drop policy if exists telemetria_privada on public.camiones_telemetria;
create policy telemetria_privada on public.camiones_telemetria for select to authenticated using(exists(select 1 from public.camiones_flota c where c.id=camion_id and (public.puede_gestionar(c.empresa_id) or exists(select 1 from public.viajes_flota v where v.camion_id=c.id and v.operador_id=auth.uid() and v.estado='en_transito' and camiones_telemetria.timestamp_gps>=v.salida_at and public.pertenece_empresa(v.empresa_id)))));
grant select on public.camiones_telemetria to authenticated;
revoke insert,update,delete on public.camiones_telemetria,public.pesajes_entrega from anon,authenticated;
drop policy if exists pesajes_autorizados on public.pesajes_entrega;
create policy pesajes_autorizados on public.pesajes_entrega for select to authenticated using(exists(select 1 from public.pedidos p where p.id=pedido_id));
grant select on public.pesajes_entrega to authenticated;
revoke all on function public.editar_plan(uuid,text,numeric,integer,boolean),public.compartir_ubicacion_flota(uuid,numeric,numeric) from public;
grant execute on function public.editar_plan(uuid,text,numeric,integer,boolean),public.compartir_ubicacion_flota(uuid,numeric,numeric) to authenticated;


-- 202610300008_cobertura_viajes.sql
alter table public.pedidos add column if not exists zona_entrega text;
create or replace function public.crear_pedido_zona(p_nombre text,p_telefono text,p_direccion text,p_referencia text,p_capacidad public.capacidad_cilindro,p_empresa uuid,p_ciudad text default 'Puno',p_zona text default '')
returns text language plpgsql security definer set search_path='' as $$
declare ticket text;
begin
 if length(trim(coalesce(p_ciudad,''))) not between 2 and 60 or length(coalesce(p_zona,''))>100 then raise exception using errcode='P0001',message='Revisa ciudad y zona de entrega.'; end if;
 if exists(select 1 from public.zonas_cobertura where empresa_id=p_empresa) and not exists(
  select 1 from public.zonas_cobertura where empresa_id=p_empresa and lower(ciudad)=lower(trim(p_ciudad)) and lower(zona)=lower(trim(p_zona))) then
  raise exception using errcode='P0001',message='La distribuidora no atiende la ciudad y zona seleccionadas.';
 end if;
 if not exists(select 1 from public.zonas_cobertura where empresa_id=p_empresa) and not exists(select 1 from public.empresas_distribuidoras where id=p_empresa and lower(ciudad)=lower(trim(p_ciudad))) then raise exception using errcode='P0001',message='La distribuidora no atiende esa ciudad.'; end if;
 ticket:=public.crear_pedido_empresa(p_nombre,p_telefono,p_direccion,p_referencia,p_capacidad,p_empresa);
 update public.pedidos set ciudad=trim(p_ciudad),zona_entrega=nullif(trim(p_zona),'') where codigo_ticket=ticket;
 return ticket;
end; $$;
revoke all on function public.crear_pedido_empresa(text,text,text,text,public.capacidad_cilindro,uuid) from anon,authenticated;
revoke all on function public.crear_pedido_zona(text,text,text,text,public.capacidad_cilindro,uuid,text,text) from public;
grant execute on function public.crear_pedido_zona(text,text,text,text,public.capacidad_cilindro,uuid,text,text) to anon,authenticated;

drop function if exists public.resumen_viajes(uuid);
create or replace function public.resumen_viajes(p_empresa uuid)
returns table(id uuid,camion_id uuid,origen text,destino text,estado text,total bigint,recibidos bigint,esperados integer)
language sql stable security definer set search_path='' as $$
 select v.id,v.camion_id,v.origen,v.destino,v.estado,count(d.cilindro_id),count(d.recibido_at),v.cantidad_esperada
 from public.viajes_flota v left join public.detalle_cargas_balones d on d.viaje_id=v.id where v.empresa_id=p_empresa
 and (public.puede_gestionar(v.empresa_id) or (v.operador_id=auth.uid() and public.pertenece_empresa(v.empresa_id)))
 group by v.id order by v.created_at desc limit 100;
$$;
revoke all on function public.resumen_viajes(uuid) from public;
grant execute on function public.resumen_viajes(uuid) to authenticated;


-- 202610300009_notificaciones_comprobantes.sql
create or replace function public.mis_invitaciones() returns table(id uuid,empresa_id uuid,empresa_nombre text,cargo text)
language sql stable security definer set search_path='' as $$
 select i.id,i.empresa_id,e.razon_social::text,i.cargo from public.invitaciones_personal i join public.empresas_distribuidoras e on e.id=i.empresa_id
 where i.correo=public.mi_correo() and i.estado='pendiente';
$$;
create or replace function public.mis_solicitudes() returns table(id uuid,nombre_empresa text,representante_nombre text,correo text,telefono text,ciudad text,estado public.estado_afiliacion,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select s.id,s.nombre_empresa::text,s.representante_nombre::text,s.correo::text,s.telefono::text,s.ciudad::text,s.estado,s.created_at
 from public.solicitudes_afiliacion s where lower(trim(s.correo))=public.mi_correo() order by s.created_at desc limit 100;
$$;
create or replace function public.notificar_solicitud() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.notificaciones(usuario_id,titulo) select id,'Nueva solicitud de afiliación: '||new.nombre_empresa from public.perfiles where rol='super_admin' and activo;
 return new;
end; $$;
drop trigger if exists aviso_solicitud on public.solicitudes_afiliacion;
create trigger aviso_solicitud after insert on public.solicitudes_afiliacion for each row execute function public.notificar_solicitud();

-- Comprobante INTERNO, sin envío a SUNAT ni declaración de aceptación tributaria.
create or replace function public.emitir_nota_venta(p_pedido uuid) returns text language plpgsql security definer set search_path='' as $$
declare o public.pedidos; numero integer; recibo text;
begin
 select * into o from public.pedidos where id=p_pedido for update;
 if not found or not public.puede_gestionar(o.empresa_id) then raise exception using errcode='42501',message='Pedido no autorizado.'; end if;
 if o.estado<>'entregado' or o.estado_pago<>'completado' then raise exception using errcode='P0001',message='Primero completa la entrega y registra el cobro.'; end if;
 select numero_completo into recibo from public.comprobantes_pago where pedido_id=o.id and tipo='nota_venta' limit 1;
 if found then return recibo; end if;
 perform 1 from public.empresas_distribuidoras where id=o.empresa_id for update;
 select coalesce(max(c.correlativo),0)+1 into numero from public.comprobantes_pago c join public.pedidos p on p.id=c.pedido_id where p.empresa_id=o.empresa_id and c.serie='NV01';
 recibo:='NV01-'||lpad(numero::text,8,'0');
 insert into public.comprobantes_pago(pedido_id,tipo,serie,correlativo,numero_completo,subtotal_pen,igv_pen,total_pen,estado_sunat)
 values(o.id,'nota_venta','NV01',numero,recibo,o.total_pedido_pen,0,o.total_pedido_pen,'NO_ENVIADO');
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(o.empresa_id,auth.uid(),'nota_venta_interna',o.id);
 return recibo;
end; $$;
drop policy if exists comprobantes_autorizados on public.comprobantes_pago;
create policy comprobantes_autorizados on public.comprobantes_pago for select to authenticated using(exists(select 1 from public.pedidos where id=pedido_id));
grant select on public.comprobantes_pago to authenticated;
revoke insert,update,delete on public.comprobantes_pago from anon,authenticated;
revoke all on function public.mis_invitaciones(),public.mis_solicitudes(),public.emitir_nota_venta(uuid) from public;
grant execute on function public.mis_invitaciones(),public.mis_solicitudes(),public.emitir_nota_venta(uuid) to authenticated;
notify pgrst,'reload schema';


-- 202610300010_administracion_activos.sql
create or replace function public.administrar_activo(p_tipo text,p_id uuid,p_activo boolean) returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid;
begin
 if p_activo is null then raise exception using errcode='P0001',message='Estado inválido.'; end if;
 if p_tipo='moto' then
  select empresa_id into empresa from public.vehiculos_reparto where id=p_id for update;
  if empresa is null then raise exception using errcode='P0001',message='Vehículo no encontrado.'; end if;
  perform public.exigir_operacion(empresa);
  if not p_activo and exists(select 1 from public.pedidos where vehiculo_reparto_id=p_id and estado in ('asignado_chofer','en_camino','en_puerta_pesaje')) then raise exception using errcode='P0001',message='El vehículo tiene una entrega activa.'; end if;
  update public.vehiculos_reparto set activo=p_activo where id=p_id;
 elsif p_tipo='camion' then
  select empresa_id into empresa from public.camiones_flota where id=p_id for update;
  if empresa is null then raise exception using errcode='P0001',message='Camión no encontrado.'; end if;
  perform public.exigir_operacion(empresa);
  if not p_activo and exists(select 1 from public.viajes_flota where camion_id=p_id and estado<>'recibido') then raise exception using errcode='P0001',message='El camión tiene un viaje pendiente.'; end if;
  update public.camiones_flota set activo=p_activo where id=p_id;
 elsif p_tipo='empresa' then
  if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS administra empresas.'; end if;
  empresa:=p_id;
  update public.empresas_distribuidoras set estado=case when p_activo then 'activo' else 'suspendido' end where id=p_id;
  if not found then raise exception using errcode='P0001',message='Empresa no encontrada.'; end if;
 else raise exception using errcode='P0001',message='Tipo no válido.';
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id,detalle) values(empresa,auth.uid(),'estado_'||p_tipo,p_id,jsonb_build_object('activo',p_activo));
end; $$;
create or replace function public.asignar_administrador(p_empresa uuid,p_correo text) returns void language plpgsql security definer set search_path='' as $$
declare persona uuid;
begin
 if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS asigna administradores empresariales.'; end if;
 perform 1 from public.empresas_distribuidoras where id=p_empresa;
 if not found then raise exception using errcode='P0001',message='Empresa no encontrada.'; end if;
 select p.id into persona from public.perfiles p join auth.users u on u.id=p.id where lower(u.email)=lower(trim(p_correo)) and u.email_confirmed_at is not null and p.activo and p.rol='cliente_comun' and p.empresa_id is null for update of p;
 if persona is null then raise exception using errcode='P0001',message='Se requiere una cuenta de cliente confirmada, activa y sin empresa.'; end if;
 update public.perfiles set empresa_id=p_empresa,rol='empresa_admin' where id=persona;
 insert into public.notificaciones(usuario_id,titulo) values(persona,'Tu cuenta fue habilitada como administrador de distribuidora.');
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),'asignar_administrador',persona);
end; $$;
revoke all on function public.administrar_activo(text,uuid,boolean),public.asignar_administrador(uuid,text) from public;
grant execute on function public.administrar_activo(text,uuid,boolean),public.asignar_administrador(uuid,text) to authenticated;


-- 202610300011_pedidos_idempotentes.sql
alter table public.pedidos add column if not exists solicitud_web_id uuid;
create unique index if not exists pedido_solicitud_web_unica on public.pedidos(solicitud_web_id) where solicitud_web_id is not null;
create or replace function public.crear_pedido_seguro(p_nombre text,p_telefono text,p_direccion text,p_referencia text,p_capacidad public.capacidad_cilindro,p_empresa uuid,p_ciudad text default 'Puno',p_zona text default '',p_solicitud uuid default gen_random_uuid())
returns text language plpgsql security definer set search_path='' as $$
declare o public.pedidos; ticket text;
begin
 if p_solicitud is null then raise exception using errcode='P0001',message='Falta el identificador de la solicitud.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_solicitud::text,0));
 select * into o from public.pedidos where solicitud_web_id=p_solicitud;
 if found then
  if o.cliente_id is distinct from auth.uid() or o.empresa_id is distinct from p_empresa or o.telefono_contacto is distinct from trim(p_telefono) or o.direccion_entrega is distinct from trim(p_direccion) or o.nombre_destinatario is distinct from trim(p_nombre) or o.ciudad is distinct from trim(p_ciudad) or coalesce(o.zona_entrega,'') is distinct from trim(p_zona) or not exists(select 1 from public.pedido_items where pedido_id=o.id and capacidad=p_capacidad) then
   raise exception using errcode='42501',message='La solicitud ya corresponde a otro pedido.';
  end if;
  return o.codigo_ticket;
 end if;
 ticket:=public.crear_pedido_zona(p_nombre,p_telefono,p_direccion,p_referencia,p_capacidad,p_empresa,p_ciudad,p_zona);
 update public.pedidos set solicitud_web_id=p_solicitud where codigo_ticket=ticket;
 return ticket;
end; $$;
revoke all on function public.crear_pedido_zona(text,text,text,text,public.capacidad_cilindro,uuid,text,text) from anon,authenticated;
revoke all on function public.crear_pedido_seguro(text,text,text,text,public.capacidad_cilindro,uuid,text,text,uuid) from public;
grant execute on function public.crear_pedido_seguro(text,text,text,text,public.capacidad_cilindro,uuid,text,text,uuid) to anon,authenticated;
notify pgrst,'reload schema';


-- 202610300012_mantenimiento.sql
create or replace function public.control_cilindro(p_empresa uuid,p_codigo text,p_estado public.estado_cilindro,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare c public.cilindros;
begin
 perform public.exigir_operacion(p_empresa);
 if p_estado is null or p_estado not in ('en_mantenimiento','baja_recalificacion') or length(trim(coalesce(p_motivo,''))) not between 5 and 2000 then raise exception using errcode='P0001',message='Selecciona mantenimiento o retiro y describe el motivo.'; end if;
 select * into c from public.cilindros where codigo_qr=p_codigo and empresa_duena_id=p_empresa for update;
 if not found or c.estado not in ('en_almacen','recuperado_vacio','en_planta','en_mantenimiento') then raise exception using errcode='P0001',message='El balón no está disponible. Revisa sus asignaciones.'; end if;
 if c.estado='en_almacen' then
  update public.inventario_empresa set stock=stock-1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad and stock>0;
  if not found then raise exception using errcode='P0001',message='No hay stock libre: el balón puede estar reservado por un pedido.'; end if;
 end if;
 update public.cilindros set estado=p_estado,aprobado_calidad=false,motivo_bloqueo=trim(p_motivo) where id=c.id;
 insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,es_conforme) values(c.id,case when p_estado='en_mantenimiento' then 'Mantenimiento' else 'Retiro del servicio' end,trim(p_motivo),(select nombres from public.perfiles where id=auth.uid()),false);
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),'control_cilindro',c.id);
end; $$;
revoke all on function public.control_cilindro(uuid,text,public.estado_cilindro,text) from public;
grant execute on function public.control_cilindro(uuid,text,public.estado_cilindro,text) to authenticated;


-- 202610300013_indicadores_operativos.sql
create or replace function public.reporte_empresa(p_empresa uuid,p_desde date,p_hasta date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare reporte jsonb;
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Reporte no autorizado.'; end if;
 if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>366 then raise exception using errcode='P0001',message='Selecciona un periodo de hasta 366 días.'; end if;
 select jsonb_build_object('pedidos',count(*),'entregados',count(*) filter(where estado='entregado'),
 'ventas_pen',coalesce(sum(total_pedido_pen) filter(where estado='entregado'),0),
 'cobrado_pen',coalesce(sum(total_pedido_pen) filter(where estado='entregado' and estado_pago='completado'),0),
 'cancelados',count(*) filter(where estado='cancelado')) into reporte
 from public.pedidos where empresa_id=p_empresa and (created_at at time zone 'America/Lima')::date between p_desde and p_hasta;
 return reporte||jsonb_build_object('stock_disponible',(select coalesce(sum(stock),0) from public.inventario_empresa where empresa_id=p_empresa),
 'cilindros',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select estado,count(*) cantidad from public.cilindros where empresa_duena_id=p_empresa group by estado)t),
 'productos',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select i.capacidad,sum(i.cantidad) unidades from public.pedido_items i join public.pedidos p on p.id=i.pedido_id where p.empresa_id=p_empresa and p.estado='entregado' and (p.created_at at time zone 'America/Lima')::date between p_desde and p_hasta group by i.capacidad)t),
 'viajes',(select count(*) from public.viajes_flota where empresa_id=p_empresa and (created_at at time zone 'America/Lima')::date between p_desde and p_hasta),
 'unidades_recibidas',(select count(*) from public.detalle_cargas_balones d join public.viajes_flota v on v.id=d.viaje_id where v.empresa_id=p_empresa and (d.recibido_at at time zone 'America/Lima')::date between p_desde and p_hasta),
 'vacios_recuperados',(select count(*) from public.entregas_domiciliarias e join public.pedidos p on p.id=e.pedido_id where p.empresa_id=p_empresa and e.vacio_id is not null and (e.created_at at time zone 'America/Lima')::date between p_desde and p_hasta),
 'repartidores',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select u.nombres::text,count(*) entregas from public.pedidos p join public.perfiles u on u.id=p.chofer_id where p.empresa_id=p_empresa and p.estado='entregado' and (p.fecha_hora_entrega at time zone 'America/Lima')::date between p_desde and p_hasta group by u.id,u.nombres)t),
 'incidencias_abiertas',(select count(*) from public.incidencias where empresa_id=p_empresa and estado='abierta'));
end; $$;


-- 202610300014_cantidad_esperada.sql
-- Compatibilidad con instalaciones que ya tenían viajes antes de añadir el contador.
alter table public.viajes_flota add column if not exists cantidad_esperada integer not null default 0 check(cantidad_esperada>=0);


-- 202610300015_resumen_inventario.sql
create or replace function public.resumen_inventario(p_empresa uuid) returns table(capacidad public.capacidad_cilindro,estado public.estado_cilindro,cantidad bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Inventario no autorizado.'; end if;
 return query select c.capacidad,c.estado,count(*) from public.cilindros c where c.empresa_duena_id=p_empresa group by c.capacidad,c.estado;
end; $$;
revoke all on function public.resumen_inventario(uuid) from public;
grant execute on function public.resumen_inventario(uuid) to authenticated;


-- 202610300016_viajes_activos.sql
alter table public.viajes_flota drop constraint if exists viajes_flota_estado_check;
alter table public.viajes_flota add constraint viajes_flota_estado_check check(estado in ('preparacion','en_transito','recibido','cancelado'));
create unique index if not exists un_viaje_activo_por_camion on public.viajes_flota(camion_id) where estado in ('preparacion','en_transito');
create unique index if not exists un_viaje_activo_por_operador on public.viajes_flota(operador_id) where estado in ('preparacion','en_transito');
create or replace function public.cancelar_viaje(p_empresa uuid,p_viaje uuid) returns void language plpgsql security definer set search_path='' as $$
declare v public.viajes_flota;
begin
 perform public.exigir_operacion(p_empresa);
 select * into v from public.viajes_flota where id=p_viaje and empresa_id=p_empresa for update;
 if not found or v.estado<>'preparacion' then raise exception using errcode='P0001',message='Solo se cancela un viaje antes de confirmar la carga.'; end if;
 update public.viajes_flota set estado='cancelado' where id=v.id;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),'cancelar_viaje',v.id);
end; $$;
revoke all on function public.cancelar_viaje(uuid,uuid) from public;
grant execute on function public.cancelar_viaje(uuid,uuid) to authenticated;


-- 202610300017_indices_operativos.sql
create index if not exists pedidos_empresa_fecha on public.pedidos(empresa_id,created_at desc);
create index if not exists pedido_items_pedido on public.pedido_items(pedido_id);
create index if not exists perfiles_empresa_cargo on public.perfiles(empresa_id,rol,activo);
create index if not exists pagos_membresia_empresa_fecha on public.pagos_membresia(empresa_id,created_at desc);
create index if not exists invitaciones_correo_estado on public.invitaciones_personal(correo,estado);
create index if not exists notificaciones_bandeja on public.notificaciones(usuario_id,leida,created_at desc);
create index if not exists viajes_empresa_fecha on public.viajes_flota(empresa_id,created_at desc);
create index if not exists cargas_por_cilindro on public.detalle_cargas_balones(cilindro_id);
create index if not exists incidencias_empresa_estado on public.incidencias(empresa_id,estado,created_at desc);
create index if not exists auditoria_empresa_fecha on public.auditoria_operaciones(empresa_id,created_at desc);
create index if not exists movimientos_empresa_fecha on public.movimientos_inventario(empresa_id,created_at desc);
create index if not exists comprobantes_por_pedido on public.comprobantes_pago(pedido_id);

commit;
