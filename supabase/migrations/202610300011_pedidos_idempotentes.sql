begin;
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
commit;
