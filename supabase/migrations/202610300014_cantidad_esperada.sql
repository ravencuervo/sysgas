-- Compatibilidad con instalaciones que ya tenían viajes antes de añadir el contador.
begin;
alter table public.viajes_flota add column if not exists cantidad_esperada integer not null default 0 check(cantidad_esperada>=0);
commit;
