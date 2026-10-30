# Operación web de SYSGAS

## Primer inicio del propietario

El administrador general entra con su cuenta. Revisa las solicitudes desde Afiliaciones. Para aprobar una empresa, su representante debe tener una cuenta confirmada con el mismo correo de la solicitud. Completar RUC y dirección fiscal. La empresa y su administrador quedan vinculados sin conceder permisos a otras empresas.

En Membresía, crear un plan con precio y vigencia. Elegir la empresa y registrar la referencia de un pago real recibido por SYSGAS. Verificarlo solamente después de comprobar el dinero: esa decisión activa la vigencia. La renovación extiende la fecha sin duplicar una verificación. Suspender conserva toda la historia y bloquea nuevas operaciones. Si la fecha vence, la base lo reconoce aunque no haya una tarea programada.

No se han creado planes con precios comerciales ficticios en la base real. El propietario define esos importes.

## Preparación de una distribuidora

1. El administrador de empresa ingresa y ve únicamente su empresa.
2. Configura precios y stock. Si va a registrar cada balón y llenarlo desde el sistema, comenzar el saldo en cero: cada llenado incorpora una unidad. Si carga un saldo inicial manual, no debe contar otra vez esos mismos balones al llenarlos.
3. Registra balones, su serie, capacidad y tara. La inspección debe aprobarse antes del llenado. El mantenimiento o retiro bloquean la venta del balón y retiran la unidad del stock disponible si corresponde.
4. En Personal, crea una invitación al correo de cada trabajador. Compartir el enlace de registro. El trabajador se registra, confirma su correo y acepta la invitación desde Notificaciones. No se envían contraseñas ni se permite elegir un rol privilegiado durante el registro.
5. Registra motos y camiones. Los viajes masivos usan operadores de flota; los pedidos domiciliarios usan motorizados.
6. Configura las ciudades y zonas de cobertura. La compra valida esa cobertura en el servidor.

## Pedido domiciliario

El cliente inicia sesión, selecciona balón, ciudad, zona y distribuidora. El servidor toma el precio de esa empresa y reserva una unidad. Si no hay stock o la membresía no está vigente, no se crea el pedido. Un reintento con el mismo identificador no genera otra reserva.

La empresa recibe el pedido. En Gestionar entrega asigna motorizado, vehículo y código del balón disponible de la misma capacidad. El motorizado puede iniciar reparto y registrar llegada. Para completar la entrega debe registrar el código asignado, peso bruto e identificador de balanza; puede registrar también el vacío recuperado. La operación crea eventos de trazabilidad y conserva la tara y el peso neto calculado.

El motorizado comparte GPS mediante un permiso explícito del navegador, desde la pantalla del pedido activo. El cliente consulta la última ubicación disponible. El seguimiento termina al entregar o cancelar; no puede consultar el historial privado del trabajador.

Registrar el cobro cuando se haya recibido. La nota de venta interna no realiza cobros, no se envía a SUNAT y no tiene valor tributario. La pasarela y el proveedor de facturación deben integrarse aparte.

Los pedidos antiguos creados sin control de reserva de stock se conservan, pero no se gestionan automáticamente: requieren conciliación manual.

## Transporte masivo

La empresa programa camión, operador, origen, destino y cantidad esperada. El operador escanea de forma consecutiva o pega los códigos. Debe revisar el contador antes de confirmar. No se admiten duplicados ni balones de otra empresa. Si la cantidad cargada difiere de la esperada, debe registrar la justificación; se crea una incidencia.

Al salir se descuentan del saldo disponible los balones llenos transportados. Al recibirlos se reponen en el mismo inventario empresarial; los vacíos mantienen su condición. Se permite recepción parcial y el viaje termina cuando se recibe toda la carga. Estos movimientos son internos de la misma empresa, no transferencias entre distribuidoras.

## Reportes y control

Reportes permite seleccionar un periodo de hasta 366 días. Ventas y cobros se calculan de pedidos entregados; no de pedidos cancelados. Los ingresos por membresía se muestran únicamente en la supervisión de SYSGAS. Auditoría conserva los cambios operativos; los usuarios del frontend no pueden modificar ni eliminar esos registros.

Notificaciones también muestra las solicitudes de afiliación enviadas desde el correo confirmado del usuario, sin exponer notas internas del administrador.
