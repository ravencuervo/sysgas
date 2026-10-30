-- Consulta de diagnóstico. No modifica datos.
select 'Tablas operativas' as comprobacion,
  count(*)::text || ' de 16 presentes' as resultado
from information_schema.tables where table_schema='public' and table_name in (
 'inventario_empresa','planes_suscripcion','suscripciones_empresas','pagos_membresia',
 'invitaciones_personal','notificaciones','auditoria_operaciones','vehiculos_reparto',
 'viajes_flota','detalle_cargas_balones','entregas_domiciliarias','ubicaciones_repartidores',
 'incidencias','movimientos_inventario','zonas_cobertura','comprobantes_pago');
select nombre, to_regprocedure(nombre) is not null as instalada
from (values ('public.crear_pedido_seguro(text,text,text,text,public.capacidad_cilindro,uuid,text,text,uuid)'),
 ('public.gestion_logistica(text,uuid,jsonb)'),('public.gestion_membresia(text,jsonb)'),
 ('public.gestion_personal(text,uuid,text,text,uuid)'),('public.reporte_empresa(uuid,date,date)'),
 ('public.control_cilindro(uuid,text,public.estado_cilindro,text)')) t(nombre);
select correo,rol,activo from public.perfiles where lower(correo)='menaronaldocarlos@gmail.com';
