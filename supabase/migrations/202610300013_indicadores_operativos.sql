begin;
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
commit;
