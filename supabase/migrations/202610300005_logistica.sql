begin;
create table if not exists public.vehiculos_reparto (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 placa text not null unique check(length(trim(placa)) between 5 and 10),descripcion text not null,activo boolean not null default true
);
create table if not exists public.viajes_flota (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 camion_id uuid not null references public.camiones_flota(id),operador_id uuid not null references public.perfiles(id),
 origen text not null,destino text not null,cantidad_esperada integer not null default 0 check(cantidad_esperada>=0),estado text not null default 'preparacion' check(estado in ('preparacion','en_transito','recibido')),
 salida_at timestamptz,llegada_at timestamptz,created_at timestamptz not null default now()
);
alter table public.viajes_flota add column if not exists cantidad_esperada integer not null default 0 check(cantidad_esperada>=0);
create table if not exists public.detalle_cargas_balones (
 viaje_id uuid not null references public.viajes_flota(id),cilindro_id uuid not null references public.cilindros(id),
 lleno boolean not null,recibido_at timestamptz,primary key(viaje_id,cilindro_id)
);
alter table public.pedidos add column if not exists vehiculo_reparto_id uuid references public.vehiculos_reparto(id);
create table if not exists public.entregas_domiciliarias (
 pedido_id uuid primary key references public.pedidos(id),cilindro_id uuid not null references public.cilindros(id),
 vacio_id uuid references public.cilindros(id),responsable_id uuid not null references public.perfiles(id),created_at timestamptz not null default now()
);
create table if not exists public.ubicaciones_repartidores (
 pedido_id uuid primary key references public.pedidos(id),usuario_id uuid not null references public.perfiles(id),
 latitud numeric not null check(latitud between -90 and 90),longitud numeric not null check(longitud between -180 and 180),updated_at timestamptz not null default now()
);
create table if not exists public.incidencias (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 responsable_id uuid not null references public.perfiles(id),descripcion text not null check(length(trim(descripcion)) between 5 and 2000),
 estado text not null default 'abierta' check(estado in ('abierta','resuelta')),created_at timestamptz not null default now()
);
create table if not exists public.movimientos_inventario (
 id bigint generated always as identity primary key,empresa_id uuid not null references public.empresas_distribuidoras(id),
 capacidad public.capacidad_cilindro not null,diferencia integer not null,saldo integer not null,usuario_id uuid references public.perfiles(id),created_at timestamptz not null default now()
);

create or replace function public.pertenece_empresa(p_empresa uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.puede_gestionar(p_empresa) or exists(select 1 from public.perfiles where id=auth.uid() and activo and empresa_id=p_empresa and rol in ('chofer_repartidor','planta_operador'));
$$;
create or replace function public.registrar_movimiento_stock() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.movimientos_inventario(empresa_id,capacidad,diferencia,saldo,usuario_id) values(new.empresa_id,new.capacidad,new.stock,new.stock,auth.uid());
 elsif new.stock<>old.stock then
  insert into public.movimientos_inventario(empresa_id,capacidad,diferencia,saldo,usuario_id) values(new.empresa_id,new.capacidad,new.stock-old.stock,new.stock,auth.uid());
 end if;
 return new;
end; $$;
drop trigger if exists movimiento_stock on public.inventario_empresa;
create trigger movimiento_stock after insert or update on public.inventario_empresa for each row execute function public.registrar_movimiento_stock();

-- Accesos de lectura empresariales, escrituras solo mediante funciones autorizadas.
alter table public.vehiculos_reparto enable row level security;
alter table public.viajes_flota enable row level security;
alter table public.detalle_cargas_balones enable row level security;
alter table public.entregas_domiciliarias enable row level security;
alter table public.ubicaciones_repartidores enable row level security;
alter table public.incidencias enable row level security;
alter table public.movimientos_inventario enable row level security;
drop policy if exists vehiculos_empresa on public.vehiculos_reparto;
create policy vehiculos_empresa on public.vehiculos_reparto for select to authenticated using(public.puede_gestionar(empresa_id) or exists(select 1 from public.pedidos p where p.vehiculo_reparto_id=vehiculos_reparto.id and p.chofer_id=auth.uid() and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and public.pertenece_empresa(p.empresa_id)));
drop policy if exists camiones_empresa on public.camiones_flota;
create policy camiones_empresa on public.camiones_flota for select to authenticated using(public.puede_gestionar(empresa_id) or exists(select 1 from public.viajes_flota v where v.camion_id=camiones_flota.id and v.operador_id=auth.uid() and v.estado in ('preparacion','en_transito') and public.pertenece_empresa(v.empresa_id)));
drop policy if exists viajes_autorizados on public.viajes_flota;
create policy viajes_autorizados on public.viajes_flota for select to authenticated using(public.puede_gestionar(empresa_id) or (operador_id=auth.uid() and public.pertenece_empresa(empresa_id)));
drop policy if exists carga_autorizada on public.detalle_cargas_balones;
create policy carga_autorizada on public.detalle_cargas_balones for select to authenticated using(exists(select 1 from public.viajes_flota where id=viaje_id));
drop policy if exists incidencias_empresa on public.incidencias;
create policy incidencias_empresa on public.incidencias for select to authenticated using(public.puede_gestionar(empresa_id) or (responsable_id=auth.uid() and public.pertenece_empresa(empresa_id)));
drop policy if exists movimientos_empresa on public.movimientos_inventario;
create policy movimientos_empresa on public.movimientos_inventario for select to authenticated using(public.puede_gestionar(empresa_id));
drop policy if exists entrega_autorizada on public.entregas_domiciliarias;
create policy entrega_autorizada on public.entregas_domiciliarias for select to authenticated using(exists(select 1 from public.pedidos where id=pedido_id));
drop policy if exists ubicacion_activa on public.ubicaciones_repartidores;
create policy ubicacion_activa on public.ubicaciones_repartidores for select to authenticated using(exists(select 1 from public.pedidos p where p.id=pedido_id
 and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and (p.cliente_id=auth.uid() or p.chofer_id=auth.uid() or public.puede_gestionar(p.empresa_id))));
drop policy if exists "Los clientes ven sus propios pedidos" on public.pedidos;
create policy "Los clientes ven sus propios pedidos" on public.pedidos for select to authenticated using(
 exists(select 1 from public.perfiles p where p.id=auth.uid() and p.activo and
 (pedidos.cliente_id=p.id or public.puede_gestionar(pedidos.empresa_id) or (pedidos.chofer_id=p.id and p.empresa_id=pedidos.empresa_id and p.rol='chofer_repartidor'))));
drop policy if exists "Lectura pública de pasaporte QR de cilindros" on public.cilindros;
drop policy if exists cilindros_empresa on public.cilindros;
create policy cilindros_empresa on public.cilindros for select to authenticated using(public.puede_gestionar(empresa_duena_id) or exists(
 select 1 from public.detalle_cargas_balones d join public.viajes_flota v on v.id=d.viaje_id where d.cilindro_id=cilindros.id and v.operador_id=auth.uid() and public.pertenece_empresa(v.empresa_id)) or exists(
 select 1 from public.pedido_items i join public.pedidos p on p.id=i.pedido_id where i.cilindro_asignado_id=cilindros.id and p.chofer_id=auth.uid() and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and public.pertenece_empresa(p.empresa_id)));
drop policy if exists "Lectura pública del historial de eventos de trazabilidad" on public.cilindros_trazabilidad;
drop policy if exists trazabilidad_empresa on public.cilindros_trazabilidad;
create policy trazabilidad_empresa on public.cilindros_trazabilidad for select to authenticated using(exists(select 1 from public.cilindros c where c.id=cilindro_id));
grant select on public.vehiculos_reparto,public.camiones_flota,public.viajes_flota,public.detalle_cargas_balones,public.entregas_domiciliarias,public.ubicaciones_repartidores,public.incidencias,public.movimientos_inventario,public.cilindros,public.cilindros_trazabilidad to authenticated;
revoke insert,update,delete on public.vehiculos_reparto,public.camiones_flota,public.viajes_flota,public.detalle_cargas_balones,public.entregas_domiciliarias,public.ubicaciones_repartidores,public.incidencias,public.movimientos_inventario,public.cilindros,public.cilindros_trazabilidad from anon,authenticated;

create or replace function public.gestion_logistica(p_accion text,p_empresa uuid,p_datos jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; o public.pedidos; c public.cilindros; vac public.cilindros; v public.viajes_flota; code text; codigo text; item record; perfil public.perfiles;
begin
 select * into perfil from public.perfiles where id=auth.uid() and activo;
 if not found or not public.pertenece_empresa(p_empresa) or not public.membresia_activa(p_empresa) then
  raise exception using errcode='42501',message='Empresa no autorizada o membresía vencida.';
 end if;
 if p_accion in ('moto','camion','cilindro','viaje','asignar','resolver') then perform public.exigir_operacion(p_empresa); end if;
 if p_accion in ('moto','camion') and length(trim(coalesce(p_datos->>'placa',''))) not between 5 and 10 then raise exception using errcode='P0001',message='La placa debe tener entre 5 y 10 caracteres.'; end if;
 if p_accion='camion' and ((p_datos->>'capacidad') is null or (p_datos->>'capacidad')::integer not between 1 and 10000) then raise exception using errcode='P0001',message='La capacidad del camión debe estar entre 1 y 10000 balones.'; end if;
 if p_accion='moto' then
  insert into public.vehiculos_reparto(empresa_id,placa,descripcion) values(p_empresa,upper(trim(p_datos->>'placa')),trim(p_datos->>'descripcion')) returning id into v_id;
 elsif p_accion='camion' then
  insert into public.camiones_flota(empresa_id,placa,numero_unidad,capacidad_balones) values(p_empresa,upper(trim(p_datos->>'placa')),trim(p_datos->>'unidad'),(p_datos->>'capacidad')::integer) returning id into v_id;
 elsif p_accion='cilindro' then
  codigo:=trim(p_datos->>'codigo');
  if codigo is null or codigo !~ '^[A-Za-z0-9_-]{3,60}$' or p_datos->>'tara' is null or (p_datos->>'tara')::numeric::text in ('NaN','Infinity','-Infinity') or (p_datos->>'tara')::numeric<=0 or length(trim(coalesce(p_datos->>'serie',''))) not between 1 and 60 then raise exception using errcode='P0001',message='Código o tara inválidos.'; end if;
  insert into public.cilindros(codigo_qr,uuid_inmutable,numero_serie_fabricacion,capacidad,empresa_duena_id,tara_calibrada_kg,estado,aprobado_calidad)
   values(codigo,gen_random_uuid()::text,trim(p_datos->>'serie'),(p_datos->>'capacidad')::public.capacidad_cilindro,p_empresa,(p_datos->>'tara')::numeric,'en_mantenimiento',false) returning id into v_id;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,es_conforme) values(v_id,'Registro inicial','Cilindro registrado; pendiente de inspección.',perfil.nombres,false);
 elsif p_accion='inspeccionar' then
  perform public.exigir_operacion(p_empresa);
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or c.estado not in ('en_mantenimiento','en_planta','recuperado_vacio') then raise exception using errcode='P0001',message='Cilindro no disponible para inspección.'; end if;
  if (p_datos->>'aprobado')::boolean then
   update public.cilindros set aprobado_calidad=true,estado='en_planta',motivo_bloqueo=null where id=c.id;
  else update public.cilindros set aprobado_calidad=false,estado='en_mantenimiento',motivo_bloqueo=p_datos->>'detalle' where id=c.id; end if;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,es_conforme) values(c.id,'Inspección',p_datos->>'detalle',perfil.nombres,(p_datos->>'aprobado')::boolean); v_id:=c.id;
 elsif p_accion='llenar' then
  perform public.exigir_operacion(p_empresa);
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or c.estado<>'en_planta' or not c.aprobado_calidad then raise exception using errcode='P0001',message='El cilindro requiere inspección aprobada antes de llenar.'; end if;
  if p_datos->>'peso' is null or (p_datos->>'peso')::numeric::text in ('NaN','Infinity','-Infinity') or abs((p_datos->>'peso')::numeric-c.tara_calibrada_kg-replace(c.capacidad::text,'kg','')::numeric)>0.05 then raise exception using errcode='P0001',message='El peso neto debe corresponder a la capacidad, con tolerancia de 0.05 kg.'; end if;
  update public.cilindros set estado='en_almacen',peso_bruto_actual_kg=(p_datos->>'peso')::numeric,fecha_ultimo_envasado=now() where id=c.id;
  update public.inventario_empresa set stock=stock+1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad;
  if not found then raise exception using errcode='P0001',message='Configura primero el precio de esta capacidad en inventario.'; end if;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,peso_registrado_kg) values(c.id,'Llenado','Llenado y pesaje registrados.',perfil.nombres,(p_datos->>'peso')::numeric); v_id:=c.id;
 elsif p_accion='viaje' then
  if not exists(select 1 from public.camiones_flota where id=(p_datos->>'camion_id')::uuid and empresa_id=p_empresa and activo) or
   not exists(select 1 from public.perfiles where id=(p_datos->>'operador_id')::uuid and empresa_id=p_empresa and activo and rol='planta_operador') then raise exception using errcode='P0001',message='Camión u operador no autorizado.'; end if;
  if length(trim(coalesce(p_datos->>'origen','')))<3 or length(trim(coalesce(p_datos->>'destino','')))<3 then raise exception using errcode='P0001',message='Completa origen y destino.'; end if;
  if p_datos->>'esperados' is null or (p_datos->>'esperados')::integer<1 or (p_datos->>'esperados')::integer>(select capacidad_balones from public.camiones_flota where id=(p_datos->>'camion_id')::uuid) then raise exception using errcode='P0001',message='La cantidad esperada debe ser positiva y respetar la capacidad del camión.'; end if;
  insert into public.viajes_flota(empresa_id,camion_id,operador_id,origen,destino,cantidad_esperada) values(p_empresa,(p_datos->>'camion_id')::uuid,(p_datos->>'operador_id')::uuid,p_datos->>'origen',p_datos->>'destino',(p_datos->>'esperados')::integer) returning id into v_id;
 elsif p_accion in ('cargar','recibir') then
  select * into v from public.viajes_flota where id=(p_datos->>'viaje_id')::uuid and empresa_id=p_empresa for update;
  if not found or not (public.puede_gestionar(p_empresa) or v.operador_id=auth.uid()) then raise exception using errcode='42501',message='Viaje no autorizado.'; end if;
  if jsonb_typeof(p_datos->'codigos')<>'array' or jsonb_array_length(p_datos->'codigos') not between 1 and 500 then raise exception using errcode='P0001',message='Registra entre 1 y 500 códigos.'; end if;
  if (select count(*)<>count(distinct value) from jsonb_array_elements_text(p_datos->'codigos')) then raise exception using errcode='P0001',message='La lista contiene códigos repetidos.'; end if;
  if (p_accion='cargar' and v.estado<>'preparacion') or (p_accion='recibir' and v.estado<>'en_transito') then raise exception using errcode='P0001',message='El estado del viaje no permite esta operación.'; end if;
  if p_accion='cargar' and jsonb_array_length(p_datos->'codigos')>(select capacidad_balones from public.camiones_flota where id=v.camion_id) then raise exception using errcode='P0001',message='La carga supera la capacidad del camión.'; end if;
  if p_accion='cargar' and v.cantidad_esperada<>jsonb_array_length(p_datos->'codigos') then
   if length(trim(coalesce(p_datos->>'diferencia','')))<5 then raise exception using errcode='P0001',message='La cantidad escaneada difiere de la esperada. Registra la justificación.'; end if;
   insert into public.incidencias(empresa_id,responsable_id,descripcion) values(p_empresa,auth.uid(),'Diferencia de carga: esperados '||v.cantidad_esperada||', registrados '||jsonb_array_length(p_datos->'codigos')||'. '||(p_datos->>'diferencia'));
  end if;
  for code in select value from jsonb_array_elements_text(p_datos->'codigos') order by value loop
   select * into c from public.cilindros where codigo_qr=code and empresa_duena_id=p_empresa for update;
   if not found then raise exception using errcode='P0001',message='Código no pertenece a la empresa: '||code; end if;
   if p_accion='cargar' then
    if c.estado not in ('en_almacen','recuperado_vacio') or (c.estado='en_almacen' and not c.aprobado_calidad) then raise exception using errcode='P0001',message='Cilindro no disponible: '||code; end if;
    insert into public.detalle_cargas_balones(viaje_id,cilindro_id,lleno) values(v.id,c.id,c.estado='en_almacen');
    if c.estado='en_almacen' then
     update public.inventario_empresa set stock=stock-1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad and stock>0;
     if not found then raise exception using errcode='P0001',message='Stock insuficiente para la carga.'; end if;
    end if;
    update public.cilindros set estado='cargado_camion',camion_actual_id=v.camion_id where id=c.id;
   else
    select * into item from public.detalle_cargas_balones where viaje_id=v.id and cilindro_id=c.id and recibido_at is null;
    if not found or c.camion_actual_id is distinct from v.camion_id or c.estado<>'cargado_camion' then raise exception using errcode='P0001',message='Cilindro no pendiente en este viaje: '||code; end if;
    update public.detalle_cargas_balones set recibido_at=now() where viaje_id=v.id and cilindro_id=c.id;
    update public.cilindros set estado=case when item.lleno then 'en_almacen'::public.estado_cilindro else 'recuperado_vacio'::public.estado_cilindro end,camion_actual_id=null where id=c.id;
    if item.lleno then update public.inventario_empresa set stock=stock+1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad; end if;
   end if;
   insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(c.id,case when p_accion='cargar' then 'Carga masiva' else 'Recepción de carga' end,v.origen||' → '||v.destino,perfil.nombres);
  end loop;
  if p_accion='cargar' then update public.viajes_flota set estado='en_transito',salida_at=now() where id=v.id;
  elsif not exists(select 1 from public.detalle_cargas_balones where viaje_id=v.id and recibido_at is null) then update public.viajes_flota set estado='recibido',llegada_at=now() where id=v.id; end if;
  v_id:=v.id;
 elsif p_accion='asignar' then
  select * into o from public.pedidos where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa for update;
  if not found or o.estado not in ('pendiente','asignado_chofer') or not o.stock_reservado then raise exception using errcode='P0001',message='Pedido no disponible para asignación.'; end if;
  if not exists(select 1 from public.perfiles where id=(p_datos->>'chofer_id')::uuid and empresa_id=p_empresa and activo and rol='chofer_repartidor') then raise exception using errcode='P0001',message='El motorizado debe pertenecer a tu empresa.'; end if;
  if not exists(select 1 from public.vehiculos_reparto where id=(p_datos->>'vehiculo_id')::uuid and empresa_id=p_empresa and activo) then raise exception using errcode='P0001',message='Vehículo no autorizado.'; end if;
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or not c.aprobado_calidad or c.estado<>'en_almacen' or not exists(select 1 from public.pedido_items where pedido_id=o.id and capacidad=c.capacidad) then raise exception using errcode='P0001',message='Cilindro no disponible o capacidad incorrecta.'; end if;
  -- En este flujo cada pedido web contiene una sola unidad.
  for item in select cilindro_asignado_id from public.pedido_items where pedido_id=o.id and cilindro_asignado_id is not null loop
   update public.cilindros set estado='en_almacen' where id=item.cilindro_asignado_id and id<>c.id;
  end loop;
  update public.pedido_items set cilindro_asignado_id=c.id where pedido_id=o.id;
  update public.cilindros set estado='en_ruta_entrega' where id=c.id;
  update public.pedidos set chofer_id=(p_datos->>'chofer_id')::uuid,vehiculo_reparto_id=(p_datos->>'vehiculo_id')::uuid,estado='asignado_chofer',fecha_hora_asignacion=now() where id=o.id;
  insert into public.notificaciones(usuario_id,titulo) values((p_datos->>'chofer_id')::uuid,'Nuevo pedido asignado: '||o.codigo_ticket); v_id:=o.id;
 elsif p_accion='entregar' then
  select * into o from public.pedidos where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa for update;
  if not found or o.estado<>'en_puerta_pesaje' or not (public.puede_gestionar(p_empresa) or o.chofer_id=auth.uid()) then raise exception using errcode='42501',message='Pedido no autorizado para entrega.'; end if;
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or not c.aprobado_calidad or c.estado<>'en_ruta_entrega' or not exists(select 1 from public.pedido_items where pedido_id=o.id and cilindro_asignado_id=c.id) then raise exception using errcode='P0001',message='El código no corresponde al balón asignado.'; end if;
  if nullif(trim(p_datos->>'vacio'),'') is not null then
   select * into vac from public.cilindros where codigo_qr=trim(p_datos->>'vacio') and empresa_duena_id=p_empresa for update;
   if not found or vac.id=c.id or vac.estado<>'entregado_cliente' or (vac.cliente_actual_id is not null and vac.cliente_actual_id is distinct from o.cliente_id) then raise exception using errcode='P0001',message='El balón vacío no corresponde a este cliente.'; end if;
   update public.cilindros set estado='recuperado_vacio',cliente_actual_id=null where id=vac.id;
   insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(vac.id,'Recuperación de vacío','Devolución registrada.',perfil.nombres);
  end if;
  if nullif(trim(p_datos->>'balanza'),'') is null or p_datos->>'peso' is null
   or (p_datos->>'peso')::numeric::text in ('NaN','Infinity','-Infinity')
   or abs((p_datos->>'peso')::numeric-c.tara_calibrada_kg-replace(c.capacidad::text,'kg','')::numeric)>0.05 then
   raise exception using errcode='P0001',message='Registra la balanza y un peso neto conforme a la capacidad (tolerancia 0.05 kg).';
  end if;
  insert into public.pesajes_entrega(pedido_id,cilindro_entregado_id,cilindro_vacio_retornado_id,chofer_id,id_balanza_bluetooth,peso_bruto_medido_kg,tara_descontada_kg,peso_neto_calculado_kg,pesaje_aprobado)
    values(o.id,c.id,vac.id,o.chofer_id,trim(p_datos->>'balanza'),(p_datos->>'peso')::numeric,c.tara_calibrada_kg,(p_datos->>'peso')::numeric-c.tara_calibrada_kg,true);
  insert into public.entregas_domiciliarias(pedido_id,cilindro_id,vacio_id,responsable_id) values(o.id,c.id,vac.id,auth.uid());
  update public.cilindros set estado='entregado_cliente',cliente_actual_id=o.cliente_id where id=c.id;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(c.id,'Entrega a cliente','Entrega confirmada mediante código del cilindro.',perfil.nombres);
  update public.pedidos set estado='entregado',fecha_hora_entrega=now() where id=o.id;
  delete from public.ubicaciones_repartidores where pedido_id=o.id;
  if o.cliente_id is not null then insert into public.notificaciones(usuario_id,titulo) values(o.cliente_id,'Pedido entregado: '||o.codigo_ticket); end if; v_id:=o.id;
 elsif p_accion='incidencia' then
  insert into public.incidencias(empresa_id,responsable_id,descripcion) values(p_empresa,auth.uid(),trim(p_datos->>'descripcion')) returning id into v_id;
 elsif p_accion='resolver' then
  update public.incidencias set estado='resuelta' where id=(p_datos->>'id')::uuid and empresa_id=p_empresa returning id into v_id;
 elsif p_accion='cobro' then
  perform public.exigir_operacion(p_empresa);
  update public.pedidos set estado_pago='completado',metodo_pago=(p_datos->>'metodo')::public.metodo_pago where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa and estado='entregado' and estado_pago='pendiente' returning id into v_id;
  if v_id is null then raise exception using errcode='P0001',message='Solo se registran cobros pendientes de pedidos entregados.'; end if;
 else raise exception using errcode='P0001',message='Operación no válida.';
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),p_accion,v_id);
 return v_id;
end; $$;

create or replace function public.compartir_ubicacion(p_pedido uuid,p_latitud numeric,p_longitud numeric) returns void language plpgsql security definer set search_path='' as $$
declare o public.pedidos;
begin
 select * into o from public.pedidos where id=p_pedido for share;
 if not found or o.chofer_id is distinct from auth.uid() or not public.pertenece_empresa(o.empresa_id) or not public.membresia_activa(o.empresa_id)
 or o.estado not in ('asignado_chofer','en_camino','en_puerta_pesaje') then raise exception using errcode='42501',message='Ubicación permitida solo durante tu entrega asignada.'; end if;
 insert into public.ubicaciones_repartidores(pedido_id,usuario_id,latitud,longitud) values(o.id,auth.uid(),p_latitud,p_longitud)
 on conflict(pedido_id) do update set usuario_id=excluded.usuario_id,latitud=excluded.latitud,longitud=excluded.longitud,updated_at=now();
end; $$;

-- El pasaporte público excluye nombres de trabajadores y descripciones/rutas internas.
create or replace function public.pasaporte_publico(p_codigo text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('codigo',c.codigo_qr,'uuid',c.uuid_inmutable,'tipo',c.capacidad::text,
 'tara',c.tara_calibrada_kg::text||' kg','pesoBruto',coalesce(c.peso_bruto_actual_kg::text||' kg','Sin registro'),
 'estado',upper(replace(c.estado::text,'_',' ')),'planta',coalesce(e.nombre_comercial,e.razon_social,'Sin registro'),
 'fechaLlenado',to_char(c.fecha_ultimo_envasado at time zone 'America/Lima','DD/MM/YYYY HH24:MI'),
 'operadorLlenado','Información reservada','eventos',coalesce((select jsonb_agg(jsonb_build_object('fecha',to_char(t.created_at at time zone 'America/Lima','DD/MM/YYYY HH24:MI'),
 'evento',t.tipo_evento,'detalle','Movimiento registrado por la empresa responsable.','operador','SYSGAS','icono',t.icono_bootstrap,'ok',t.es_conforme) order by t.created_at,t.id)
 from public.cilindros_trazabilidad t where t.cilindro_id=c.id),'[]'::jsonb),'certificados','[]'::jsonb)
 from public.cilindros c left join public.empresas_distribuidoras e on e.id=c.empresa_duena_id where c.codigo_qr=p_codigo limit 1;
$$;
revoke all on function public.pertenece_empresa(uuid),public.gestion_logistica(text,uuid,jsonb),public.compartir_ubicacion(uuid,numeric,numeric) from public;
grant execute on function public.pertenece_empresa(uuid),public.gestion_logistica(text,uuid,jsonb),public.compartir_ubicacion(uuid,numeric,numeric) to authenticated;
commit;
