# Respaldo, instalación y despliegue

## Antes de modificar producción

Conservar un respaldo de la base y de la versión actual del frontend. `scripts/backup-supabase.ps1` usa pg_dump en formato custom: requiere las herramientas cliente de PostgreSQL y PGHOST, PGPORT, PGDATABASE y PGUSER del proyecto. Solicita la contraseña de forma oculta; no se guarda en el repositorio ni se coloca en argumentos. Los archivos de backups están ignorados por Git.

El respaldo lógico incluye esquemas public y auth; no incluye archivos de Storage, secretos del proveedor ni configuración externa de SMTP. Para una recuperación integral, complementar con los mecanismos de respaldo del proveedor. Probar la restauración primero en una base aislada usando pg_restore; no restaurar sobre producción sin comprobar versiones, permisos y dependencias. El script de respaldo no se ejecutó automáticamente porque requiere credenciales de base que no tiene el frontend.

## Instalar

La base original y las migraciones 001 y 002 deben existir. No ejecutar `frontend/tests/schema-fixture.sql` en Supabase: es exclusivamente una base reducida de pruebas.

Abrir SQL Editor y ejecutar `supabase/ACTUALIZAR_SYSGAS.sql` completo. Agrupa las ampliaciones en una transacción. Si una instrucción falla, no continuar desde la mitad: corregir el error y ejecutar el bloque completo. No elimina tablas ni registros operativos; reemplaza funciones y políticas, y deshabilita los antiguos puntos de entrada de pedidos.

La nueva comprobación de membresía dejará de aceptar pedidos para empresas sin suscripción vigente. Después de instalar, crear los planes y verificar los pagos correspondientes antes de abrir ventas. Las cuentas y sus roles existentes se conservan.

El instalador puede volver a ejecutarse. No sustituye un sistema completo de versionado de migraciones para un equipo con despliegues concurrentes. `pnpm migrations:build` lo regenera; las migraciones individuales conservan el historial de cambios.

Ejecutar `supabase/COMPROBAR_INSTALACION.sql` para revisar presencia de módulos y rol del administrador. Ejecutar después `pnpm check:connection` desde frontend con las variables correctas.

## Validar en Supabase

Crear dos empresas de prueba y cuentas confirmadas de cada rol. Aprobar una solicitud, activar membresía mediante verificación manual y aceptar invitaciones de trabajadores. Comprobar que una empresa no puede leer ni modificar registros de otra, incluso llamando funciones directamente. Comprobar stock, precio, pedido duplicado, cancelación, peso, entrega y fin del GPS. Comprobar escaneo por cámara en un dispositivo con permiso y recepción de carga con más de 100 códigos.

Las pruebas locales no certifican el estado de una instalación remota ni el funcionamiento de una cámara o sensor físico.

## Publicar la web

Configurar el proyecto Vercel con directorio raíz frontend, instalación pnpm, compilación pnpm build y salida dist. Configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el proyecto; publicar el código sin archivos .env.local. La clave Publishable está destinada al cliente, pero las claves service_role jamás deben estar en Vite. El archivo vercel.json resuelve las rutas internas.

Configurar las URLs de Authentication para el dominio publicado, /panel y /recuperar. Verificar registro, confirmación y restablecimiento desde ese dominio. Antes de un lanzamiento comercial se requieren correo transaccional, control contra abuso, revisión de requisitos operativos y prueba de las integraciones externas que se contraten.

No se ha desplegado esta versión desde esta conversación. No se han instalado estas migraciones automáticamente en producción.
