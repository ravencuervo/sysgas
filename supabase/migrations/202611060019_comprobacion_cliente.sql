begin;
alter table public.pesajes_entrega add column if not exists margen_tolerancia_kg numeric(4,2) not null default 0.05;
alter table public.pesajes_entrega add column if not exists created_at timestamptz not null default now();
alter table public.incidencias add column if not exists cliente_reclamante_id uuid references public.perfiles(id);
alter table public.incidencias add column if not exists pedido_reclamado_id uuid references public.pedidos(id);
create unique index if not exists incidencia_peso_pedido on public.incidencias(pedido_reclamado_id) where pedido_reclamado_id is not null;

create table if not exists public.comprobaciones_peso (
 pedido_id uuid primary key references public.pedidos(id),
 cliente_id uuid not null references public.perfiles(id),
 peso_bruto_kg numeric(6,2) not null check(peso_bruto_kg>0),
 tara_kg numeric(6,2) not null,
 capacidad_kg numeric(6,2) not null,
 tolerancia_kg numeric(4,2) not null,
 faltante_kg numeric(6,2) not null,
 incidencia_id uuid references public.incidencias(id),
 created_at timestamptz not null default now()
);
alter table public.comprobaciones_peso enable row level security;
drop policy if exists comprobaciones_autorizadas on public.comprobaciones_peso;
create policy comprobaciones_autorizadas on public.comprobaciones_peso for select to authenticated
using(cliente_id=auth.uid() or exists(select 1 from public.pedidos p where p.id=pedido_id and public.puede_gestionar(p.empresa_id)));
grant select on public.comprobaciones_peso to authenticated;

create or replace function public.comprobar_peso_cliente(p_pedido uuid,p_peso numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 o public.pedidos;
 w public.pesajes_entrega;
 r public.comprobaciones_peso;
 capacidad numeric;
 faltante numeric;
 incidencia uuid;
begin
 select * into o from public.pedidos where id=p_pedido for update;
 if not found or o.cliente_id is distinct from auth.uid() or auth.uid() is null or o.estado<>'entregado' then
  raise exception using errcode='42501',message='Solo puedes comprobar tus pedidos entregados.';
 end if;
 select * into r from public.comprobaciones_peso where pedido_id=o.id;
 if found then return to_jsonb(r); end if;
 if p_peso is null or p_peso::text in ('NaN','Infinity','-Infinity') or p_peso<=0 or p_peso>9999.99 then
  raise exception using errcode='P0001',message='Ingresa un peso válido en kilogramos.';
 end if;
 select * into w from public.pesajes_entrega where pedido_id=o.id order by created_at desc limit 1;
 if not found then raise exception using errcode='P0001',message='Este pedido aún no tiene pesaje de entrega registrado.'; end if;
 select replace(c.capacidad::text,'kg','')::numeric into capacidad from public.cilindros c where c.id=w.cilindro_entregado_id;
 faltante:=greatest(0,round(capacidad-(round(p_peso,2)-w.tara_descontada_kg),2));
 if faltante>w.margen_tolerancia_kg then
  insert into public.incidencias(empresa_id,responsable_id,cliente_reclamante_id,pedido_reclamado_id,descripcion)
  values(o.empresa_id,o.chofer_id,auth.uid(),o.id,
   'Comprobación del cliente para '||o.codigo_ticket||'. Peso bruto '||round(p_peso,2)||' kg; tara de entrega '||w.tara_descontada_kg||' kg; diferencia frente a capacidad '||faltante||' kg. Requiere revisión de la distribuidora.')
  returning id into incidencia;
 end if;
 insert into public.comprobaciones_peso values(o.id,auth.uid(),round(p_peso,2),w.tara_descontada_kg,capacidad,w.margen_tolerancia_kg,faltante,incidencia,now()) returning * into r;
 return to_jsonb(r);
end;
$$;
revoke all on function public.comprobar_peso_cliente(uuid,numeric) from public;
grant execute on function public.comprobar_peso_cliente(uuid,numeric) to authenticated;
create or replace function public.reporte_pesos_cliente(p_empresa uuid,p_desde date,p_hasta date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Empresa no autorizada.'; end if;
 if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>366 then
  raise exception using errcode='P0001',message='Selecciona un periodo de hasta 366 días.';
 end if;
 return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
  select coalesce(p.nombres,'Sin repartidor') as repartidor,
   count(*) as entregas_pesadas,
   count(c.incidencia_id) as reclamos_peso,
   count(*) filter(where i.estado='resuelta') as reclamos_resueltos
  from public.pedidos o
  join public.pesajes_entrega w on w.pedido_id=o.id
  left join public.perfiles p on p.id=o.chofer_id
  left join public.comprobaciones_peso c on c.pedido_id=o.id
  left join public.incidencias i on i.id=c.incidencia_id
  where o.empresa_id=p_empresa and o.estado='entregado'
   and (o.created_at at time zone 'America/Lima')::date between p_desde and p_hasta
  group by o.chofer_id,p.nombres
 ) r);
end;
$$;
revoke all on function public.reporte_pesos_cliente(uuid,date,date) from public;
grant execute on function public.reporte_pesos_cliente(uuid,date,date) to authenticated;
commit;
