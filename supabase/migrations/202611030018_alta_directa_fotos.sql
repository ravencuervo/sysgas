begin;
create or replace function public.alta_directa_empresa(p_datos jsonb,p_comprobar boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 correo text:=lower(trim(coalesce(p_datos->>'correo','')));
 ruc_empresa text:=trim(coalesce(p_datos->>'ruc',''));
 razon text:=trim(coalesce(p_datos->>'razon_social',''));
 ciudad_empresa text:=trim(coalesce(p_datos->>'ciudad',''));
 direccion_empresa text:=trim(coalesce(p_datos->>'direccion',''));
 telefono text:=trim(coalesce(p_datos->>'telefono',''));
 nombres_gerente text:=trim(coalesce(p_datos->>'nombres',''));
 apellidos_gerente text:=trim(coalesce(p_datos->>'apellidos',''));
 dias_cortesia text:=coalesce(p_datos->>'dias_cortesia','0');
 usuario auth.users; perfil public.perfiles; empresa public.empresas_distribuidoras;
begin
 if not public.es_superadmin() then raise exception using errcode='42501',message='Solo el superadministrador puede dar de alta empresas.'; end if;
 if ruc_empresa !~ '^[0-9]{11}$' or correo !~ '^[^ @]+@[^ @]+[.][^ @]+$' or length(correo)>120
 or length(razon) not between 2 and 150 or length(ciudad_empresa) not between 2 and 60
 or length(direccion_empresa) not between 5 and 500 or telefono !~ '^[+0-9 ()-]{7,20}$'
 or length(nombres_gerente) not between 2 and 100 or length(apellidos_gerente) not between 2 and 100
 or dias_cortesia not in ('0','7','15','30') then
  raise exception using errcode='P0001',message='Revisa el RUC y los datos de la empresa y del gerente.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('alta-empresa:'||ruc_empresa,0));
 select * into empresa from public.empresas_distribuidoras where ruc=ruc_empresa;
 select * into usuario from auth.users u where lower(u.email)=correo;
 if usuario.id is not null then
  select * into perfil from public.perfiles where id=usuario.id for update;
  if perfil.rol='empresa_admin' and perfil.empresa_id=empresa.id and perfil.activo then return empresa.id; end if;
  if perfil.id is null or not perfil.activo or perfil.rol<>'cliente_comun' or perfil.empresa_id is not null
    or (usuario.email_confirmed_at is null and usuario.invited_at is null) then
   raise exception using errcode='P0001',message='El gerente debe ser una cuenta confirmada sin empresa o una cuenta invitada por SYSGAS.';
  end if;
 end if;
 if empresa.id is not null then raise exception using errcode='P0001',message='Ese RUC ya existe. Usa Asignar administrador empresarial.'; end if;
 if p_comprobar then return usuario.id; end if;
 if usuario.id is null then raise exception using errcode='P0002',message='Primero crea la cuenta del gerente.'; end if;
 insert into public.empresas_distribuidoras(ruc,razon_social,nombre_comercial,ciudad,direccion,telefono_contacto,correo_contacto)
 values(ruc_empresa,razon,razon,ciudad_empresa,direccion_empresa,telefono,correo) returning * into empresa;
 update public.perfiles set empresa_id=empresa.id,rol='empresa_admin',nombres=nombres_gerente,apellidos=apellidos_gerente where id=usuario.id;
 if dias_cortesia<>'0' then
  insert into public.suscripciones_empresas(empresa_id,estado,vigente_hasta)
  values(empresa.id,'activa',now()+make_interval(days=>dias_cortesia::integer));
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id,detalle)
 values(empresa.id,auth.uid(),'alta_directa_empresa',usuario.id,jsonb_build_object('dias_cortesia',dias_cortesia::integer));
 return empresa.id;
end; $$;
revoke all on function public.alta_directa_empresa(jsonb,boolean) from public,anon;
grant execute on function public.alta_directa_empresa(jsonb,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('estado-vehiculos','estado-vehiculos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.puede_acceder_foto_vehiculo(p_ruta text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare partes text[]:=string_to_array(p_ruta,'/'); empresa uuid; vehiculo uuid;
begin
 if array_length(partes,1) is distinct from 4
 or partes[1] !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 or partes[3] !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 or partes[4] !~ '^[0-9a-f-]{36}[.](jpg|png|webp)$' then return false; end if;
 empresa:=partes[1]::uuid; vehiculo:=partes[3]::uuid;
 if not public.puede_gestionar(empresa) then return false; end if;
 if partes[2]='camion' then return exists(select 1 from public.camiones_flota where id=vehiculo and empresa_id=empresa); end if;
 if partes[2]='moto' then return exists(select 1 from public.vehiculos_reparto where id=vehiculo and empresa_id=empresa); end if;
 return false;
end; $$;
revoke all on function public.puede_acceder_foto_vehiculo(text) from public,anon;
grant execute on function public.puede_acceder_foto_vehiculo(text) to authenticated;
drop policy if exists estado_vehiculos_lectura on storage.objects;
create policy estado_vehiculos_lectura on storage.objects for select to authenticated
using(bucket_id='estado-vehiculos' and public.puede_acceder_foto_vehiculo(name));
drop policy if exists estado_vehiculos_subida on storage.objects;
create policy estado_vehiculos_subida on storage.objects for insert to authenticated
with check(bucket_id='estado-vehiculos' and public.puede_acceder_foto_vehiculo(name));
notify pgrst,'reload schema';
commit;
