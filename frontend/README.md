# SYSGAS · plataforma web multiempresa

React, Vite y Supabase. La aplicación Android está fuera de esta entrega; la web es adaptable a celular.

## Poner en marcha

1. Instalar Node.js 22.12 o superior y pnpm. En `frontend`, ejecutar `pnpm install --frozen-lockfile`.
2. Copiar `.env.example` a `.env.local` y configurar la clave pública Publishable/anon. No incluir claves service_role.
3. La base debe tener el esquema original SYSGAS de 13 tablas. Ejecutar las migraciones 001 y 002 si no están instaladas. La 002 requiere que exista la cuenta administradora designada.
4. Hacer un respaldo antes de actualizar. Ejecutar `supabase/ACTUALIZAR_SYSGAS.sql` completo en SQL Editor. Incluye las ampliaciones desde la 003 en una transacción; conserva los registros. Ver `docs/OPERACION_WEB.md` y `docs/RESPALDO_DESPLIEGUE.md`.
5. Configurar Authentication Redirect URLs: URL de la web, `/panel` y `/recuperar`. Para desarrollo se puede usar `http://127.0.0.1:3000`.
6. Ejecutar `pnpm dev --host 127.0.0.1 --port 3000`. Para producción: `pnpm build`. En Vercel, usar `frontend` como directorio raíz. `vercel.json` resuelve rutas de la SPA.

## Roles

- Superadministrador: afiliaciones, empresas, responsables empresariales, planes, pagos de membresía, suspensión, renovación y supervisión.
- Administrador de empresa: precios, stock, balones, inspección, llenado, mantenimiento, personal, vehículos, viajes, reparto, cobros, reportes y auditoría de su empresa.
- Operador de flota: sus viajes asignados, carga y recepción por lotes, GPS del viaje e incidencias. Internamente se conserva el valor `planta_operador` del enum existente para no romper cuentas previas.
- Motorizado: entregas asignadas, avance, código del balón, lectura de peso, vacío recuperado y ubicación durante el servicio. Se conserva el valor `chofer_repartidor`.
- Cliente: pedidos propios, consulta QR/código, seguimiento activo, solicitudes enviadas e invitaciones dirigidas a su correo confirmado.

## Operaciones implementadas en la web

- Afiliación revisada por SYSGAS; la aprobación crea empresa y vincula una cuenta confirmada.
- Membresías con pagos por referencia y verificación manual. Las operaciones se bloquean al vencer o suspender la membresía; la historia se conserva.
- Registro e invitación de personal, aceptación por correo confirmado y activación/desactivación.
- Inventario comercial por capacidad y conteo físico por estados; movimientos de stock registrados automáticamente.
- Registro de balones, inspección, llenado, mantenimiento/retiro y QR descargable.
- Lectura con cámara y código manual, carga masiva de hasta 500 códigos, detección de duplicados, diferencias justificadas y recepción parcial.
- Vehículos domiciliarios, camiones, viajes y operador asignado. GPS de viaje actualizado por acción del operador.
- Selección de distribuidora, ciudad y zona; precio del servidor, reserva transaccional e identificador para evitar pedidos duplicados al reintentar.
- Asignación de repartidor, vehículo y balón; entrega con código correcto, lectura de peso y vacío opcional. La tolerancia de 0.05 kg sigue el esquema proporcionado y debe validarse operativamente antes de producción.
- Ubicación del motorizado solo durante el pedido activo, con permiso del navegador. Se deja de compartir al salir de la pantalla; el cliente pierde acceso al finalizar.
- Cobros de gas separados de pagos de membresía; notas de venta internas sin valor tributario.
- Incidencias, zonas de cobertura, notificaciones internas, auditoría y reportes calculados en PostgreSQL.

## Verificaciones

- `pnpm test`: validación de formularios y códigos, más PostgreSQL embebido con migraciones, roles, RLS y operaciones de negocio. Los datos son locales y ficticios.
- `pnpm build`: compilación de producción.
- `pnpm lint`: análisis estático.
- `pnpm check:connection`: consultas a la base configurada y validación de un pedido inválido; no crea registros. Requiere las migraciones nuevas y el QR demo-001.
- `pnpm migrations:build`: regenera el SQL combinado desde las migraciones versionadas.

## QA con navegador sin tocar Supabase

Copiar `.env.qa.example` a `.env.qa.local`, iniciar `pnpm qa:api` y luego `pnpm qa:web`. Abrir `http://127.0.0.1:3001`. Las cuentas locales son `admin@demo.local`, `empresa@demo.local`, `motorizado@demo.local`, `flota@demo.local` y `cliente@demo.local`; contraseña exclusivamente de QA: `Local-SYSGAS-2026!`.

La API de QA usa PostgreSQL embebido, datos ficticios, roles y políticas reales del proyecto. No envía correos ni se conecta a producción. Implementa solo el subconjunto de la API necesario para la revisión local, no reemplaza la prueba final en Supabase. Se reinicia vacía al reiniciar el proceso. Nunca desplegar este servidor como backend.

## Integraciones externas pendientes

No se ha generado APK. No están conectados SUNAT, una pasarela de cobro, SMTP para invitaciones/notificaciones, sensores GPS externos ni Bluetooth automático de balanzas. Las notas internas no son boletas/facturas electrónicas. El pesaje se registra manualmente. El GPS web no es seguimiento en segundo plano. Las notificaciones están dentro del panel; no hay push ni SMS.

Antes de uso comercial se necesita instalar y verificar las migraciones en Supabase, configurar correo y límites contra abuso, verificar el flujo con cuentas de dos empresas y publicar el frontend con sus variables. Las listas operativas muestran hasta 100 registros; los reportes calculan todo el periodo, y los contadores de viajes agregan todo el lote.
