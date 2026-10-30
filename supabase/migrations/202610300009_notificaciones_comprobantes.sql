begin;
create or replace function public.mis_invitaciones() returns table(id uuid,empresa_id uuid,empresa_nombre text,cargo text)
language sql stable security definer set search_path='' as $$
 select i.id,i.empresa_id,e.razon_social::text,i.cargo from public.invitaciones_personal i join public.empresas_distribuidoras e on e.id=i.empresa_id
 where i.correo=public.mi_correo() and i.estado='pendiente';
$$;
create or replace function public.mis_solicitudes() returns table(id uuid,nombre_empresa text,representante_nombre text,correo text,telefono text,ciudad text,estado public.estado_afiliacion,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select s.id,s.nombre_empresa::text,s.representante_nombre::text,s.correo::text,s.telefono::text,s.ciudad::text,s.estado,s.created_at
 from public.solicitudes_afiliacion s where lower(trim(s.correo))=public.mi_correo() order by s.created_at desc limit 100;
$$;
create or replace function public.notificar_solicitud() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.notificaciones(usuario_id,titulo) select id,'Nueva solicitud de afiliación: '||new.nombre_empresa from public.perfiles where rol='super_admin' and activo;
 return new;
end; $$;
drop trigger if exists aviso_solicitud on public.solicitudes_afiliacion;
create trigger aviso_solicitud after insert on public.solicitudes_afiliacion for each row execute function public.notificar_solicitud();

-- Comprobante INTERNO, sin envío a SUNAT ni declaración de aceptación tributaria.
create or replace function public.emitir_nota_venta(p_pedido uuid) returns text language plpgsql security definer set search_path='' as $$
declare o public.pedidos; numero integer; recibo text;
begin
 select * into o from public.pedidos where id=p_pedido for update;
 if not found or not public.puede_gestionar(o.empresa_id) then raise exception using errcode='42501',message='Pedido no autorizado.'; end if;
 if o.estado<>'entregado' or o.estado_pago<>'completado' then raise exception using errcode='P0001',message='Primero completa la entrega y registra el cobro.'; end if;
 select numero_completo into recibo from public.comprobantes_pago where pedido_id=o.id and tipo='nota_venta' limit 1;
 if found then return recibo; end if;
 perform 1 from public.empresas_distribuidoras where id=o.empresa_id for update;
 select coalesce(max(c.correlativo),0)+1 into numero from public.comprobantes_pago c join public.pedidos p on p.id=c.pedido_id where p.empresa_id=o.empresa_id and c.serie='NV01';
 recibo:='NV01-'||lpad(numero::text,8,'0');
 insert into public.comprobantes_pago(pedido_id,tipo,serie,correlativo,numero_completo,subtotal_pen,igv_pen,total_pen,estado_sunat)
 values(o.id,'nota_venta','NV01',numero,recibo,o.total_pedido_pen,0,o.total_pedido_pen,'NO_ENVIADO');
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(o.empresa_id,auth.uid(),'nota_venta_interna',o.id);
 return recibo;
end; $$;
drop policy if exists comprobantes_autorizados on public.comprobantes_pago;
create policy comprobantes_autorizados on public.comprobantes_pago for select to authenticated using(exists(select 1 from public.pedidos where id=pedido_id));
grant select on public.comprobantes_pago to authenticated;
revoke insert,update,delete on public.comprobantes_pago from anon,authenticated;
revoke all on function public.mis_invitaciones(),public.mis_solicitudes(),public.emitir_nota_venta(uuid) from public;
grant execute on function public.mis_invitaciones(),public.mis_solicitudes(),public.emitir_nota_venta(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
