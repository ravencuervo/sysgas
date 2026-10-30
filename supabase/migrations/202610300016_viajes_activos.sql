begin;
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
commit;
