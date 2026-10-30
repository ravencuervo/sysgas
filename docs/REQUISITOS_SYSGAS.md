# PROMPT MAESTRO DEFINITIVO — SYSGAS 2026
## Plataforma SaaS Multiempresa de Gestión, Distribución, Transporte y Trazabilidad Inteligente de GLP

### 1. ROL DE LA IA DESARROLLADORA

Actúa como arquitecto de software senior, desarrollador full stack y especialista en PostgreSQL, Supabase, React, Vercel, aplicaciones Android, logística de GLP, trazabilidad mediante QR, sistemas SaaS multiempresa y seguridad informática.

Tu misión es analizar, mejorar y completar el proyecto SYSGAS, respetando el trabajo existente y desarrollando una solución profesional, escalable y funcional.

No debes crear un sistema completamente diferente ni eliminar funcionalidades existentes sin justificación.

### 2. INFORMACIÓN DEL PROYECTO

**Nombre:** SYSGAS

**Tipo:** Plataforma SaaS multiempresa para distribuidoras de gas licuado de petróleo.

**Ubicación inicial:** Puno, Perú.

**Alcance futuro:** Expansión a diferentes ciudades y regiones del Perú.

**Frontend actual:** https://sysgas.vercel.app/

**Base de datos:** PostgreSQL mediante Supabase.

**URL del proyecto Supabase:** https://tsegodcutcgchvyurvik.supabase.co

**Modelo comercial:** Suscripciones mensuales pagadas por empresas distribuidoras.

### 3. CONCEPTO GENERAL

SYSGAS es una plataforma tecnológica que permite a múltiples empresas distribuidoras de GLP utilizar un sistema centralizado para administrar sus operaciones.

Las distribuidoras contratan una membresía mensual para acceder a las funcionalidades del sistema.

Cada empresa tiene sus propios trabajadores, motorizados, operadores de flota, vehículos, balones, inventarios, pedidos, clientes y registros comerciales.

Todas las empresas utilizan la misma infraestructura tecnológica, pero sus datos operativos permanecen aislados.

SYSGAS contará con dos canales principales:

**Plataforma web:** destinada a la administración de las empresas distribuidoras afiliadas, con un panel central independiente para el superadministrador de SYSGAS.

**Aplicación móvil Android (APK):** destinada a operadores de transporte masivo, motorizados de reparto domiciliario y clientes comunes. Cada usuario visualizará únicamente las funciones correspondientes a su rol.

El sistema debe diferenciar claramente las operaciones de abastecimiento masivo y las entregas domiciliarias.

### 4. MODELO DE NEGOCIO

SYSGAS operará bajo el modelo B2B2C.

**B2B:** SYSGAS proporciona software de gestión a distribuidoras mediante membresías mensuales.

**B2C:** Las distribuidoras utilizan la plataforma para comercializar gas a consumidores finales.

Los pagos por membresía son ingresos de SYSGAS.

Los pagos por compras de gas corresponden a las empresas distribuidoras que atienden los pedidos.

No mezclar los dos procesos de pago.

### 5. ROLES Y PERMISOS

#### 5.1. Superadministrador SYSGAS

Accede a un panel central independiente.

Puede:
- Aprobar solicitudes de afiliación.
- Administrar empresas distribuidoras.
- Crear y modificar planes de membresía.
- Registrar y verificar pagos.
- Activar, suspender y renovar suscripciones.
- Gestionar administradores empresariales.
- Consultar indicadores globales.
- Supervisar auditorías y seguridad.

#### 5.2. Administrador de distribuidora

Accede al panel web de su empresa.

Puede:
- Gestionar inventarios y balones.
- Administrar trabajadores.
- Registrar vehículos y motorizados.
- Supervisar operadores de flota.
- Gestionar pedidos y ventas.
- Asignar repartidores.
- Controlar transporte masivo.
- Consultar ubicaciones GPS autorizadas.
- Supervisar la trazabilidad QR.
- Consultar reportes.
- Revisar el estado de su membresía.

Solo puede acceder a información perteneciente a su distribuidora.

#### 5.3. Operador de flota

Utiliza la APK para operaciones de transporte masivo de balones de gas.

Puede:
- Consultar viajes y cargas asignadas.
- Registrar carga y descarga.
- Escanear múltiples balones.
- Ingresar códigos manualmente.
- Verificar cantidades.
- Registrar salida y llegada.
- Confirmar recepción de carga.
- Registrar incidencias.
- Actualizar estados del transporte.

#### 5.4. Motorizado domiciliario

Utiliza la APK para repartir gas a consumidores.

Puede:
- Consultar pedidos asignados.
- Visualizar direcciones.
- Iniciar recorridos.
- Actualizar estados de entrega.
- Compartir ubicación durante servicios activos.
- Escanear el QR del balón entregado.
- Registrar balones vacíos recuperados.
- Confirmar entregas.
- Reportar incidencias.

#### 5.5. Cliente común

Utiliza la APK para comprar gas.

Puede:
- Registrarse.
- Iniciar sesión.
- Configurar ubicación.
- Visualizar distribuidoras disponibles.
- Consultar productos y precios.
- Realizar pedidos.
- Consultar estados de entrega.
- Visualizar únicamente el motorizado asignado a su pedido activo.
- Consultar historial de compras.
- Escanear códigos QR.
- Ingresar manualmente códigos de balones.
- Consultar información pública de trazabilidad.

No paga membresía y no puede acceder a operaciones internas de las distribuidoras.

### 6. PLATAFORMA WEB EMPRESARIAL

La plataforma web deberá contener los siguientes módulos.

#### Dashboard

Mostrar indicadores de ventas, pedidos, inventario, entregas, flota, motorizados, incidencias y rendimiento empresarial.

#### Inventarios

Gestionar balones llenos, vacíos, disponibles, asignados, entregados, devueltos, en mantenimiento y retirados.

#### Balones y trazabilidad

Registrar, identificar, consultar y administrar balones mediante QR o código manual.

#### Pedidos

Recibir, confirmar, asignar, despachar y cerrar pedidos de clientes.

#### Transporte masivo

Supervisar camiones, cargas, operadores, destinos, movimientos y recepción de balones.

#### Reparto domiciliario

Supervisar motorizados, pedidos asignados, ubicaciones y entregas.

#### Personal

Gestionar trabajadores, roles, estados y permisos.

#### Ventas y pagos

Consultar operaciones comerciales, importes y estados de pago.

#### Reportes

Generar indicadores operativos y comerciales utilizando información real.

#### Membresía

Consultar plan contratado, vigencia, historial de pagos y opciones de renovación.

### 7. APLICACIÓN MÓVIL MULTIROL

La APK deberá mostrar interfaces diferentes según el rol autenticado.

No desarrollar una interfaz única que exponga todas las funcionalidades a todos los usuarios.

**Operador de flota:** interfaz enfocada en cargas masivas, escaneo consecutivo, viajes y recepción.

**Motorizado:** interfaz enfocada en pedidos, rutas, entregas, devoluciones y confirmaciones.

**Cliente común:** interfaz enfocada en distribuidoras, compras, seguimiento del motorizado y consulta QR.

La autorización debe validarse en el backend y no depender únicamente de ocultar botones.

### 8. SISTEMA DE IDENTIFICACIÓN QR Y CÓDIGO MANUAL

Cada balón tendrá una identificación única vinculada a su registro en Supabase.

Implementar dos mecanismos principales:

**Escaneo QR:** identificación mediante la cámara del dispositivo.

**Ingreso manual:** identificación mediante un código alfanumérico cuando el QR no pueda leerse.

Ambos mecanismos deberán consultar el mismo registro.

Ejemplo de código:

SYS-2026-LPG-001

El código QR podrá contener un identificador o una URL de verificación segura.

No utilizar códigos QR que otorguen automáticamente permisos administrativos.

### 9. ESCANEO MASIVO PARA OPERADORES DE FLOTA

Implementar una interfaz especializada para registrar grandes cantidades de balones.

Funciones:
- Escaneo consecutivo sin cerrar la cámara después de cada lectura.
- Contador de balones registrados.
- Lista de códigos escaneados.
- Identificación de códigos repetidos.
- Validación de empresa propietaria y estado.
- Separación de balones llenos y vacíos.
- Registro de cantidades esperadas y reales.
- Confirmación de carga y descarga.
- Registro de responsable, vehículo, origen y destino.
- Sincronización con Supabase.
- Manejo de errores de conexión.
- Prevención de registros duplicados.

El sistema deberá permitir procesar cargas de decenas o cientos de balones sin necesidad de registrar cada unidad desde formularios independientes.

### 10. ESCANEO PARA MOTORIZADOS

El motorizado deberá escanear el balón antes de completar una entrega.

El sistema verificará:
- Identidad del balón.
- Distribuidora correspondiente.
- Estado operativo.
- Asignación al pedido.
- Restricciones de calidad.
- Historial de movimientos.

También permitirá registrar el balón vacío recuperado del cliente.

La confirmación de entrega deberá generar eventos de trazabilidad y movimientos de inventario consistentes.

### 11. CONSULTA QR PARA CLIENTES

El cliente podrá escanear o introducir el código de un balón.

El sistema mostrará un pasaporte digital con información pública autorizada:

- Código.
- Capacidad.
- Empresa responsable.
- Información de identificación.
- Estado de verificación.
- Último llenado registrado.
- Controles de calidad públicos.
- Eventos públicos de trazabilidad.

No mostrar datos personales, rutas internas, información financiera ni registros empresariales confidenciales.

### 12. TRAZABILIDAD DEL CICLO DE VIDA

Registrar cronológicamente los eventos de cada balón:

1. Registro inicial.
2. Inspección.
3. Llenado.
4. Control de peso.
5. Almacenamiento.
6. Asignación a carga.
7. Transporte masivo.
8. Recepción en distribuidora.
9. Asignación a pedido.
10. Reparto domiciliario.
11. Entrega al cliente.
12. Recuperación del balón vacío.
13. Retorno.
14. Mantenimiento.
15. Recalificación o retiro.

Cada evento deberá incluir identificador del balón, tipo de operación, fecha, responsable y empresa correspondiente.

Los eventos históricos deberán protegerse contra modificaciones y eliminaciones no autorizadas.

### 13. TRANSPORTE MASIVO

Este módulo gestionará movimientos de grandes cantidades de balones entre plantas, almacenes y puntos de distribución.

Registrar:
- Empresa.
- Vehículo.
- Operador.
- Origen.
- Destino.
- Fecha de salida.
- Fecha de llegada.
- Balones asignados.
- Balones recibidos.
- Diferencias de cantidad.
- Estado del transporte.
- Incidencias.

El administrador empresarial podrá supervisar estos movimientos desde la web.

### 14. REPARTO DOMICILIARIO

Este módulo gestionará las entregas a consumidores finales.

Registrar:
- Pedido.
- Distribuidora.
- Cliente.
- Motorizado asignado.
- Dirección.
- Producto.
- Balón asignado.
- Estado.
- Ubicación autorizada.
- Fecha de entrega.
- Confirmación de recepción.
- Devolución de balón vacío, si corresponde.

El cliente solo podrá visualizar la información de seguimiento de su propio pedido.

### 15. SEGUIMIENTO GPS

Diferenciar dos modalidades.

**GPS de flota:** visible para los administradores y operadores autorizados de la empresa.

**GPS domiciliario:** visible para la distribuidora y para el cliente que tiene un pedido activo asignado a ese motorizado.

El seguimiento del cliente deberá limitarse al servicio correspondiente y finalizar cuando termine la entrega.

No exponer rutas privadas ni posiciones históricas de trabajadores a clientes comunes.

### 16. AFILIACIÓN Y MEMBRESÍAS

Las empresas solicitarán acceso a SYSGAS mediante la web.

El flujo será:

1. Registro de solicitud.
2. Evaluación del superadministrador.
3. Selección del plan.
4. Generación de pago.
5. Verificación.
6. Activación.
7. Configuración empresarial.
8. Operación.
9. Renovación mensual.

Registrar estados como pendiente, activa, vencida y suspendida.

Conservar datos históricos al suspender una suscripción.

Los clientes finales y trabajadores no deben confundirse con empresas que solicitan afiliación.

### 17. BASE DE DATOS POSTGRESQL Y SUPABASE

Analizar las 13 tablas existentes:

- empresas_distribuidoras
- plantas_envasadoras
- perfiles
- productos_catalogo
- camiones_flota
- camiones_telemetria
- cilindros
- cilindros_trazabilidad
- pedidos
- pedido_items
- pesajes_entrega
- comprobantes_pago
- solicitudes_afiliacion

Extender el modelo para incorporar:

- planes_suscripcion
- suscripciones_empresas
- pagos_membresia
- usuarios_empresas
- zonas_cobertura
- vehiculos_reparto
- asignaciones_repartidores
- viajes_flota
- cargas_flota
- detalle_cargas_balones
- movimientos_inventario
- inventarios_empresa
- entregas_domiciliarias
- ubicaciones_repartidores
- auditoria_escaneos
- notificaciones

Evaluar la normalización y evitar redundancias.

No asumir que todas las tablas propuestas son obligatorias si pueden resolverse mediante una estructura mejor.

Mantener integridad referencial, restricciones, índices, transacciones y seguridad.

### 18. SEGURIDAD MULTIEMPRESA

Implementar políticas Row Level Security (RLS) para impedir accesos indebidos.

Cada empresa debe consultar y modificar únicamente los registros autorizados de su organización.

Los clientes solo deben consultar sus propios pedidos y la información pública permitida.

Los motorizados solo deben acceder a entregas asignadas.

Los operadores de flota solo deben acceder a operaciones autorizadas.

El superadministrador tendrá permisos globales controlados.

Nunca confiar en un rol enviado libremente desde el frontend.

No exponer claves secretas de Supabase en la web ni en la APK.

### 19. INTEGRACIÓN CON EL FRONTEND EXISTENTE

Analizar el código fuente de https://sysgas.vercel.app/ antes de realizar modificaciones.

Identificar:
- Framework utilizado.
- Rutas.
- Componentes.
- Formularios.
- Datos simulados.
- Consultas existentes.
- Módulos funcionales.
- Funciones pendientes.

Conectar los módulos a Supabase respetando el diseño actual.

Configurar variables de entorno y autenticación segura.

Implementar operaciones reales de lectura, inserción, actualización y consulta según permisos.

### 20. REPORTES Y ESTADÍSTICAS

El panel empresarial deberá mostrar:

- Pedidos diarios.
- Ventas por periodo.
- Productos más vendidos.
- Inventario actual.
- Balones por estado.
- Cantidades transportadas.
- Entregas completadas.
- Productividad de motorizados.
- Incidencias.
- Devoluciones.
- Estado de membresía.

El superadministrador deberá visualizar indicadores de afiliaciones, suscripciones, ingresos por membresías y utilización de la plataforma.

Todos los indicadores deberán proceder de registros reales.

### 21. ESCALABILIDAD

SYSGAS deberá permitir incorporar nuevas distribuidoras sin duplicar el sistema.

Cada nueva empresa tendrá sus propios datos, usuarios, inventarios, vehículos y operaciones.

La arquitectura deberá soportar expansión territorial, nuevos planes comerciales y futuras integraciones.

### 22. PLAN DE IMPLEMENTACIÓN

Desarrollar el proyecto por fases:

**Fase 1:** auditoría del frontend y del SQL existente.

**Fase 2:** corrección de arquitectura multiempresa, roles y políticas RLS.

**Fase 3:** implementación de afiliaciones y membresías.

**Fase 4:** conexión del panel web empresarial con Supabase.

**Fase 5:** inventario y trazabilidad QR mediante escaneo y código manual.

**Fase 6:** gestión de transporte masivo y escaneo consecutivo.

**Fase 7:** gestión de reparto domiciliario y asignación de motorizados.

**Fase 8:** desarrollo de APK multirol.

**Fase 9:** integración GPS, notificaciones y pesaje digital.

**Fase 10:** pruebas funcionales, seguridad, despliegue y documentación.

### 23. ENTREGABLES

Presentar:

1. Diagnóstico del sistema actual.
2. Arquitectura general.
3. Diagramas de actores y casos de uso.
4. Diagrama entidad-relación.
5. Base de datos SQL corregida.
6. Políticas RLS.
7. Estructura de frontend.
8. Estructura de APK.
9. Flujos de afiliación y membresía.
10. Flujos de transporte masivo.
11. Flujos de reparto domiciliario.
12. Flujo de escaneo QR y código manual.
13. Integración con Supabase.
14. Pruebas de funcionamiento.
15. Plan de despliegue y mantenimiento.

### 24. INSTRUCCIÓN FINAL

Construir SYSGAS como una plataforma SaaS multiempresa real, con una web empresarial y una aplicación móvil diferenciada por roles.

Mantener claramente separados:

- Superadministración de SYSGAS.
- Administración de distribuidoras.
- Transporte masivo de balones.
- Reparto domiciliario.
- Compra de gas por clientes.
- Pagos de membresías.
- Pagos de pedidos.

El escaneo QR y la búsqueda manual por código deberán funcionar como mecanismos equivalentes de identificación de balones.

Toda operación deberá mantener coherencia entre inventario, transporte, pedidos y trazabilidad.

No realizar cambios destructivos en la base de datos de producción sin presentar primero las migraciones y un mecanismo de respaldo.

El resultado final debe ser un ecosistema digital profesional, escalable, seguro y preparado para ofrecerse comercialmente a diferentes empresas distribuidoras de GLP en el Perú.