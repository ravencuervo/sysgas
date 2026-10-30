-- Ejecutar en SQL Editor después de la migración 001 y del registro del administrador.
begin;
alter table public.solicitudes_afiliacion
  add column if not exists empresa_id uuid references public.empresas_distribuidoras(id),
  add column if not exists revisado_por uuid references public.perfiles(id),
  add column if not exists revisado_at timestamptz;

-- La asignación inicial se ejecuta únicamente con privilegios de SQL Editor.
do $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = 'menaronaldocarlos@gmail.com';
  if v_id is null then raise exception 'Primero registra menaronaldocarlos@gmail.com en SYSGAS.'; end if;
  insert into public.perfiles(id,correo,nombres,apellidos,rol,activo)
    values(v_id,'menaronaldocarlos@gmail.com','Administrador','SYSGAS','super_admin',true)
    on conflict(id) do update set rol='super_admin', activo=true;
end;
$$;

drop policy if exists "Ver solicitudes de afiliación administradores" on public.solicitudes_afiliacion;
create policy "Ver solicitudes de afiliación administradores" on public.solicitudes_afiliacion
for select to authenticated using (exists(select 1 from public.perfiles p
  where p.id=auth.uid() and p.activo and p.rol='super_admin'));
grant select on public.solicitudes_afiliacion to authenticated;
revoke update, delete on public.solicitudes_afiliacion from anon, authenticated;

create or replace function public.revisar_afiliacion(
  p_solicitud uuid, p_estado public.estado_afiliacion,
  p_notas text default '', p_ruc text default '', p_direccion text default ''
) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.solicitudes_afiliacion; v_usuario uuid; v_empresa uuid;
begin
  if not exists(select 1 from public.perfiles where id=auth.uid() and activo and rol='super_admin') then
    raise exception using errcode='42501', message='Solo el administrador puede revisar afiliaciones.';
  end if;
  if p_estado is null or p_estado not in ('contactado','aprobada_activa','rechazada') then
    raise exception using errcode='P0001', message='Selecciona un estado válido.';
  end if;
  if length(coalesce(p_notas,''))>2000 then raise exception using errcode='P0001', message='Las notas no pueden superar 2000 caracteres.'; end if;
  select * into s from public.solicitudes_afiliacion where id=p_solicitud for update;
  if not found then raise exception using errcode='P0001', message='La solicitud ya no existe.'; end if;
  if s.estado in ('aprobada_activa','rechazada') then
    raise exception using errcode='P0001', message='La solicitud ya fue resuelta. Actualiza la lista.';
  end if;
  if p_estado='aprobada_activa' then
    if p_ruc is null or p_ruc !~ '^[0-9]{11}$' or length(trim(coalesce(p_direccion,''))) not between 5 and 500 then
      raise exception using errcode='P0001', message='Para aprobar, completa un RUC de 11 dígitos y una dirección válida.';
    end if;
    select p.id into v_usuario from public.perfiles p join auth.users u on u.id=p.id
      where lower(u.email)=lower(trim(s.correo)) and u.email_confirmed_at is not null
      and p.activo and p.rol='cliente_comun' and p.empresa_id is null for update of p;
    if v_usuario is null then raise exception using errcode='P0001', message='El solicitante debe tener una cuenta de cliente activa y confirmada con el mismo correo de la solicitud.'; end if;
    if exists(select 1 from public.empresas_distribuidoras where ruc=p_ruc) then
      raise exception using errcode='P0001', message='Ese RUC ya está afiliado. Revisa la empresa existente.';
    end if;
    insert into public.empresas_distribuidoras(ruc,razon_social,nombre_comercial,ciudad,direccion,telefono_contacto,correo_contacto,volumen_estimado_mensual)
    values(p_ruc,s.nombre_empresa,s.nombre_empresa,s.ciudad,trim(p_direccion),s.telefono,s.correo,s.volumen_mensual_balones)
    returning id into v_empresa;
    update public.perfiles set empresa_id=v_empresa,rol='empresa_admin' where id=v_usuario;
  end if;
  update public.solicitudes_afiliacion set estado=p_estado,notas_internas=coalesce(p_notas,''),
    empresa_id=v_empresa,revisado_por=auth.uid(),revisado_at=now(),updated_at=now() where id=p_solicitud;
  return v_empresa;
end;
$$;
revoke all on function public.revisar_afiliacion(uuid,public.estado_afiliacion,text,text,text) from public;
grant execute on function public.revisar_afiliacion(uuid,public.estado_afiliacion,text,text,text) to authenticated;
commit;
