begin;
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
commit;
