begin;
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
commit;
