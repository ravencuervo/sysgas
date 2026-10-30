begin;
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
commit;
