begin;
create or replace function public.resumen_inventario(p_empresa uuid) returns table(capacidad public.capacidad_cilindro,estado public.estado_cilindro,cantidad bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Inventario no autorizado.'; end if;
 return query select c.capacidad,c.estado,count(*) from public.cilindros c where c.empresa_duena_id=p_empresa group by c.capacidad,c.estado;
end; $$;
revoke all on function public.resumen_inventario(uuid) from public;
grant execute on function public.resumen_inventario(uuid) to authenticated;
commit;
