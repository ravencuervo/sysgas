begin;
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
commit;
