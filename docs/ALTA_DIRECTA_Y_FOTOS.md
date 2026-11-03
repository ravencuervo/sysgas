# Alta directa y fotos de vehículos

El superadministrador entra a **Mi empresa → Alta directa de empresa y gerente**. Completa el RUC y los datos de contacto. Si el gerente ya tiene una cuenta confirmada sin empresa, se vincula directamente. Para una cuenta nueva, el superadministrador ingresa el correo del gerente y una contraseña inicial de al menos 12 caracteres. El gerente inicia sesión directamente con esos datos, sin registro público, solicitud ni confirmación por correo.

El superadministrador puede conceder 7, 15 o 30 días de cortesía para empezar a operar sin pagar una membresía. La cortesía no registra un pago ni un ingreso. Si se elige «Sin cortesía», se requiere una membresía vigente para operar. El alta no reemplaza administradores de empresas existentes: para ese caso se usa la opción de asignar administrador empresarial.

En **Vehículos → Fotos del estado**, el administrador puede subir hasta cinco imágenes por carga (JPG, PNG o WebP, 5 MB por imagen). Las fotos quedan asociadas a la moto o al camión, ordenadas por fecha. El almacenamiento es privado y los enlaces de vista previa vencen después de cinco minutos. Para renovar la vista previa, vuelve a abrir la galería.

## Activar en Supabase

1. Si ya se aplicaron las migraciones anteriores, ejecutar únicamente `supabase/migrations/202611030018_alta_directa_fotos.sql` en SQL Editor. Esta migración crea el bucket privado y sus políticas.
2. Publicar la Edge Function desde la raíz del repositorio, con la CLI autenticada en el proyecto:

   ```sh
   supabase functions deploy alta-directa-empresa --project-ref tsegodcutcgchvyurvik --no-verify-jwt
   ```

   La función verifica el JWT con Supabase Auth y comprueba el rol de superadministrador antes de crear la cuenta. La clave de servicio solo se usa dentro de la función.
3. Publicar el frontend actualizado. Probar con un correo de prueba controlado, una cuenta de otra empresa y un vehículo de prueba.

No se han creado cuentas ni se han cambiado datos de producción durante la implementación.
