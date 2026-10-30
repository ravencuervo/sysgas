-- Ejecutar DESPUÉS del esquema SYSGAS proporcionado por el propietario.
begin;

-- Los metadatos del registro son controlados por el usuario: nunca asignar roles desde ellos.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, correo, nombres, apellidos, rol)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'nombres', 'Usuario'),
    coalesce(new.raw_user_meta_data->>'apellidos', 'SYSGAS'), 'cliente_comun');
  return new;
end;
$$;

drop policy if exists "Lectura de perfiles de usuarios autenticados" on public.perfiles;
drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.perfiles;
drop policy if exists "perfil_propio" on public.perfiles;
create policy "perfil_propio" on public.perfiles for select to authenticated using (id = auth.uid());
revoke update on public.perfiles from anon, authenticated;
grant update (nombres, apellidos, telefono, avatar_url) on public.perfiles to authenticated;
drop policy if exists "editar_contacto_propio" on public.perfiles;
create policy "editar_contacto_propio" on public.perfiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

-- Un pedido y sus ítems se crean en una transacción con precio obtenido del catálogo.
revoke insert on public.pedidos, public.pedido_items from anon, authenticated;
create or replace function public.crear_pedido_web(
  p_nombre text, p_telefono text, p_direccion text, p_referencia text,
  p_capacidad public.capacidad_cilindro
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_precio numeric;
  v_id uuid;
  v_ticket text := 'TK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));
  v_cliente uuid;
begin
  if length(trim(p_nombre)) not between 2 and 120
    or p_nombre is null or p_telefono is null or p_direccion is null
    or length(trim(p_direccion)) not between 5 and 500
    or length(p_telefono) > 20
    or p_telefono !~ '^\+?[0-9 ()-]{7,20}$'
    or length(coalesce(p_referencia, '')) > 500 then
    raise exception 'Revisa el nombre, teléfono y dirección de entrega.';
  end if;
  select precio_venta_pen into v_precio from public.productos_catalogo
    where capacidad = p_capacidad and disponible_en_puno;
  if v_precio is null or v_precio <= 0 then raise exception 'Producto no disponible.'; end if;
  select id into v_cliente from public.perfiles where id = auth.uid() and activo;
  insert into public.pedidos(codigo_ticket, cliente_id, nombre_destinatario, telefono_contacto,
    direccion_entrega, referencia_direccion, total_pedido_pen)
  values(v_ticket, v_cliente, trim(p_nombre), trim(p_telefono), trim(p_direccion), p_referencia, v_precio)
  returning id into v_id;
  insert into public.pedido_items(pedido_id, capacidad, cantidad, precio_unitario_pen, subtotal_pen)
  values(v_id, p_capacidad, 1, v_precio, v_precio);
  return v_ticket;
end;
$$;
revoke all on function public.crear_pedido_web(text,text,text,text,public.capacidad_cilindro) from public;
grant execute on function public.crear_pedido_web(text,text,text,text,public.capacidad_cilindro) to anon, authenticated;

-- Los administradores de empresa solo ven su empresa; los clientes y choferes, sus pedidos.
drop policy if exists "Los clientes ven sus propios pedidos" on public.pedidos;
create policy "Los clientes ven sus propios pedidos" on public.pedidos for select to authenticated using (
  exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo and (
    pedidos.cliente_id = p.id or pedidos.chofer_id = p.id or p.rol = 'super_admin'
    or (p.rol = 'empresa_admin' and p.empresa_id = pedidos.empresa_id)))
);
drop policy if exists "Ver items de pedidos autorizados" on public.pedido_items;
create policy "Ver items de pedidos autorizados" on public.pedido_items for select to authenticated
using (exists(select 1 from public.pedidos p where p.id = pedido_id));

-- Pasaporte público: devuelve únicamente campos destinados al consumidor.
revoke select on public.cilindros, public.cilindros_trazabilidad from anon, authenticated;
create or replace function public.pasaporte_publico(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'codigo', c.numero_serie_fabricacion, 'uuid', c.uuid_inmutable,
    'tipo', c.capacidad::text, 'tara', c.tara_calibrada_kg::text || ' kg',
    'pesoBruto', coalesce(c.peso_bruto_actual_kg::text || ' kg', 'Sin registro'),
    'estado', upper(replace(c.estado::text, '_', ' ')),
    'planta', coalesce(p.nombre, 'Sin registro'),
    'operadorLlenado', coalesce((select t.operador_nombre from public.cilindros_trazabilidad t
      where t.cilindro_id = c.id and t.tipo_evento ilike '%llenado%' order by t.created_at desc limit 1), 'Sin registro'),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object(
      'fecha', to_char(t.created_at at time zone 'America/Lima', 'DD/MM/YYYY HH24:MI'),
      'evento', t.tipo_evento, 'detalle', t.descripcion, 'operador', t.operador_nombre,
      'icono', t.icono_bootstrap, 'ok', t.es_conforme) order by t.created_at, t.id)
      from public.cilindros_trazabilidad t where t.cilindro_id = c.id), '[]'::jsonb),
    'certificados', case when c.norma_tecnica_certificada is null then '[]'::jsonb else
      jsonb_build_array(jsonb_build_object('norma', c.norma_tecnica_certificada,
        'descripcion', 'Norma registrada para este cilindro', 'codigoCert', c.codigo_qr,
        'estado', case when not c.aprobado_calidad then 'BLOQUEADO'
          when c.fecha_proxima_recalificacion < current_date then 'RECALIFICACIÓN VENCIDA'
          else 'REGISTRADA' end)) end
  ) from public.cilindros c left join public.plantas_envasadoras p on p.id = c.planta_envasado_id
  where c.codigo_qr = p_codigo limit 1;
$$;
revoke all on function public.pasaporte_publico(text) from public;
grant execute on function public.pasaporte_publico(text) to anon, authenticated;
grant select on public.perfiles, public.pedidos, public.pedido_items to authenticated;
grant select on public.productos_catalogo to anon, authenticated;
revoke insert on public.solicitudes_afiliacion from anon, authenticated;
grant insert (nombre_empresa, representante_nombre, telefono, correo, ciudad, volumen_mensual_balones)
  on public.solicitudes_afiliacion to anon, authenticated;
commit;
