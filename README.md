# SYSGAS

Plataforma web para distribuidoras de GLP en Puno y Juliaca. React y Vite consumen Supabase Auth, PostgreSQL y Storage.

## Desarrollo

Desde frontend, instala las dependencias con pnpm install. Copia .env.example a .env.local y configura la URL y la clave pública de tu proyecto. Ejecuta pnpm dev.

## Verificación

Desde la raíz, ejecuta node --test frontend/src/lib/*.test.js frontend/tests/*.test.js.
Desde frontend, ejecuta pnpm lint y pnpm build.
Con .env.local configurado, pnpm check:connection comprueba por HTTP el catálogo, el pasaporte, las ofertas y los permisos en Supabase.

## Operación y despliegue

Consulta docs/OPERACION_WEB.md, docs/RESPALDO_DESPLIEGUE.md y docs/ALTA_DIRECTA_Y_FOTOS.md. Las migraciones están en supabase/migrations. La función alta-directa-empresa requiere publicación independiente del frontend.

## Alcance actual

Pedidos, stock, QR, asignación de reparto, registro manual de peso, GPS durante entregas, notas internas y gestión de membresías. La APK, conexión automática de balanza, cobro mediante pasarela y facturación tributaria requieren implementación e integración.

## Aceptación

La validación con personas usuarias y su acta firmada están pendientes. Las pruebas automatizadas se ejecutan en una base aislada y no sustituyen esa aceptación. Cada integrante debe usar su identidad Git y aportar cambios propios mediante ramas.
