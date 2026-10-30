begin;
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
commit;
