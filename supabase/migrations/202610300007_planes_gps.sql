begin;
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
commit;
