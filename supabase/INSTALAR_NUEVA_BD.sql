-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
--   SISTEMA SYSGAS Â· ARQUITECTURA DE BASE DE DATOS PARA POSTGRESQL & SUPABASE
--   RegiÃ³n: Puno, PerÃº Â© 2026
--   MÃ³dulos: Trazabilidad QR, IoT Pesaje Digital, Flota GPS, Pedidos & B2B
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€ 0. EXTENSIONES BÃSICAS â”€â”€â”€
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- â”€â”€â”€ 1. TIPOS ENUMERADOS (ENUMS) â”€â”€â”€

-- Roles de usuarios del ecosistema SYSGAS
DO $$ BEGIN
  CREATE TYPE public.rol_usuario AS ENUM (
    'super_admin',          -- Control total del sistema y auditorÃ­a
    'empresa_admin',        -- Gerente/dueÃ±o de distribuidora B2B
    'supervisor_calidad',   -- Inspector de pruebas hidrostÃ¡ticas e ISO
    'planta_operador',      -- Operador de envasado y calibraciÃ³n de tara
    'chofer_repartidor',    -- Conductor en ruta con app mÃ³vil y GPS
    'cliente_comun'         -- Usuario final / consumidor del balÃ³n
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Capacidades oficiales de cilindros
DO $$ BEGIN
  CREATE TYPE public.capacidad_cilindro AS ENUM (
    '5kg',    -- BalÃ³n PortÃ¡til / Camping
    '10kg',   -- BalÃ³n Familiar DomÃ©stico EstÃ¡ndar
    '45kg'    -- BalÃ³n Industrial / Comercial
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ciclo de vida y estado fÃ­sico del cilindro de gas
DO $$ BEGIN
  CREATE TYPE public.estado_cilindro AS ENUM (
    'en_planta',            -- En planta envasadora para llenado
    'en_almacen',           -- Almacenado y certificado listo para despacho
    'cargado_camion',       -- Asignado a unidad mÃ³vil de reparto
    'en_ruta_entrega',      -- En camino a domicilio del cliente
    'entregado_cliente',    -- En poder del cliente (activo)
    'recuperado_vacio',     -- BalÃ³n vacÃ­o devuelto por el cliente
    'en_mantenimiento',     -- ReparaciÃ³n de vÃ¡lvula o soldadura
    'baja_recalificacion'   -- Retirado por falla en prueba hidrostÃ¡tica
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estados de pedidos
DO $$ BEGIN
  CREATE TYPE public.estado_pedido AS ENUM (
    'pendiente',            -- Recibido en web o app mÃ³vil
    'asignado_chofer',      -- Asignado al camiÃ³n mÃ¡s cercano
    'en_camino',            -- Chofer en ruta hacia el domicilio
    'en_puerta_pesaje',     -- En puerta: validaciÃ³n de balanza digital
    'entregado',            -- Entregado y cobrado conforme
    'cancelado'             -- Pedido cancelado
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- MÃ©todos de pago disponibles en Puno
DO $$ BEGIN
  CREATE TYPE public.metodo_pago AS ENUM (
    'efectivo',
    'yape',
    'plin',
    'tarjeta_pos',
    'credito_empresa',
    'transferencia'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estado del pago
DO $$ BEGIN
  CREATE TYPE public.estado_pago AS ENUM (
    'pendiente',
    'completado',
    'fallido',
    'reembolsado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tipo de comprobante SUNAT
DO $$ BEGIN
  CREATE TYPE public.tipo_comprobante AS ENUM (
    'boleta_electronica',
    'factura_electronica',
    'nota_venta'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estado de solicitudes B2B de afiliaciÃ³n
DO $$ BEGIN
  CREATE TYPE public.estado_afiliacion AS ENUM (
    'pendiente_revision',
    'contactado',
    'aprobada_activa',
    'rechazada'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- â”€â”€â”€ 2. TABLAS MAESTRAS & ESTRUCTURA ORGANIZACIONAL â”€â”€â”€

-- 2.1 Empresas Distribuidoras B2B (Red de distribuidores en Puno)
CREATE TABLE IF NOT EXISTS public.empresas_distribuidoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruc VARCHAR(11) UNIQUE NOT NULL,
  razon_social VARCHAR(200) NOT NULL,
  nombre_comercial VARCHAR(150),
  ciudad VARCHAR(80) NOT NULL DEFAULT 'Puno',
  departamento VARCHAR(80) NOT NULL DEFAULT 'Puno',
  direccion TEXT NOT NULL,
  telefono_contacto VARCHAR(20) NOT NULL,
  correo_contacto VARCHAR(120) NOT NULL,
  volumen_estimado_mensual INT DEFAULT 2500, -- Balones por mes
  estado VARCHAR(20) NOT NULL DEFAULT 'activo', -- activo, suspendido
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2 Plantas Envasadoras de GLP (BahÃ­as de llenado e inspecciÃ³n)
CREATE TABLE IF NOT EXISTS public.plantas_envasadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_planta VARCHAR(30) UNIQUE NOT NULL, -- Ej: 'PL-PUNO-01'
  nombre VARCHAR(150) NOT NULL,              -- Ej: 'Planta Envasadora Central Puno'
  ubicacion VARCHAR(150) NOT NULL DEFAULT 'Puno - Juliaca Km 4.5',
  capacidad_tanques_galones NUMERIC(12, 2) DEFAULT 50000.00,
  supervisor_responsable VARCHAR(150),
  licencia_osinergmin VARCHAR(60),
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.3 Perfiles de Usuario (Vinculados 1:1 con Supabase Auth `auth.users`)
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol public.rol_usuario NOT NULL DEFAULT 'cliente_comun',
  empresa_id UUID REFERENCES public.empresas_distribuidoras(id) ON DELETE SET NULL,
  planta_id UUID REFERENCES public.plantas_envasadoras(id) ON DELETE SET NULL,
  dni_ce VARCHAR(15),
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  correo VARCHAR(120) NOT NULL,
  codigo_operador VARCHAR(30) UNIQUE, -- Ej: 'OP-7024', 'CHOF-PUNO-08'
  activo BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.4 CatÃ¡logo Oficial de Productos GLP
CREATE TABLE IF NOT EXISTS public.productos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capacidad public.capacidad_cilindro NOT NULL UNIQUE,
  nombre_comercial VARCHAR(80) NOT NULL,     -- 'BalÃ³n Familiar 10 kg'
  descripcion TEXT NOT NULL,
  dimensiones VARCHAR(60) NOT NULL,          -- '62 cm alto Ã— 30 cm Ã¸'
  tara_promedio_kg NUMERIC(6, 2) NOT NULL,   -- 11.50
  peso_neto_gas_kg NUMERIC(6, 2) NOT NULL,   -- 10.00
  precio_venta_pen NUMERIC(8, 2) NOT NULL,   -- 48.00
  disponible_en_puno BOOLEAN NOT NULL DEFAULT true,
  imagen_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- â”€â”€â”€ 3. FLOTA DE TRANSPORTE Y TELEMETRÃA GPS â”€â”€â”€

-- 3.1 Camiones Repartidores
CREATE TABLE IF NOT EXISTS public.camiones_flota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas_distribuidoras(id) ON DELETE CASCADE,
  chofer_asignado_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  placa VARCHAR(10) UNIQUE NOT NULL,         -- Ej: 'Z4A-892'
  numero_unidad VARCHAR(20) NOT NULL,        -- Ej: 'Unidad #08'
  marca VARCHAR(50) DEFAULT 'Isuzu Elf',
  modelo VARCHAR(50) DEFAULT '2025',
  capacidad_balones INT NOT NULL DEFAULT 80, -- Capacidad de cilindros de 10kg
  estado_unidad VARCHAR(30) NOT NULL DEFAULT 'disponible', -- 'en_ruta', 'en_planta', 'mantenimiento'
  dispositivo_gps_imei VARCHAR(40),
  ultima_latitud NUMERIC(10, 7),
  ultima_longitud NUMERIC(10, 7),
  ultima_telemetria TIMESTAMPTZ,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2 Historial de TelemetrÃ­a GPS en Tiempo Real
CREATE TABLE IF NOT EXISTS public.camiones_telemetria (
  id BIGSERIAL PRIMARY KEY,
  camion_id UUID NOT NULL REFERENCES public.camiones_flota(id) ON DELETE CASCADE,
  latitud NUMERIC(10, 7) NOT NULL,
  longitud NUMERIC(10, 7) NOT NULL,
  altitud_msnm NUMERIC(7, 2) DEFAULT 3812.00, -- Altitud promedio Puno
  velocidad_kmh NUMERIC(5, 2) DEFAULT 0.00,
  rumbo_grados NUMERIC(5, 2),
  nivel_bateria_sensor NUMERIC(5, 2),
  timestamp_gps TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- â”€â”€â”€ 4. CILINDROS DE GAS & PASAPORTE QR INMUTABLE â”€â”€â”€

-- 4.1 Cilindros FÃ­sicos (Pasaporte Digital Unitario)
CREATE TABLE IF NOT EXISTS public.cilindros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_qr VARCHAR(60) UNIQUE NOT NULL,      -- Ej: 'SYS-2026-LPG-001' o 'GD-2024-00142'
  uuid_inmutable VARCHAR(64) UNIQUE NOT NULL, -- Hash o UUID pÃºblico del pasaporte
  numero_serie_fabricacion VARCHAR(60) NOT NULL,
  capacidad public.capacidad_cilindro NOT NULL DEFAULT '10kg',
  empresa_duena_id UUID REFERENCES public.empresas_distribuidoras(id) ON DELETE SET NULL,
  planta_envasado_id UUID REFERENCES public.plantas_envasadoras(id) ON DELETE SET NULL,
  camion_actual_id UUID REFERENCES public.camiones_flota(id) ON DELETE SET NULL,
  cliente_actual_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  
  -- Pesos y calibraciÃ³n fÃ­sica (Sistema mÃ©trico)
  tara_calibrada_kg NUMERIC(6, 2) NOT NULL,   -- Tara vacÃ­a estampada (ej: 11.45 kg)
  peso_bruto_actual_kg NUMERIC(6, 2),        -- Con gas (ej: 21.45 kg)
  
  -- Estado y trazabilidad
  estado public.estado_cilindro NOT NULL DEFAULT 'en_planta',
  codigo_precinto_actual VARCHAR(40),        -- Precinto inviolable #PR-7721
  lote_envasado VARCHAR(40),
  
  -- Fechas normativas y certificaciones
  fecha_fabricacion DATE,
  fecha_ultimo_envasado TIMESTAMPTZ,
  fecha_ultima_prueba_hidrostatica DATE,     -- Prueba a 14.7 bar
  fecha_proxima_recalificacion DATE,         -- Vigencia por norma tÃ©cnica
  norma_tecnica_certificada VARCHAR(60) DEFAULT 'ISO 4706 / NTP 350.011',
  
  -- Bloqueo de seguridad preventivo
  aprobado_calidad BOOLEAN NOT NULL DEFAULT true,
  motivo_bloqueo TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4.2 Historial Inmutable de Eventos del BalÃ³n (AuditorÃ­a para el escÃ¡ner QR)
CREATE TABLE IF NOT EXISTS public.cilindros_trazabilidad (
  id BIGSERIAL PRIMARY KEY,
  cilindro_id UUID NOT NULL REFERENCES public.cilindros(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(80) NOT NULL, -- 'Llenado y Control de Tara', 'Prueba HidrostÃ¡tica', 'Despacho', 'Entrega a Cliente'
  descripcion TEXT NOT NULL,
  operador_nombre VARCHAR(120),
  operador_licencia VARCHAR(60),
  planta_o_sede VARCHAR(120),
  icono_bootstrap VARCHAR(40) DEFAULT 'bi-patch-check-fill',
  es_conforme BOOLEAN NOT NULL DEFAULT true,
  presion_prueba_bar NUMERIC(6, 2), -- Ej: 14.7 bar
  peso_registrado_kg NUMERIC(6, 2), -- Lectura balanza digital
  precinto_seguridad VARCHAR(40),
  coordenadas_evento VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- â”€â”€â”€ 5. PEDIDOS, DESPACHO EXPRESS Y PESAJE EN PUERTA â”€â”€â”€

-- 5.1 Pedidos de Gas (Web, MÃ³vil, WhatsApp)
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ticket VARCHAR(30) UNIQUE NOT NULL, -- Ej: 'TK-2026-00412'
  cliente_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas_distribuidoras(id) ON DELETE SET NULL,
  camion_id UUID REFERENCES public.camiones_flota(id) ON DELETE SET NULL,
  chofer_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  
  -- Datos de contacto y entrega en Puno
  nombre_destinatario VARCHAR(120) NOT NULL,
  telefono_contacto VARCHAR(20) NOT NULL,
  ciudad VARCHAR(60) NOT NULL DEFAULT 'Puno',
  direccion_entrega TEXT NOT NULL,
  referencia_direccion TEXT,
  latitud_entrega NUMERIC(10, 7),
  longitud_entrega NUMERIC(10, 7),
  
  -- Estado y plazos
  estado public.estado_pedido NOT NULL DEFAULT 'pendiente',
  tiempo_estimado_minutos INT DEFAULT 25,
  fecha_hora_asignacion TIMESTAMPTZ,
  fecha_hora_llegada TIMESTAMPTZ,
  fecha_hora_entrega TIMESTAMPTZ,
  
  -- Totales monetarios (PEN)
  total_pedido_pen NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  metodo_pago public.metodo_pago NOT NULL DEFAULT 'efectivo',
  estado_pago public.estado_pago NOT NULL DEFAULT 'pendiente',
  notas_cliente TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5.2 Detalle de Ãtems del Pedido
CREATE TABLE IF NOT EXISTS public.pedido_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  capacidad public.capacidad_cilindro NOT NULL DEFAULT '10kg',
  cilindro_asignado_id UUID REFERENCES public.cilindros(id) ON DELETE SET NULL,
  cilindro_vacio_recuperado_id UUID REFERENCES public.cilindros(id) ON DELETE SET NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario_pen NUMERIC(8, 2) NOT NULL,
  subtotal_pen NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5.3 CertificaciÃ³n de Pesaje Digital en Puerta (IoT Balanza Bluetooth)
CREATE TABLE IF NOT EXISTS public.pesajes_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  cilindro_entregado_id UUID NOT NULL REFERENCES public.cilindros(id),
  cilindro_vacio_retornado_id UUID REFERENCES public.cilindros(id),
  chofer_id UUID REFERENCES public.perfiles(id),
  
  -- Balanza digital
  id_balanza_bluetooth VARCHAR(60) NOT NULL, -- Ej: 'BLZ-KERN-BT-09'
  peso_bruto_medido_kg NUMERIC(6, 2) NOT NULL, -- Ej: 21.48 kg
  tara_descontada_kg NUMERIC(6, 2) NOT NULL,   -- Ej: 11.45 kg
  peso_neto_calculado_kg NUMERIC(6, 2) NOT NULL, -- 10.03 kg
  margen_tolerancia_kg NUMERIC(4, 2) NOT NULL DEFAULT 0.05,
  pesaje_aprobado BOOLEAN NOT NULL DEFAULT true,
  
  -- Evidencia y cliente
  foto_precinto_url TEXT,
  firma_digital_cliente_url TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5.4 Comprobantes de Pago ElectrÃ³nicos (SUNAT)
CREATE TABLE IF NOT EXISTS public.comprobantes_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo public.tipo_comprobante NOT NULL DEFAULT 'boleta_electronica',
  serie VARCHAR(10) NOT NULL,                -- Ej: 'B001' o 'F001'
  correlativo INT NOT NULL,                  -- Ej: 14820
  numero_completo VARCHAR(20) NOT NULL,      -- Ej: 'B001-00014820'
  dni_ruc_receptor VARCHAR(15),
  razon_social_receptor VARCHAR(150),
  subtotal_pen NUMERIC(10, 2) NOT NULL,
  igv_pen NUMERIC(10, 2) NOT NULL,
  total_pen NUMERIC(10, 2) NOT NULL,
  codigo_hash_sunat VARCHAR(100),
  pdf_url TEXT,
  xml_url TEXT,
  estado_sunat VARCHAR(30) DEFAULT 'ACEPTADO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- â”€â”€â”€ 6. B2B SOLICITUDES DE AFILIACIÃ“N (Landing Page Calculadora) â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.solicitudes_afiliacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa VARCHAR(150) NOT NULL,
  representante_nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  correo VARCHAR(120) NOT NULL,
  ciudad VARCHAR(80) NOT NULL DEFAULT 'Puno',
  volumen_mensual_balones INT NOT NULL DEFAULT 2500,
  ahorro_estimado_pen NUMERIC(10, 2),
  estado public.estado_afiliacion NOT NULL DEFAULT 'pendiente_revision',
  mensaje_adicional TEXT,
  notas_internas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- â”€â”€â”€ 7. ÃNDICES DE RENDIMIENTO (QUERIES FRECUENTES) â”€â”€â”€

-- Trazabilidad y escaneo inmediato de QR (Prioridad 0 en menos de 50ms)
CREATE INDEX IF NOT EXISTS idx_cilindros_qr ON public.cilindros(codigo_qr);
CREATE INDEX IF NOT EXISTS idx_cilindros_uuid ON public.cilindros(uuid_inmutable);
CREATE INDEX IF NOT EXISTS idx_cilindros_estado ON public.cilindros(estado);
CREATE INDEX IF NOT EXISTS idx_trazabilidad_cilindro ON public.cilindros_trazabilidad(cilindro_id);

-- Despacho, flota y pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_ticket ON public.pedidos(codigo_ticket);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_chofer ON public.pedidos(chofer_id);
CREATE INDEX IF NOT EXISTS idx_telemetria_camion ON public.camiones_telemetria(camion_id, timestamp_gps DESC);
CREATE INDEX IF NOT EXISTS idx_camiones_empresa ON public.camiones_flota(empresa_id);


-- â”€â”€â”€ 8. TRIGGERS AUTOMÃTICOS & FUNCIONES â”€â”€â”€

-- 8.1 FunciÃ³n genÃ©rica para actualizar columna `updated_at`
CREATE OR REPLACE FUNCTION public.actualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AsignaciÃ³n de triggers de timestamp
DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public.empresas_distribuidoras;
CREATE TRIGGER trg_empresas_updated_at
BEFORE UPDATE ON public.empresas_distribuidoras
FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_perfiles_updated_at ON public.perfiles;
CREATE TRIGGER trg_perfiles_updated_at
BEFORE UPDATE ON public.perfiles
FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_cilindros_updated_at ON public.cilindros;
CREATE TRIGGER trg_cilindros_updated_at
BEFORE UPDATE ON public.cilindros
FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER trg_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 8.2 Trigger para Sincronizar Nuevo Usuario de Supabase Auth con Perfiles
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (
    id,
    correo,
    nombres,
    apellidos,
    rol
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nombres', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', 'SYSGAS'),
    COALESCE((NEW.raw_user_meta_data->>'rol')::public.rol_usuario, 'cliente_comun')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- â”€â”€â”€ 9. ROW LEVEL SECURITY (RLS) & POLÃTICAS DE ACCESO â”€â”€â”€

-- Habilitar RLS en todas las tablas
ALTER TABLE public.empresas_distribuidoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantas_envasadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camiones_flota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camiones_telemetria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cilindros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cilindros_trazabilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesajes_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_afiliacion ENABLE ROW LEVEL SECURITY;

-- 9.1 PolÃ­ticas PÃºblicas Transparentes (Lectura libre sin login para verificar QR del balÃ³n)
CREATE POLICY "Lectura pÃºblica de pasaporte QR de cilindros"
ON public.cilindros FOR SELECT
USING (true);

CREATE POLICY "Lectura pÃºblica del historial de eventos de trazabilidad"
ON public.cilindros_trazabilidad FOR SELECT
USING (true);

CREATE POLICY "Lectura pÃºblica del catÃ¡logo de productos"
ON public.productos_catalogo FOR SELECT
USING (true);

-- 9.2 PolÃ­ticas de Perfiles
CREATE POLICY "Lectura de perfiles de usuarios autenticados"
ON public.perfiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
ON public.perfiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 9.3 PolÃ­ticas para Pedidos
CREATE POLICY "Cualquier persona puede crear un pedido express"
ON public.pedidos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Los clientes ven sus propios pedidos"
ON public.pedidos FOR SELECT
TO authenticated
USING (
  auth.uid() = cliente_id OR
  auth.uid() = chofer_id OR
  EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE perfiles.id = auth.uid()
    AND perfiles.rol IN ('super_admin', 'empresa_admin')
  )
);

CREATE POLICY "Cualquiera puede insertar items de pedido al comprar"
ON public.pedido_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Ver items de pedidos autorizados"
ON public.pedido_items FOR SELECT
USING (true);

-- 9.4 Solicitudes B2B de AfiliaciÃ³n
CREATE POLICY "Crear solicitud de afiliaciÃ³n pÃºblica"
ON public.solicitudes_afiliacion FOR INSERT
WITH CHECK (true);

CREATE POLICY "Ver solicitudes de afiliaciÃ³n administradores"
ON public.solicitudes_afiliacion FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE perfiles.id = auth.uid()
    AND perfiles.rol IN ('super_admin', 'empresa_admin')
  )
);


-- â”€â”€â”€ 10. DATOS SEMILLA (SEED DATA REALISTA PARA PUNO) â”€â”€â”€

-- 10.1 CatÃ¡logo Oficial
INSERT INTO public.productos_catalogo (capacidad, nombre_comercial, descripcion, dimensiones, tara_promedio_kg, peso_neto_gas_kg, precio_venta_pen)
VALUES
  ('5kg', 'BalÃ³n PortÃ¡til', 'Departamentos, campamentos, parrillas y espacios reducidos.', '38 cm alto Ã— 23 cm Ã¸', 6.20, 5.00, 28.50),
  ('10kg', 'BalÃ³n Familiar', 'El mÃ¡s elegido para hogares familiares, cocinas y pequeÃ±os negocios.', '62 cm alto Ã— 30 cm Ã¸', 11.50, 10.00, 48.00),
  ('45kg', 'BalÃ³n Industrial', 'Restaurantes, panaderÃ­as, hoteles y calderas de alta demanda.', '132 cm alto Ã— 38 cm Ã¸', 38.00, 45.00, 185.00)
ON CONFLICT (capacidad) DO UPDATE
SET
  precio_venta_pen = EXCLUDED.precio_venta_pen,
  dimensiones = EXCLUDED.dimensiones;

-- 10.2 Planta Envasadora en Puno
INSERT INTO public.plantas_envasadoras (codigo_planta, nombre, ubicacion, supervisor_responsable, licencia_osinergmin)
VALUES
  ('PL-PUNO-01', 'Planta Envasadora Central Puno Â· BahÃ­a 04', 'Av. Sesquicentenario 1140, Puno', 'Ing. Carlos Morales Â· Lic. GLP-884', 'OSINERGMIN-GLP-2026-PUNO')
ON CONFLICT (codigo_planta) DO NOTHING;

-- 10.3 Empresa Distribuidora B2B
INSERT INTO public.empresas_distribuidoras (ruc, razon_social, nombre_comercial, ciudad, direccion, telefono_contacto, correo_contacto, volumen_estimado_mensual)
VALUES
  ('20608821941', 'DISTRIBUIDORA GAS DEL ALTIPLANO S.A.C.', 'SYSGAS Red Puno', 'Puno', 'Jr. Arequipa 520, Puno', '+51 951 667 696', 'contacto@sysgas.pe', 3500)
ON CONFLICT (ruc) DO NOTHING;

-- 10.4 CamiÃ³n de Flota Demo
INSERT INTO public.camiones_flota (empresa_id, placa, numero_unidad, marca, capacidad_balones, estado_unidad, ultima_latitud, ultima_longitud)
SELECT
  id,
  'Z4A-892',
  'Unidad #08',
  'Isuzu Elf GLP',
  90,
  'en_ruta',
  -15.8402218, -- Puno Centro
  -70.0218805  -- Puno Centro
FROM public.empresas_distribuidoras
WHERE ruc = '20608821941'
ON CONFLICT (placa) DO NOTHING;

-- 10.5 Cilindros de DemostraciÃ³n con CÃ³digos del Sistema (Coincidentes con la Demo del Frontend)
-- Cilindro 1: 'demo-001' (BalÃ³n Familiar 10 kg con trazabilidad completa)
INSERT INTO public.cilindros (
  codigo_qr,
  uuid_inmutable,
  numero_serie_fabricacion,
  capacidad,
  tara_calibrada_kg,
  peso_bruto_actual_kg,
  estado,
  codigo_precinto_actual,
  lote_envasado,
  fecha_fabricacion,
  fecha_ultimo_envasado,
  fecha_ultima_prueba_hidrostatica,
  norma_tecnica_certificada
) VALUES (
  'demo-001',
  'f839a1-2026-c774-4b10-891920',
  'GD-2024-00142',
  '10kg',
  11.45,
  21.45,
  'en_ruta_entrega',
  'PR-7721',
  'LOTE-2026-OCT-B4',
  '2024-03-15',
  timezone('utc'::text, now()) - interval '4 hours',
  '2026-10-14',
  'ISO 4706 / NTP 350.011'
) ON CONFLICT (codigo_qr) DO NOTHING;

-- Cilindro 2: 'SYS-2026-LPG-001' (El escaneable en la Landing Page)
INSERT INTO public.cilindros (
  codigo_qr,
  uuid_inmutable,
  numero_serie_fabricacion,
  capacidad,
  tara_calibrada_kg,
  peso_bruto_actual_kg,
  estado,
  codigo_precinto_actual,
  lote_envasado,
  fecha_fabricacion,
  fecha_ultimo_envasado,
  fecha_ultima_prueba_hidrostatica,
  norma_tecnica_certificada
) VALUES (
  'SYS-2026-LPG-001',
  'b9921c-2026-a112-992014-sysgas',
  'SN-2025-PUNO-8812',
  '10kg',
  11.50,
  21.50,
  'en_ruta_entrega',
  'PR-8902',
  'LOTE-PUNO-2026-10',
  '2025-01-20',
  timezone('utc'::text, now()) - interval '2 hours',
  '2026-09-10',
  'ISO 9001:2015 / ISO 4706'
) ON CONFLICT (codigo_qr) DO NOTHING;

-- Cilindro 3: BalÃ³n Industrial 45 kg
INSERT INTO public.cilindros (
  codigo_qr,
  uuid_inmutable,
  numero_serie_fabricacion,
  capacidad,
  tara_calibrada_kg,
  peso_bruto_actual_kg,
  estado,
  codigo_precinto_actual,
  lote_envasado,
  fecha_fabricacion,
  fecha_ultimo_envasado,
  fecha_ultima_prueba_hidrostatica,
  norma_tecnica_certificada
) VALUES (
  'SYS-2026-IND-045',
  'ind45-2026-columna-772091',
  'IND-45KG-2024-099',
  '45kg',
  38.00,
  83.00,
  'en_almacen',
  'PR-IND-4401',
  'LOTE-IND-2026-09',
  '2024-06-10',
  timezone('utc'::text, now()) - interval '1 day',
  '2026-08-15',
  'ISO 4706 / ASME SecciÃ³n VIII'
) ON CONFLICT (codigo_qr) DO NOTHING;

-- 10.6 Trazabilidad Inmutable para 'demo-001' (IdÃ©ntico a BalloonHistory.jsx)
INSERT INTO public.cilindros_trazabilidad (cilindro_id, tipo_evento, descripcion, operador_nombre, planta_o_sede, icono_bootstrap, es_conforme, presion_prueba_bar, peso_registrado_kg, precinto_seguridad)
SELECT
  id,
  'Llenado y Control de Tara',
  'Carga computarizada de 10.00 kg netos de propano/butano. BÃ¡scula calibrada #B-04.',
  'Ing. Carlos Morales',
  'Planta Envasadora Central Puno',
  'bi-droplet-fill',
  true,
  NULL,
  21.45,
  'PR-7721'
FROM public.cilindros WHERE codigo_qr = 'demo-001';

INSERT INTO public.cilindros_trazabilidad (cilindro_id, tipo_evento, descripcion, operador_nombre, planta_o_sede, icono_bootstrap, es_conforme, presion_prueba_bar, peso_registrado_kg, precinto_seguridad)
SELECT
  id,
  'Prueba de PresiÃ³n HidrostÃ¡tica',
  'PresiÃ³n aplicada de 14.7 bar durante 60 segundos. DeformaciÃ³n permanente: 0.00%. APROBADO.',
  'Inspector de Ensayos No Destructivos',
  'Laboratorio de Calidad Altiplano',
  'bi-speedometer2',
  true,
  14.70,
  NULL,
  NULL
FROM public.cilindros WHERE codigo_qr = 'demo-001';

INSERT INTO public.cilindros_trazabilidad (cilindro_id, tipo_evento, descripcion, operador_nombre, planta_o_sede, icono_bootstrap, es_conforme, presion_prueba_bar, peso_registrado_kg, precinto_seguridad)
SELECT
  id,
  'CertificaciÃ³n de Calidad ISO 4706',
  'InspecciÃ³n de cordÃ³n de soldadura por ultrasonido. VÃ¡lvula de alivio calibrada a 24 bar.',
  'Supervisor ISO: T. GÃ³mez Â· Acta #ISO-4706-9912',
  'Organismo de AcreditaciÃ³n',
  'bi-patch-check-fill',
  true,
  NULL,
  NULL,
  NULL
FROM public.cilindros WHERE codigo_qr = 'demo-001';

INSERT INTO public.cilindros_trazabilidad (cilindro_id, tipo_evento, descripcion, operador_nombre, planta_o_sede, icono_bootstrap, es_conforme, presion_prueba_bar, peso_registrado_kg, precinto_seguridad)
SELECT
  id,
  'Despacho y Carga a VehÃ­culo',
  'Salida de planta en camiÃ³n GLP-03 con precinto de seguridad #PR-7721.',
  'Despachador en Ruta: J. PÃ©rez',
  'Patio de Carga Puno',
  'bi-truck',
  true,
  NULL,
  21.45,
  'PR-7721'
FROM public.cilindros WHERE codigo_qr = 'demo-001';

INSERT INTO public.cilindros_trazabilidad (cilindro_id, tipo_evento, descripcion, operador_nombre, planta_o_sede, icono_bootstrap, es_conforme, presion_prueba_bar, peso_registrado_kg, precinto_seguridad)
SELECT
  id,
  'TelemetrÃ­a en Vivo de AproximaciÃ³n',
  'VehÃ­culo a 850 metros del domicilio de destino en Puno. Hora estimada de llegada: 14:35.',
  'Sensor GPS en tiempo real',
  'Ruta Puno Centro',
  'bi-geo-alt-fill',
  true,
  NULL,
  NULL,
  NULL
FROM public.cilindros WHERE codigo_qr = 'demo-001';

-- 10.7 Pedido Demostrativo
INSERT INTO public.pedidos (
  codigo_ticket,
  nombre_destinatario,
  telefono_contacto,
  ciudad,
  direccion_entrega,
  referencia_direccion,
  latitud_entrega,
  longitud_entrega,
  estado,
  tiempo_estimado_minutos,
  total_pedido_pen,
  metodo_pago,
  estado_pago
) VALUES (
  'TK-2026-00142',
  'Carlos Mendoza Flores',
  '+51 951 667 696',
  'Puno',
  'Jr. Deustua 428, Barrio PorteÃ±o',
  'A media cuadra del Lago Titicaca',
  -15.8389100,
  -70.0234000,
  'en_camino',
  8,
  48.00,
  'yape',
  'pendiente'
) ON CONFLICT (codigo_ticket) DO NOTHING;

-- === 202610300001_frontend.sql ===
-- Ejecutar DESPUÃ‰S del esquema SYSGAS proporcionado por el propietario.

-- Los metadatos del registro son controlados por el usuario: nunca asignar roles desde ellos.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, correo, nombres, apellidos, rol)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'nombres', 'Usuario'),
    coalesce(new.raw_user_meta_data->>'apellidos', 'SYSGAS'), 'cliente_comun');
  return new;
end;
$$;

drop policy if exists "Lectura de perfiles de usuarios autenticados" on public.perfiles;
drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.perfiles;
drop policy if exists "perfil_propio" on public.perfiles;
create policy "perfil_propio" on public.perfiles for select to authenticated using (id = auth.uid());
revoke update on public.perfiles from anon, authenticated;
grant update (nombres, apellidos, telefono, avatar_url) on public.perfiles to authenticated;
drop policy if exists "editar_contacto_propio" on public.perfiles;
create policy "editar_contacto_propio" on public.perfiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

-- Un pedido y sus Ã­tems se crean en una transacciÃ³n con precio obtenido del catÃ¡logo.
revoke insert on public.pedidos, public.pedido_items from anon, authenticated;
create or replace function public.crear_pedido_web(
  p_nombre text, p_telefono text, p_direccion text, p_referencia text,
  p_capacidad public.capacidad_cilindro
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_precio numeric;
  v_id uuid;
  v_ticket text := 'TK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));
  v_cliente uuid;
begin
  if length(trim(p_nombre)) not between 2 and 120
    or p_nombre is null or p_telefono is null or p_direccion is null
    or length(trim(p_direccion)) not between 5 and 500
    or length(p_telefono) > 20
    or p_telefono !~ '^\+?[0-9 ()-]{7,20}$'
    or length(coalesce(p_referencia, '')) > 500 then
    raise exception 'Revisa el nombre, telÃ©fono y direcciÃ³n de entrega.';
  end if;
  select precio_venta_pen into v_precio from public.productos_catalogo
    where capacidad = p_capacidad and disponible_en_puno;
  if v_precio is null or v_precio <= 0 then raise exception 'Producto no disponible.'; end if;
  select id into v_cliente from public.perfiles where id = auth.uid() and activo;
  insert into public.pedidos(codigo_ticket, cliente_id, nombre_destinatario, telefono_contacto,
    direccion_entrega, referencia_direccion, total_pedido_pen)
  values(v_ticket, v_cliente, trim(p_nombre), trim(p_telefono), trim(p_direccion), p_referencia, v_precio)
  returning id into v_id;
  insert into public.pedido_items(pedido_id, capacidad, cantidad, precio_unitario_pen, subtotal_pen)
  values(v_id, p_capacidad, 1, v_precio, v_precio);
  return v_ticket;
end;
$$;
revoke all on function public.crear_pedido_web(text,text,text,text,public.capacidad_cilindro) from public;
grant execute on function public.crear_pedido_web(text,text,text,text,public.capacidad_cilindro) to anon, authenticated;

-- Los administradores de empresa solo ven su empresa; los clientes y choferes, sus pedidos.
drop policy if exists "Los clientes ven sus propios pedidos" on public.pedidos;
create policy "Los clientes ven sus propios pedidos" on public.pedidos for select to authenticated using (
  exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo and (
    pedidos.cliente_id = p.id or pedidos.chofer_id = p.id or p.rol = 'super_admin'
    or (p.rol = 'empresa_admin' and p.empresa_id = pedidos.empresa_id)))
);
drop policy if exists "Ver items de pedidos autorizados" on public.pedido_items;
create policy "Ver items de pedidos autorizados" on public.pedido_items for select to authenticated
using (exists(select 1 from public.pedidos p where p.id = pedido_id));

-- Pasaporte pÃºblico: devuelve Ãºnicamente campos destinados al consumidor.
revoke select on public.cilindros, public.cilindros_trazabilidad from anon, authenticated;
create or replace function public.pasaporte_publico(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'codigo', c.numero_serie_fabricacion, 'uuid', c.uuid_inmutable,
    'tipo', c.capacidad::text, 'tara', c.tara_calibrada_kg::text || ' kg',
    'pesoBruto', coalesce(c.peso_bruto_actual_kg::text || ' kg', 'Sin registro'),
    'estado', upper(replace(c.estado::text, '_', ' ')),
    'planta', coalesce(p.nombre, 'Sin registro'),
    'operadorLlenado', coalesce((select t.operador_nombre from public.cilindros_trazabilidad t
      where t.cilindro_id = c.id and t.tipo_evento ilike '%llenado%' order by t.created_at desc limit 1), 'Sin registro'),
    'eventos', coalesce((select jsonb_agg(jsonb_build_object(
      'fecha', to_char(t.created_at at time zone 'America/Lima', 'DD/MM/YYYY HH24:MI'),
      'evento', t.tipo_evento, 'detalle', t.descripcion, 'operador', t.operador_nombre,
      'icono', t.icono_bootstrap, 'ok', t.es_conforme) order by t.created_at, t.id)
      from public.cilindros_trazabilidad t where t.cilindro_id = c.id), '[]'::jsonb),
    'certificados', case when c.norma_tecnica_certificada is null then '[]'::jsonb else
      jsonb_build_array(jsonb_build_object('norma', c.norma_tecnica_certificada,
        'descripcion', 'Norma registrada para este cilindro', 'codigoCert', c.codigo_qr,
        'estado', case when not c.aprobado_calidad then 'BLOQUEADO'
          when c.fecha_proxima_recalificacion < current_date then 'RECALIFICACIÃ“N VENCIDA'
          else 'REGISTRADA' end)) end
  ) from public.cilindros c left join public.plantas_envasadoras p on p.id = c.planta_envasado_id
  where c.codigo_qr = p_codigo limit 1;
$$;
revoke all on function public.pasaporte_publico(text) from public;
grant execute on function public.pasaporte_publico(text) to anon, authenticated;
grant select on public.perfiles, public.pedidos, public.pedido_items to authenticated;
grant select on public.productos_catalogo to anon, authenticated;
revoke insert on public.solicitudes_afiliacion from anon, authenticated;
grant insert (nombre_empresa, representante_nombre, telefono, correo, ciudad, volumen_mensual_balones)
  on public.solicitudes_afiliacion to anon, authenticated;

-- === 202610300002_admin_afiliaciones.sql ===
-- Ejecutar en SQL Editor despuÃ©s de la migraciÃ³n 001 y del registro del administrador.

alter table public.solicitudes_afiliacion
  add column if not exists empresa_id uuid references public.empresas_distribuidoras(id),
  add column if not exists revisado_por uuid references public.perfiles(id),
  add column if not exists revisado_at timestamptz;

-- La asignaciÃ³n inicial se ejecuta Ãºnicamente con privilegios de SQL Editor.
do $$
declare v_id uuid; v_correo text:=nullif(current_setting('sysgas.admin_email',true),'');
begin
  if v_correo is null then return; end if;
  select id into v_id from auth.users where lower(email) = lower(v_correo);
  if v_id is null then raise exception 'Registra primero la cuenta indicada en sysgas.admin_email.'; end if;
  insert into public.perfiles(id,correo,nombres,apellidos,rol,activo)
    values(v_id,v_correo,'Administrador','SYSGAS','super_admin',true)
    on conflict(id) do update set rol='super_admin', activo=true;
end;
$$;

drop policy if exists "Ver solicitudes de afiliaciÃ³n administradores" on public.solicitudes_afiliacion;
create policy "Ver solicitudes de afiliaciÃ³n administradores" on public.solicitudes_afiliacion
for select to authenticated using (exists(select 1 from public.perfiles p
  where p.id=auth.uid() and p.activo and p.rol='super_admin'));
grant select on public.solicitudes_afiliacion to authenticated;
revoke update, delete on public.solicitudes_afiliacion from anon, authenticated;

create or replace function public.revisar_afiliacion(
  p_solicitud uuid, p_estado public.estado_afiliacion,
  p_notas text default '', p_ruc text default '', p_direccion text default ''
) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.solicitudes_afiliacion; v_usuario uuid; v_empresa uuid;
begin
  if not exists(select 1 from public.perfiles where id=auth.uid() and activo and rol='super_admin') then
    raise exception using errcode='42501', message='Solo el administrador puede revisar afiliaciones.';
  end if;
  if p_estado is null or p_estado not in ('contactado','aprobada_activa','rechazada') then
    raise exception using errcode='P0001', message='Selecciona un estado vÃ¡lido.';
  end if;
  if length(coalesce(p_notas,''))>2000 then raise exception using errcode='P0001', message='Las notas no pueden superar 2000 caracteres.'; end if;
  select * into s from public.solicitudes_afiliacion where id=p_solicitud for update;
  if not found then raise exception using errcode='P0001', message='La solicitud ya no existe.'; end if;
  if s.estado in ('aprobada_activa','rechazada') then
    raise exception using errcode='P0001', message='La solicitud ya fue resuelta. Actualiza la lista.';
  end if;
  if p_estado='aprobada_activa' then
    if p_ruc is null or p_ruc !~ '^[0-9]{11}$' or length(trim(coalesce(p_direccion,''))) not between 5 and 500 then
      raise exception using errcode='P0001', message='Para aprobar, completa un RUC de 11 dÃ­gitos y una direcciÃ³n vÃ¡lida.';
    end if;
    select p.id into v_usuario from public.perfiles p join auth.users u on u.id=p.id
      where lower(u.email)=lower(trim(s.correo)) and u.email_confirmed_at is not null
      and p.activo and p.rol='cliente_comun' and p.empresa_id is null for update of p;
    if v_usuario is null then raise exception using errcode='P0001', message='El solicitante debe tener una cuenta de cliente activa y confirmada con el mismo correo de la solicitud.'; end if;
    if exists(select 1 from public.empresas_distribuidoras where ruc=p_ruc) then
      raise exception using errcode='P0001', message='Ese RUC ya estÃ¡ afiliado. Revisa la empresa existente.';
    end if;
    insert into public.empresas_distribuidoras(ruc,razon_social,nombre_comercial,ciudad,direccion,telefono_contacto,correo_contacto,volumen_estimado_mensual)
    values(p_ruc,s.nombre_empresa,s.nombre_empresa,s.ciudad,trim(p_direccion),s.telefono,s.correo,s.volumen_mensual_balones)
    returning id into v_empresa;
    update public.perfiles set empresa_id=v_empresa,rol='empresa_admin' where id=v_usuario;
  end if;
  update public.solicitudes_afiliacion set estado=p_estado,notas_internas=coalesce(p_notas,''),
    empresa_id=v_empresa,revisado_por=auth.uid(),revisado_at=now(),updated_at=now() where id=p_solicitud;
  return v_empresa;
end;
$$;
revoke all on function public.revisar_afiliacion(uuid,public.estado_afiliacion,text,text,text) from public;
grant execute on function public.revisar_afiliacion(uuid,public.estado_afiliacion,text,text,text) to authenticated;

-- === 202610300003_operacion_empresa.sql ===

alter table public.pedidos add column if not exists stock_reservado boolean not null default false;
create table if not exists public.inventario_empresa (
  empresa_id uuid not null references public.empresas_distribuidoras(id),
  capacidad public.capacidad_cilindro not null,
  precio_pen numeric(8,2) not null check(precio_pen > 0),
  stock integer not null default 0 check(stock >= 0),
  activo boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(empresa_id,capacidad)
);
alter table public.inventario_empresa enable row level security;
drop policy if exists "inventario_de_empresa" on public.inventario_empresa;
create policy "inventario_de_empresa" on public.inventario_empresa for select to authenticated using (
  exists(select 1 from public.perfiles p where p.id=auth.uid() and p.activo
    and (p.rol='super_admin' or (p.rol='empresa_admin' and p.empresa_id=inventario_empresa.empresa_id)))
);
grant select on public.inventario_empresa to authenticated;

create or replace function public.ofertas_distribuidoras()
returns table(empresa_id uuid,empresa_nombre text,ciudad text,capacidad public.capacidad_cilindro,precio_pen numeric,stock integer)
language sql stable security definer set search_path='' as $$
  select i.empresa_id,coalesce(e.nombre_comercial,e.razon_social)::text,e.ciudad::text,i.capacidad,i.precio_pen,i.stock
  from public.inventario_empresa i join public.empresas_distribuidoras e on e.id=i.empresa_id
  where e.estado='activo' and i.activo order by e.razon_social,i.capacidad;
$$;
revoke all on function public.ofertas_distribuidoras() from public;
grant execute on function public.ofertas_distribuidoras() to anon,authenticated;

create or replace function public.guardar_inventario(p_empresa uuid,p_capacidad public.capacidad_cilindro,p_precio numeric,p_stock integer,p_activo boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.perfiles where id=auth.uid() and activo
    and (rol='super_admin' or (rol='empresa_admin' and empresa_id=p_empresa))) then
    raise exception using errcode='42501',message='Sin permiso para editar esta empresa.';
  end if;
  if p_precio is null or p_precio::text in ('NaN','Infinity','-Infinity') or p_precio<=0 or p_precio>999999.99 or p_stock is null or p_stock<0 or p_activo is null then
    raise exception using errcode='P0001',message='Revisa el precio y el stock.';
  end if;
  perform 1 from public.empresas_distribuidoras where id=p_empresa and estado='activo';
  if not found then raise exception using errcode='P0001',message='La empresa no estÃ¡ activa.'; end if;
  insert into public.inventario_empresa(empresa_id,capacidad,precio_pen,stock,activo)
    values(p_empresa,p_capacidad,p_precio,p_stock,p_activo)
    on conflict(empresa_id,capacidad) do update set precio_pen=excluded.precio_pen,stock=excluded.stock,activo=excluded.activo,updated_at=now();
end;
$$;
revoke all on function public.guardar_inventario(uuid,public.capacidad_cilindro,numeric,integer,boolean) from public;
grant execute on function public.guardar_inventario(uuid,public.capacidad_cilindro,numeric,integer,boolean) to authenticated;

-- Reemplaza el flujo antiguo que dejaba los pedidos sin distribuidora.
drop function if exists public.crear_pedido_web(text,text,text,text,public.capacidad_cilindro);
create or replace function public.crear_pedido_empresa(p_nombre text,p_telefono text,p_direccion text,p_referencia text,p_capacidad public.capacidad_cilindro,p_empresa uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_precio numeric; v_id uuid; v_cliente uuid; v_ticket text := 'TK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,24));
begin
  if p_nombre is null or length(trim(p_nombre)) not between 2 and 120 or p_telefono is null
    or length(p_telefono)>20 or p_telefono !~ '^\+?[0-9 ()-]{7,20}$' or p_direccion is null
    or length(trim(p_direccion)) not between 5 and 500 or length(coalesce(p_referencia,''))>500 then
    raise exception using errcode='P0001',message='Revisa el nombre, telÃ©fono y direcciÃ³n de entrega.';
  end if;
  perform 1 from public.empresas_distribuidoras where id=p_empresa and estado='activo' for share;
  if not found then raise exception using errcode='P0001',message='Selecciona una distribuidora activa.'; end if;
  -- La actualizaciÃ³n bloquea el inventario: dos pedidos no pueden vender la Ãºltima unidad.
  update public.inventario_empresa set stock=stock-1,updated_at=now()
    where empresa_id=p_empresa and capacidad=p_capacidad and activo and stock>0 returning precio_pen into v_precio;
  if v_precio is null then raise exception using errcode='P0001',message='El producto se agotÃ³. Actualiza las opciones.'; end if;
  select id into v_cliente from public.perfiles where id=auth.uid() and activo;
  if auth.uid() is not null and v_cliente is null then raise exception using errcode='42501',message='Tu cuenta no estÃ¡ activa.'; end if;
  insert into public.pedidos(codigo_ticket,cliente_id,empresa_id,nombre_destinatario,telefono_contacto,direccion_entrega,referencia_direccion,total_pedido_pen,stock_reservado)
    values(v_ticket,v_cliente,p_empresa,trim(p_nombre),trim(p_telefono),trim(p_direccion),p_referencia,v_precio,true) returning id into v_id;
  insert into public.pedido_items(pedido_id,capacidad,cantidad,precio_unitario_pen,subtotal_pen) values(v_id,p_capacidad,1,v_precio,v_precio);
  return v_ticket;
end;
$$;
revoke all on function public.crear_pedido_empresa(text,text,text,text,public.capacidad_cilindro,uuid) from public;
grant execute on function public.crear_pedido_empresa(text,text,text,text,public.capacidad_cilindro,uuid) to anon,authenticated;

create or replace function public.cambiar_estado_pedido(p_pedido uuid,p_estado public.estado_pedido)
returns void language plpgsql security definer set search_path='' as $$
declare o public.pedidos; item record;
begin
  select * into o from public.pedidos where id=p_pedido for update;
  if not found or not exists(select 1 from public.perfiles p where p.id=auth.uid() and p.activo
    and (p.rol='super_admin' or (p.rol='empresa_admin' and p.empresa_id=o.empresa_id))) then
    raise exception using errcode='42501',message='Sin permiso para gestionar este pedido.';
  end if;
  if p_estado=o.estado then return; end if;
  if p_estado is null or o.estado in ('cancelado','entregado') or not (
    p_estado='cancelado' or (o.estado='pendiente' and p_estado='en_camino')
    or (o.estado='asignado_chofer' and p_estado='en_camino')
    or (o.estado='en_camino' and p_estado='en_puerta_pesaje')
    or (o.estado='en_puerta_pesaje' and p_estado='entregado')) then
    raise exception using errcode='P0001',message='Ese cambio de estado no estÃ¡ permitido.';
  end if;
  -- Solo los pedidos nuevos (con inventario reservado) se gestionan en este flujo.
  if not o.stock_reservado then
    raise exception using errcode='P0001',message='Pedido anterior al control de inventario: requiere revisiÃ³n manual.';
  end if;
  if p_estado='cancelado' then
    for item in select capacidad,sum(cantidad) cantidad from public.pedido_items where pedido_id=o.id group by capacidad loop
      update public.inventario_empresa set stock=stock+item.cantidad,updated_at=now() where empresa_id=o.empresa_id and capacidad=item.capacidad;
    end loop;
  end if;
  update public.pedidos set estado=p_estado,fecha_hora_entrega=case when p_estado='entregado' then now() else fecha_hora_entrega end where id=o.id;
end;
$$;
revoke all on function public.cambiar_estado_pedido(uuid,public.estado_pedido) from public;
grant execute on function public.cambiar_estado_pedido(uuid,public.estado_pedido) to authenticated;
-- Solo el superadministrador necesita listar empresas para elegir cuÃ¡l gestionar.
drop policy if exists "administrador_lista_empresas" on public.empresas_distribuidoras;
create policy "administrador_lista_empresas" on public.empresas_distribuidoras for select to authenticated
using(exists(select 1 from public.perfiles where id=auth.uid() and activo and (rol='super_admin' or empresa_id=empresas_distribuidoras.id)));
grant select on public.empresas_distribuidoras to authenticated;

-- === 202610300004_membresias_personal.sql ===

create table if not exists public.planes_suscripcion (
 id uuid primary key default gen_random_uuid(), nombre text not null check(length(nombre) between 2 and 80),
 precio_pen numeric(10,2) not null check(precio_pen>0), dias integer not null default 30 check(dias between 1 and 366), activo boolean not null default true
);
create table if not exists public.suscripciones_empresas (
 empresa_id uuid primary key references public.empresas_distribuidoras(id), plan_id uuid references public.planes_suscripcion(id),
 estado text not null default 'pendiente' check(estado in ('pendiente','activa','suspendida')), vigente_hasta timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.pagos_membresia (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas_distribuidoras(id),
 plan_id uuid not null references public.planes_suscripcion(id), importe_pen numeric(10,2) not null check(importe_pen>0),
 referencia text not null check(length(trim(referencia)) between 3 and 150), estado text not null default 'pendiente' check(estado in ('pendiente','verificado','rechazado')),
 dias integer not null check(dias between 1 and 366), revisado_por uuid references public.perfiles(id), created_at timestamptz not null default now(),
 unique(empresa_id,referencia)
);
create table if not exists public.invitaciones_personal (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas_distribuidoras(id),
 correo text not null, cargo text not null check(cargo in ('motorizado','operador_flota')),
 estado text not null default 'pendiente' check(estado in ('pendiente','aceptada','revocada')),
 usuario_id uuid references public.perfiles(id), creado_por uuid not null references public.perfiles(id), created_at timestamptz not null default now(),
 unique(empresa_id,correo)
);
create table if not exists public.notificaciones (
 id uuid primary key default gen_random_uuid(), usuario_id uuid not null references public.perfiles(id), titulo text not null,
 leida boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.auditoria_operaciones (
 id bigint generated always as identity primary key, empresa_id uuid references public.empresas_distribuidoras(id),
 usuario_id uuid references public.perfiles(id), operacion text not null, entidad_id uuid, detalle jsonb not null default '{}', created_at timestamptz not null default now()
);

create or replace function public.es_superadmin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfiles where id=auth.uid() and activo and rol='super_admin');
$$;
create or replace function public.puede_gestionar(p_empresa uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.es_superadmin() or exists(select 1 from public.perfiles where id=auth.uid() and activo and rol='empresa_admin' and empresa_id=p_empresa);
$$;
create or replace function public.membresia_activa(p_empresa uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.suscripciones_empresas s join public.empresas_distribuidoras e on e.id=s.empresa_id
 where s.empresa_id=p_empresa and s.estado='activa' and s.vigente_hasta>now() and e.estado='activo');
$$;
create or replace function public.exigir_operacion(p_empresa uuid) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='No tienes permiso para gestionar esta empresa.'; end if;
 if not public.es_superadmin() and not public.membresia_activa(p_empresa) then raise exception using errcode='P0001',message='La membresÃ­a no estÃ¡ vigente. Revisa MembresÃ­a.'; end if;
end; $$;

alter table public.planes_suscripcion enable row level security;
alter table public.suscripciones_empresas enable row level security;
alter table public.pagos_membresia enable row level security;
alter table public.invitaciones_personal enable row level security;
alter table public.notificaciones enable row level security;
alter table public.auditoria_operaciones enable row level security;
drop policy if exists planes_lectura on public.planes_suscripcion;
create policy planes_lectura on public.planes_suscripcion for select to authenticated using(activo or public.es_superadmin());
drop policy if exists suscripciones_lectura on public.suscripciones_empresas;
create policy suscripciones_lectura on public.suscripciones_empresas for select to authenticated using(public.puede_gestionar(empresa_id));
drop policy if exists pagos_membresia_lectura on public.pagos_membresia;
create policy pagos_membresia_lectura on public.pagos_membresia for select to authenticated using(public.puede_gestionar(empresa_id));
drop policy if exists invitaciones_lectura on public.invitaciones_personal;
create policy invitaciones_lectura on public.invitaciones_personal for select to authenticated using(public.puede_gestionar(empresa_id) or exists(select 1 from auth.users u where u.id=auth.uid() and lower(u.email)=correo));
-- La comparaciÃ³n de correo se hace en una funciÃ³n para no otorgar SELECT sobre auth.users.
create or replace function public.mi_correo() returns text language sql stable security definer set search_path='' as $$ select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null; $$;
drop policy invitaciones_lectura on public.invitaciones_personal;
create policy invitaciones_lectura on public.invitaciones_personal for select to authenticated using(public.puede_gestionar(empresa_id) or correo=public.mi_correo());
drop policy if exists notificaciones_propias on public.notificaciones;
create policy notificaciones_propias on public.notificaciones for select to authenticated using(usuario_id=auth.uid());
drop policy if exists auditoria_lectura on public.auditoria_operaciones;
create policy auditoria_lectura on public.auditoria_operaciones for select to authenticated using(public.puede_gestionar(empresa_id));
grant select on public.planes_suscripcion,public.suscripciones_empresas,public.pagos_membresia,public.invitaciones_personal,public.notificaciones,public.auditoria_operaciones to authenticated;
revoke insert,update,delete on public.planes_suscripcion,public.suscripciones_empresas,public.pagos_membresia,public.invitaciones_personal,public.notificaciones,public.auditoria_operaciones from anon,authenticated;

create or replace function public.gestion_membresia(p_accion text,p_datos jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_empresa uuid; plan public.planes_suscripcion; pago public.pagos_membresia;
begin
 if p_accion='plan' then
  if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS administra planes.'; end if;
  insert into public.planes_suscripcion(nombre,precio_pen,dias) values(trim(p_datos->>'nombre'),(p_datos->>'precio')::numeric,(p_datos->>'dias')::integer) returning id into v_id;
 elsif p_accion='pago' then
  v_empresa:=(p_datos->>'empresa_id')::uuid;
  if not public.puede_gestionar(v_empresa) then raise exception using errcode='42501',message='Empresa no autorizada.'; end if;
  select * into plan from public.planes_suscripcion where id=(p_datos->>'plan_id')::uuid and activo;
  if not found then raise exception using errcode='P0001',message='El plan no estÃ¡ disponible.'; end if;
  insert into public.pagos_membresia(empresa_id,plan_id,importe_pen,referencia,dias) values(v_empresa,plan.id,plan.precio_pen,trim(p_datos->>'referencia'),plan.dias) returning id into v_id;
 elsif p_accion in ('verificar','rechazar') then
  if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS verifica pagos.'; end if;
  select * into pago from public.pagos_membresia where id=(p_datos->>'pago_id')::uuid for update;
  if not found or pago.estado<>'pendiente' then raise exception using errcode='P0001',message='El pago ya fue revisado o no existe.'; end if;
  v_empresa:=pago.empresa_id; v_id:=pago.id;
  -- Serializa renovaciones de la misma empresa, aunque sean pagos diferentes.
  perform 1 from public.empresas_distribuidoras where id=v_empresa for update;
  update public.pagos_membresia set estado=case when p_accion='verificar' then 'verificado' else 'rechazado' end,revisado_por=auth.uid() where id=pago.id;
  if p_accion='verificar' then
   insert into public.suscripciones_empresas(empresa_id,plan_id,estado,vigente_hasta) values(v_empresa,pago.plan_id,'activa',now()+make_interval(days=>pago.dias))
   on conflict(empresa_id) do update set plan_id=excluded.plan_id,estado='activa',vigente_hasta=greatest(now(),public.suscripciones_empresas.vigente_hasta)+make_interval(days=>pago.dias),updated_at=now();
  end if;
 elsif p_accion in ('suspender','reanudar') then
  if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS gestiona suscripciones.'; end if;
  v_empresa:=(p_datos->>'empresa_id')::uuid; v_id:=v_empresa;
  update public.suscripciones_empresas set estado=case when p_accion='suspender' then 'suspendida' else 'activa' end,updated_at=now() where empresa_id=v_empresa;
  if not found then raise exception using errcode='P0001',message='Esta empresa aÃºn no tiene suscripciÃ³n.'; end if;
 else raise exception using errcode='P0001',message='AcciÃ³n no vÃ¡lida.';
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(v_empresa,auth.uid(),'membresia_'||p_accion,v_id);
 return v_id;
end; $$;

create or replace function public.gestion_personal(p_accion text,p_empresa uuid,p_correo text default '',p_cargo text default '',p_usuario uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid; invitacion public.invitaciones_personal; v_perfil public.perfiles;
begin
 if p_accion='aceptar' then
  select * into invitacion from public.invitaciones_personal where empresa_id=p_empresa and correo=public.mi_correo() and estado='pendiente' for update;
  if not found or not public.membresia_activa(p_empresa) then raise exception using errcode='P0001',message='No hay una invitaciÃ³n activa para tu correo o la empresa no tiene membresÃ­a.'; end if;
  select * into v_perfil from public.perfiles where id=auth.uid() for update;
  if not found or not v_perfil.activo or v_perfil.rol<>'cliente_comun' or v_perfil.empresa_id is not null then raise exception using errcode='P0001',message='Tu cuenta ya tiene un rol empresarial o estÃ¡ desactivada.'; end if;
  update public.perfiles set empresa_id=p_empresa,rol=case when invitacion.cargo='motorizado' then 'chofer_repartidor'::public.rol_usuario else 'planta_operador'::public.rol_usuario end where id=auth.uid();
  update public.invitaciones_personal set estado='aceptada',usuario_id=auth.uid() where id=invitacion.id;
 else
  perform public.exigir_operacion(p_empresa);
  if p_accion='invitar' then
   if p_cargo not in ('motorizado','operador_flota') or p_cargo is null or p_correo !~ '^[^ @]+@[^ @]+\.[^ @]+$' or length(p_correo)>120 then raise exception using errcode='P0001',message='Revisa el correo y el cargo.'; end if;
   insert into public.invitaciones_personal(empresa_id,correo,cargo,creado_por) values(p_empresa,lower(trim(p_correo)),p_cargo,auth.uid());
  elsif p_accion='revocar' then
   update public.invitaciones_personal set estado='revocada' where empresa_id=p_empresa and correo=lower(trim(p_correo)) and estado='pendiente';
  elsif p_accion in ('desactivar','activar') then
   update public.perfiles set activo=(p_accion='activar') where id=p_usuario and empresa_id=p_empresa and rol in ('chofer_repartidor','planta_operador');
   if not found then raise exception using errcode='P0001',message='Trabajador no encontrado en esta empresa.'; end if;
  else raise exception using errcode='P0001',message='AcciÃ³n no vÃ¡lida.';
  end if;
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),'personal_'||p_accion,p_usuario);
end; $$;

create or replace function public.listar_personal(p_empresa uuid) returns table(id uuid,nombres text,correo text,rol text,activo boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Empresa no autorizada.'; end if;
 return query select p.id,(p.nombres||' '||p.apellidos)::text,p.correo::text,p.rol::text,p.activo from public.perfiles p where p.empresa_id=p_empresa and p.rol in ('chofer_repartidor','planta_operador') order by p.nombres;
end; $$;

-- La suspensiÃ³n conserva historial y lectura, pero bloquea nueva operaciÃ³n comercial.
create or replace function public.validar_membresia_operacion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='pedidos' and tg_op='INSERT' then
  if not public.membresia_activa(new.empresa_id) then raise exception using errcode='P0001',message='Esta distribuidora no tiene una membresÃ­a vigente.'; end if;
 elsif not public.es_superadmin() and not public.membresia_activa(new.empresa_id) then
  raise exception using errcode='P0001',message='La membresÃ­a no estÃ¡ vigente. No se puede modificar la operaciÃ³n.';
 end if;
 return new;
end; $$;
drop trigger if exists validar_membresia_pedido on public.pedidos;
create trigger validar_membresia_pedido before insert or update on public.pedidos for each row execute function public.validar_membresia_operacion();
drop trigger if exists validar_membresia_inventario on public.inventario_empresa;
create trigger validar_membresia_inventario before insert or update on public.inventario_empresa for each row execute function public.validar_membresia_operacion();

create or replace function public.ofertas_distribuidoras()
returns table(empresa_id uuid,empresa_nombre text,ciudad text,capacidad public.capacidad_cilindro,precio_pen numeric,stock integer)
language sql stable security definer set search_path='' as $$
 select i.empresa_id,coalesce(e.nombre_comercial,e.razon_social)::text,e.ciudad::text,i.capacidad,i.precio_pen,i.stock
 from public.inventario_empresa i join public.empresas_distribuidoras e on e.id=i.empresa_id
 where e.estado='activo' and i.activo and public.membresia_activa(e.id) order by e.razon_social,i.capacidad;
$$;

revoke all on function public.gestion_membresia(text,jsonb),public.gestion_personal(text,uuid,text,text,uuid),public.listar_personal(uuid) from public;
grant execute on function public.gestion_membresia(text,jsonb),public.gestion_personal(text,uuid,text,text,uuid),public.listar_personal(uuid) to authenticated;
revoke all on function public.es_superadmin(),public.puede_gestionar(uuid),public.mi_correo(),public.exigir_operacion(uuid) from public;
grant execute on function public.es_superadmin(),public.puede_gestionar(uuid),public.mi_correo() to authenticated;
-- membresia_activa expone solo un booleano, usado por el catÃ¡logo pÃºblico.
revoke all on function public.membresia_activa(uuid) from public;
grant execute on function public.membresia_activa(uuid) to anon,authenticated;

-- === 202610300005_logistica.sql ===

create table if not exists public.vehiculos_reparto (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 placa text not null unique check(length(trim(placa)) between 5 and 10),descripcion text not null,activo boolean not null default true
);
create table if not exists public.viajes_flota (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 camion_id uuid not null references public.camiones_flota(id),operador_id uuid not null references public.perfiles(id),
 origen text not null,destino text not null,cantidad_esperada integer not null default 0 check(cantidad_esperada>=0),estado text not null default 'preparacion' check(estado in ('preparacion','en_transito','recibido')),
 salida_at timestamptz,llegada_at timestamptz,created_at timestamptz not null default now()
);
alter table public.viajes_flota add column if not exists cantidad_esperada integer not null default 0 check(cantidad_esperada>=0);
create table if not exists public.detalle_cargas_balones (
 viaje_id uuid not null references public.viajes_flota(id),cilindro_id uuid not null references public.cilindros(id),
 lleno boolean not null,recibido_at timestamptz,primary key(viaje_id,cilindro_id)
);
alter table public.pedidos add column if not exists vehiculo_reparto_id uuid references public.vehiculos_reparto(id);
create table if not exists public.entregas_domiciliarias (
 pedido_id uuid primary key references public.pedidos(id),cilindro_id uuid not null references public.cilindros(id),
 vacio_id uuid references public.cilindros(id),responsable_id uuid not null references public.perfiles(id),created_at timestamptz not null default now()
);
create table if not exists public.ubicaciones_repartidores (
 pedido_id uuid primary key references public.pedidos(id),usuario_id uuid not null references public.perfiles(id),
 latitud numeric not null check(latitud between -90 and 90),longitud numeric not null check(longitud between -180 and 180),updated_at timestamptz not null default now()
);
create table if not exists public.incidencias (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),
 responsable_id uuid not null references public.perfiles(id),descripcion text not null check(length(trim(descripcion)) between 5 and 2000),
 estado text not null default 'abierta' check(estado in ('abierta','resuelta')),created_at timestamptz not null default now()
);
create table if not exists public.movimientos_inventario (
 id bigint generated always as identity primary key,empresa_id uuid not null references public.empresas_distribuidoras(id),
 capacidad public.capacidad_cilindro not null,diferencia integer not null,saldo integer not null,usuario_id uuid references public.perfiles(id),created_at timestamptz not null default now()
);

create or replace function public.pertenece_empresa(p_empresa uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.puede_gestionar(p_empresa) or exists(select 1 from public.perfiles where id=auth.uid() and activo and empresa_id=p_empresa and rol in ('chofer_repartidor','planta_operador'));
$$;
create or replace function public.registrar_movimiento_stock() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.movimientos_inventario(empresa_id,capacidad,diferencia,saldo,usuario_id) values(new.empresa_id,new.capacidad,new.stock,new.stock,auth.uid());
 elsif new.stock<>old.stock then
  insert into public.movimientos_inventario(empresa_id,capacidad,diferencia,saldo,usuario_id) values(new.empresa_id,new.capacidad,new.stock-old.stock,new.stock,auth.uid());
 end if;
 return new;
end; $$;
drop trigger if exists movimiento_stock on public.inventario_empresa;
create trigger movimiento_stock after insert or update on public.inventario_empresa for each row execute function public.registrar_movimiento_stock();

-- Accesos de lectura empresariales, escrituras solo mediante funciones autorizadas.
alter table public.vehiculos_reparto enable row level security;
alter table public.viajes_flota enable row level security;
alter table public.detalle_cargas_balones enable row level security;
alter table public.entregas_domiciliarias enable row level security;
alter table public.ubicaciones_repartidores enable row level security;
alter table public.incidencias enable row level security;
alter table public.movimientos_inventario enable row level security;
drop policy if exists vehiculos_empresa on public.vehiculos_reparto;
create policy vehiculos_empresa on public.vehiculos_reparto for select to authenticated using(public.puede_gestionar(empresa_id) or exists(select 1 from public.pedidos p where p.vehiculo_reparto_id=vehiculos_reparto.id and p.chofer_id=auth.uid() and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and public.pertenece_empresa(p.empresa_id)));
drop policy if exists camiones_empresa on public.camiones_flota;
create policy camiones_empresa on public.camiones_flota for select to authenticated using(public.puede_gestionar(empresa_id) or exists(select 1 from public.viajes_flota v where v.camion_id=camiones_flota.id and v.operador_id=auth.uid() and v.estado in ('preparacion','en_transito') and public.pertenece_empresa(v.empresa_id)));
drop policy if exists viajes_autorizados on public.viajes_flota;
create policy viajes_autorizados on public.viajes_flota for select to authenticated using(public.puede_gestionar(empresa_id) or (operador_id=auth.uid() and public.pertenece_empresa(empresa_id)));
drop policy if exists carga_autorizada on public.detalle_cargas_balones;
create policy carga_autorizada on public.detalle_cargas_balones for select to authenticated using(exists(select 1 from public.viajes_flota where id=viaje_id));
drop policy if exists incidencias_empresa on public.incidencias;
create policy incidencias_empresa on public.incidencias for select to authenticated using(public.puede_gestionar(empresa_id) or (responsable_id=auth.uid() and public.pertenece_empresa(empresa_id)));
drop policy if exists movimientos_empresa on public.movimientos_inventario;
create policy movimientos_empresa on public.movimientos_inventario for select to authenticated using(public.puede_gestionar(empresa_id));
drop policy if exists entrega_autorizada on public.entregas_domiciliarias;
create policy entrega_autorizada on public.entregas_domiciliarias for select to authenticated using(exists(select 1 from public.pedidos where id=pedido_id));
drop policy if exists ubicacion_activa on public.ubicaciones_repartidores;
create policy ubicacion_activa on public.ubicaciones_repartidores for select to authenticated using(exists(select 1 from public.pedidos p where p.id=pedido_id
 and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and (p.cliente_id=auth.uid() or p.chofer_id=auth.uid() or public.puede_gestionar(p.empresa_id))));
drop policy if exists "Los clientes ven sus propios pedidos" on public.pedidos;
create policy "Los clientes ven sus propios pedidos" on public.pedidos for select to authenticated using(
 exists(select 1 from public.perfiles p where p.id=auth.uid() and p.activo and
 (pedidos.cliente_id=p.id or public.puede_gestionar(pedidos.empresa_id) or (pedidos.chofer_id=p.id and p.empresa_id=pedidos.empresa_id and p.rol='chofer_repartidor'))));
drop policy if exists "Lectura pÃºblica de pasaporte QR de cilindros" on public.cilindros;
drop policy if exists cilindros_empresa on public.cilindros;
create policy cilindros_empresa on public.cilindros for select to authenticated using(public.puede_gestionar(empresa_duena_id) or exists(
 select 1 from public.detalle_cargas_balones d join public.viajes_flota v on v.id=d.viaje_id where d.cilindro_id=cilindros.id and v.operador_id=auth.uid() and public.pertenece_empresa(v.empresa_id)) or exists(
 select 1 from public.pedido_items i join public.pedidos p on p.id=i.pedido_id where i.cilindro_asignado_id=cilindros.id and p.chofer_id=auth.uid() and p.estado in ('asignado_chofer','en_camino','en_puerta_pesaje') and public.pertenece_empresa(p.empresa_id)));
drop policy if exists "Lectura pÃºblica del historial de eventos de trazabilidad" on public.cilindros_trazabilidad;
drop policy if exists trazabilidad_empresa on public.cilindros_trazabilidad;
create policy trazabilidad_empresa on public.cilindros_trazabilidad for select to authenticated using(exists(select 1 from public.cilindros c where c.id=cilindro_id));
grant select on public.vehiculos_reparto,public.camiones_flota,public.viajes_flota,public.detalle_cargas_balones,public.entregas_domiciliarias,public.ubicaciones_repartidores,public.incidencias,public.movimientos_inventario,public.cilindros,public.cilindros_trazabilidad to authenticated;
revoke insert,update,delete on public.vehiculos_reparto,public.camiones_flota,public.viajes_flota,public.detalle_cargas_balones,public.entregas_domiciliarias,public.ubicaciones_repartidores,public.incidencias,public.movimientos_inventario,public.cilindros,public.cilindros_trazabilidad from anon,authenticated;

create or replace function public.gestion_logistica(p_accion text,p_empresa uuid,p_datos jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; o public.pedidos; c public.cilindros; vac public.cilindros; v public.viajes_flota; code text; codigo text; item record; perfil public.perfiles;
begin
 select * into perfil from public.perfiles where id=auth.uid() and activo;
 if not found or not public.pertenece_empresa(p_empresa) or not public.membresia_activa(p_empresa) then
  raise exception using errcode='42501',message='Empresa no autorizada o membresÃ­a vencida.';
 end if;
 if p_accion in ('moto','camion','cilindro','viaje','asignar','resolver') then perform public.exigir_operacion(p_empresa); end if;
 if p_accion in ('moto','camion') and length(trim(coalesce(p_datos->>'placa',''))) not between 5 and 10 then raise exception using errcode='P0001',message='La placa debe tener entre 5 y 10 caracteres.'; end if;
 if p_accion='camion' and ((p_datos->>'capacidad') is null or (p_datos->>'capacidad')::integer not between 1 and 10000) then raise exception using errcode='P0001',message='La capacidad del camiÃ³n debe estar entre 1 y 10000 balones.'; end if;
 if p_accion='moto' then
  insert into public.vehiculos_reparto(empresa_id,placa,descripcion) values(p_empresa,upper(trim(p_datos->>'placa')),trim(p_datos->>'descripcion')) returning id into v_id;
 elsif p_accion='camion' then
  insert into public.camiones_flota(empresa_id,placa,numero_unidad,capacidad_balones) values(p_empresa,upper(trim(p_datos->>'placa')),trim(p_datos->>'unidad'),(p_datos->>'capacidad')::integer) returning id into v_id;
 elsif p_accion='cilindro' then
  codigo:=trim(p_datos->>'codigo');
  if codigo is null or codigo !~ '^[A-Za-z0-9_-]{3,60}$' or p_datos->>'tara' is null or (p_datos->>'tara')::numeric::text in ('NaN','Infinity','-Infinity') or (p_datos->>'tara')::numeric<=0 or length(trim(coalesce(p_datos->>'serie',''))) not between 1 and 60 then raise exception using errcode='P0001',message='CÃ³digo o tara invÃ¡lidos.'; end if;
  insert into public.cilindros(codigo_qr,uuid_inmutable,numero_serie_fabricacion,capacidad,empresa_duena_id,tara_calibrada_kg,estado,aprobado_calidad)
   values(codigo,gen_random_uuid()::text,trim(p_datos->>'serie'),(p_datos->>'capacidad')::public.capacidad_cilindro,p_empresa,(p_datos->>'tara')::numeric,'en_mantenimiento',false) returning id into v_id;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,es_conforme) values(v_id,'Registro inicial','Cilindro registrado; pendiente de inspecciÃ³n.',perfil.nombres,false);
 elsif p_accion='inspeccionar' then
  perform public.exigir_operacion(p_empresa);
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or c.estado not in ('en_mantenimiento','en_planta','recuperado_vacio') then raise exception using errcode='P0001',message='Cilindro no disponible para inspecciÃ³n.'; end if;
  if (p_datos->>'aprobado')::boolean then
   update public.cilindros set aprobado_calidad=true,estado='en_planta',motivo_bloqueo=null where id=c.id;
  else update public.cilindros set aprobado_calidad=false,estado='en_mantenimiento',motivo_bloqueo=p_datos->>'detalle' where id=c.id; end if;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,es_conforme) values(c.id,'InspecciÃ³n',p_datos->>'detalle',perfil.nombres,(p_datos->>'aprobado')::boolean); v_id:=c.id;
 elsif p_accion='llenar' then
  perform public.exigir_operacion(p_empresa);
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or c.estado<>'en_planta' or not c.aprobado_calidad then raise exception using errcode='P0001',message='El cilindro requiere inspecciÃ³n aprobada antes de llenar.'; end if;
  if p_datos->>'peso' is null or (p_datos->>'peso')::numeric::text in ('NaN','Infinity','-Infinity') or abs((p_datos->>'peso')::numeric-c.tara_calibrada_kg-replace(c.capacidad::text,'kg','')::numeric)>0.05 then raise exception using errcode='P0001',message='El peso neto debe corresponder a la capacidad, con tolerancia de 0.05 kg.'; end if;
  update public.cilindros set estado='en_almacen',peso_bruto_actual_kg=(p_datos->>'peso')::numeric,fecha_ultimo_envasado=now() where id=c.id;
  update public.inventario_empresa set stock=stock+1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad;
  if not found then raise exception using errcode='P0001',message='Configura primero el precio de esta capacidad en inventario.'; end if;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,peso_registrado_kg) values(c.id,'Llenado','Llenado y pesaje registrados.',perfil.nombres,(p_datos->>'peso')::numeric); v_id:=c.id;
 elsif p_accion='viaje' then
  if not exists(select 1 from public.camiones_flota where id=(p_datos->>'camion_id')::uuid and empresa_id=p_empresa and activo) or
   not exists(select 1 from public.perfiles where id=(p_datos->>'operador_id')::uuid and empresa_id=p_empresa and activo and rol='planta_operador') then raise exception using errcode='P0001',message='CamiÃ³n u operador no autorizado.'; end if;
  if length(trim(coalesce(p_datos->>'origen','')))<3 or length(trim(coalesce(p_datos->>'destino','')))<3 then raise exception using errcode='P0001',message='Completa origen y destino.'; end if;
  if p_datos->>'esperados' is null or (p_datos->>'esperados')::integer<1 or (p_datos->>'esperados')::integer>(select capacidad_balones from public.camiones_flota where id=(p_datos->>'camion_id')::uuid) then raise exception using errcode='P0001',message='La cantidad esperada debe ser positiva y respetar la capacidad del camiÃ³n.'; end if;
  insert into public.viajes_flota(empresa_id,camion_id,operador_id,origen,destino,cantidad_esperada) values(p_empresa,(p_datos->>'camion_id')::uuid,(p_datos->>'operador_id')::uuid,p_datos->>'origen',p_datos->>'destino',(p_datos->>'esperados')::integer) returning id into v_id;
 elsif p_accion in ('cargar','recibir') then
  select * into v from public.viajes_flota where id=(p_datos->>'viaje_id')::uuid and empresa_id=p_empresa for update;
  if not found or not (public.puede_gestionar(p_empresa) or v.operador_id=auth.uid()) then raise exception using errcode='42501',message='Viaje no autorizado.'; end if;
  if jsonb_typeof(p_datos->'codigos')<>'array' or jsonb_array_length(p_datos->'codigos') not between 1 and 500 then raise exception using errcode='P0001',message='Registra entre 1 y 500 cÃ³digos.'; end if;
  if (select count(*)<>count(distinct value) from jsonb_array_elements_text(p_datos->'codigos')) then raise exception using errcode='P0001',message='La lista contiene cÃ³digos repetidos.'; end if;
  if (p_accion='cargar' and v.estado<>'preparacion') or (p_accion='recibir' and v.estado<>'en_transito') then raise exception using errcode='P0001',message='El estado del viaje no permite esta operaciÃ³n.'; end if;
  if p_accion='cargar' and jsonb_array_length(p_datos->'codigos')>(select capacidad_balones from public.camiones_flota where id=v.camion_id) then raise exception using errcode='P0001',message='La carga supera la capacidad del camiÃ³n.'; end if;
  if p_accion='cargar' and v.cantidad_esperada<>jsonb_array_length(p_datos->'codigos') then
   if length(trim(coalesce(p_datos->>'diferencia','')))<5 then raise exception using errcode='P0001',message='La cantidad escaneada difiere de la esperada. Registra la justificaciÃ³n.'; end if;
   insert into public.incidencias(empresa_id,responsable_id,descripcion) values(p_empresa,auth.uid(),'Diferencia de carga: esperados '||v.cantidad_esperada||', registrados '||jsonb_array_length(p_datos->'codigos')||'. '||(p_datos->>'diferencia'));
  end if;
  for code in select value from jsonb_array_elements_text(p_datos->'codigos') order by value loop
   select * into c from public.cilindros where codigo_qr=code and empresa_duena_id=p_empresa for update;
   if not found then raise exception using errcode='P0001',message='CÃ³digo no pertenece a la empresa: '||code; end if;
   if p_accion='cargar' then
    if c.estado not in ('en_almacen','recuperado_vacio') or (c.estado='en_almacen' and not c.aprobado_calidad) then raise exception using errcode='P0001',message='Cilindro no disponible: '||code; end if;
    insert into public.detalle_cargas_balones(viaje_id,cilindro_id,lleno) values(v.id,c.id,c.estado='en_almacen');
    if c.estado='en_almacen' then
     update public.inventario_empresa set stock=stock-1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad and stock>0;
     if not found then raise exception using errcode='P0001',message='Stock insuficiente para la carga.'; end if;
    end if;
    update public.cilindros set estado='cargado_camion',camion_actual_id=v.camion_id where id=c.id;
   else
    select * into item from public.detalle_cargas_balones where viaje_id=v.id and cilindro_id=c.id and recibido_at is null;
    if not found or c.camion_actual_id is distinct from v.camion_id or c.estado<>'cargado_camion' then raise exception using errcode='P0001',message='Cilindro no pendiente en este viaje: '||code; end if;
    update public.detalle_cargas_balones set recibido_at=now() where viaje_id=v.id and cilindro_id=c.id;
    update public.cilindros set estado=case when item.lleno then 'en_almacen'::public.estado_cilindro else 'recuperado_vacio'::public.estado_cilindro end,camion_actual_id=null where id=c.id;
    if item.lleno then update public.inventario_empresa set stock=stock+1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad; end if;
   end if;
   insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(c.id,case when p_accion='cargar' then 'Carga masiva' else 'RecepciÃ³n de carga' end,v.origen||' â†’ '||v.destino,perfil.nombres);
  end loop;
  if p_accion='cargar' then update public.viajes_flota set estado='en_transito',salida_at=now() where id=v.id;
  elsif not exists(select 1 from public.detalle_cargas_balones where viaje_id=v.id and recibido_at is null) then update public.viajes_flota set estado='recibido',llegada_at=now() where id=v.id; end if;
  v_id:=v.id;
 elsif p_accion='asignar' then
  select * into o from public.pedidos where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa for update;
  if not found or o.estado not in ('pendiente','asignado_chofer') or not o.stock_reservado then raise exception using errcode='P0001',message='Pedido no disponible para asignaciÃ³n.'; end if;
  if not exists(select 1 from public.perfiles where id=(p_datos->>'chofer_id')::uuid and empresa_id=p_empresa and activo and rol='chofer_repartidor') then raise exception using errcode='P0001',message='El motorizado debe pertenecer a tu empresa.'; end if;
  if not exists(select 1 from public.vehiculos_reparto where id=(p_datos->>'vehiculo_id')::uuid and empresa_id=p_empresa and activo) then raise exception using errcode='P0001',message='VehÃ­culo no autorizado.'; end if;
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or not c.aprobado_calidad or c.estado<>'en_almacen' or not exists(select 1 from public.pedido_items where pedido_id=o.id and capacidad=c.capacidad) then raise exception using errcode='P0001',message='Cilindro no disponible o capacidad incorrecta.'; end if;
  -- En este flujo cada pedido web contiene una sola unidad.
  for item in select cilindro_asignado_id from public.pedido_items where pedido_id=o.id and cilindro_asignado_id is not null loop
   update public.cilindros set estado='en_almacen' where id=item.cilindro_asignado_id and id<>c.id;
  end loop;
  update public.pedido_items set cilindro_asignado_id=c.id where pedido_id=o.id;
  update public.cilindros set estado='en_ruta_entrega' where id=c.id;
  update public.pedidos set chofer_id=(p_datos->>'chofer_id')::uuid,vehiculo_reparto_id=(p_datos->>'vehiculo_id')::uuid,estado='asignado_chofer',fecha_hora_asignacion=now() where id=o.id;
  insert into public.notificaciones(usuario_id,titulo) values((p_datos->>'chofer_id')::uuid,'Nuevo pedido asignado: '||o.codigo_ticket); v_id:=o.id;
 elsif p_accion='entregar' then
  select * into o from public.pedidos where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa for update;
  if not found or o.estado<>'en_puerta_pesaje' or not (public.puede_gestionar(p_empresa) or o.chofer_id=auth.uid()) then raise exception using errcode='42501',message='Pedido no autorizado para entrega.'; end if;
  select * into c from public.cilindros where codigo_qr=p_datos->>'codigo' and empresa_duena_id=p_empresa for update;
  if not found or not c.aprobado_calidad or c.estado<>'en_ruta_entrega' or not exists(select 1 from public.pedido_items where pedido_id=o.id and cilindro_asignado_id=c.id) then raise exception using errcode='P0001',message='El cÃ³digo no corresponde al balÃ³n asignado.'; end if;
  if nullif(trim(p_datos->>'vacio'),'') is not null then
   select * into vac from public.cilindros where codigo_qr=trim(p_datos->>'vacio') and empresa_duena_id=p_empresa for update;
   if not found or vac.id=c.id or vac.estado<>'entregado_cliente' or (vac.cliente_actual_id is not null and vac.cliente_actual_id is distinct from o.cliente_id) then raise exception using errcode='P0001',message='El balÃ³n vacÃ­o no corresponde a este cliente.'; end if;
   update public.cilindros set estado='recuperado_vacio',cliente_actual_id=null where id=vac.id;
   insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(vac.id,'RecuperaciÃ³n de vacÃ­o','DevoluciÃ³n registrada.',perfil.nombres);
  end if;
  if nullif(trim(p_datos->>'balanza'),'') is null or p_datos->>'peso' is null
   or (p_datos->>'peso')::numeric::text in ('NaN','Infinity','-Infinity')
   or abs((p_datos->>'peso')::numeric-c.tara_calibrada_kg-replace(c.capacidad::text,'kg','')::numeric)>0.05 then
   raise exception using errcode='P0001',message='Registra la balanza y un peso neto conforme a la capacidad (tolerancia 0.05 kg).';
  end if;
  insert into public.pesajes_entrega(pedido_id,cilindro_entregado_id,cilindro_vacio_retornado_id,chofer_id,id_balanza_bluetooth,peso_bruto_medido_kg,tara_descontada_kg,peso_neto_calculado_kg,pesaje_aprobado)
    values(o.id,c.id,vac.id,o.chofer_id,trim(p_datos->>'balanza'),(p_datos->>'peso')::numeric,c.tara_calibrada_kg,(p_datos->>'peso')::numeric-c.tara_calibrada_kg,true);
  insert into public.entregas_domiciliarias(pedido_id,cilindro_id,vacio_id,responsable_id) values(o.id,c.id,vac.id,auth.uid());
  update public.cilindros set estado='entregado_cliente',cliente_actual_id=o.cliente_id where id=c.id;
  insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre) values(c.id,'Entrega a cliente','Entrega confirmada mediante cÃ³digo del cilindro.',perfil.nombres);
  update public.pedidos set estado='entregado',fecha_hora_entrega=now() where id=o.id;
  delete from public.ubicaciones_repartidores where pedido_id=o.id;
  if o.cliente_id is not null then insert into public.notificaciones(usuario_id,titulo) values(o.cliente_id,'Pedido entregado: '||o.codigo_ticket); end if; v_id:=o.id;
 elsif p_accion='incidencia' then
  insert into public.incidencias(empresa_id,responsable_id,descripcion) values(p_empresa,auth.uid(),trim(p_datos->>'descripcion')) returning id into v_id;
 elsif p_accion='resolver' then
  update public.incidencias set estado='resuelta' where id=(p_datos->>'id')::uuid and empresa_id=p_empresa returning id into v_id;
 elsif p_accion='cobro' then
  perform public.exigir_operacion(p_empresa);
  update public.pedidos set estado_pago='completado',metodo_pago=(p_datos->>'metodo')::public.metodo_pago where id=(p_datos->>'pedido_id')::uuid and empresa_id=p_empresa and estado='entregado' and estado_pago='pendiente' returning id into v_id;
  if v_id is null then raise exception using errcode='P0001',message='Solo se registran cobros pendientes de pedidos entregados.'; end if;
 else raise exception using errcode='P0001',message='OperaciÃ³n no vÃ¡lida.';
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),p_accion,v_id);
 return v_id;
end; $$;

create or replace function public.compartir_ubicacion(p_pedido uuid,p_latitud numeric,p_longitud numeric) returns void language plpgsql security definer set search_path='' as $$
declare o public.pedidos;
begin
 select * into o from public.pedidos where id=p_pedido for share;
 if not found or o.chofer_id is distinct from auth.uid() or not public.pertenece_empresa(o.empresa_id) or not public.membresia_activa(o.empresa_id)
 or o.estado not in ('asignado_chofer','en_camino','en_puerta_pesaje') then raise exception using errcode='42501',message='UbicaciÃ³n permitida solo durante tu entrega asignada.'; end if;
 insert into public.ubicaciones_repartidores(pedido_id,usuario_id,latitud,longitud) values(o.id,auth.uid(),p_latitud,p_longitud)
 on conflict(pedido_id) do update set usuario_id=excluded.usuario_id,latitud=excluded.latitud,longitud=excluded.longitud,updated_at=now();
end; $$;

-- El pasaporte pÃºblico excluye nombres de trabajadores y descripciones/rutas internas.
create or replace function public.pasaporte_publico(p_codigo text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('codigo',c.codigo_qr,'uuid',c.uuid_inmutable,'tipo',c.capacidad::text,
 'tara',c.tara_calibrada_kg::text||' kg','pesoBruto',coalesce(c.peso_bruto_actual_kg::text||' kg','Sin registro'),
 'estado',upper(replace(c.estado::text,'_',' ')),'planta',coalesce(e.nombre_comercial,e.razon_social,'Sin registro'),
 'fechaLlenado',to_char(c.fecha_ultimo_envasado at time zone 'America/Lima','DD/MM/YYYY HH24:MI'),
 'operadorLlenado','InformaciÃ³n reservada','eventos',coalesce((select jsonb_agg(jsonb_build_object('fecha',to_char(t.created_at at time zone 'America/Lima','DD/MM/YYYY HH24:MI'),
 'evento',t.tipo_evento,'detalle','Movimiento registrado por la empresa responsable.','operador','SYSGAS','icono',t.icono_bootstrap,'ok',t.es_conforme) order by t.created_at,t.id)
 from public.cilindros_trazabilidad t where t.cilindro_id=c.id),'[]'::jsonb),'certificados','[]'::jsonb)
 from public.cilindros c left join public.empresas_distribuidoras e on e.id=c.empresa_duena_id where c.codigo_qr=p_codigo limit 1;
$$;
revoke all on function public.pertenece_empresa(uuid),public.gestion_logistica(text,uuid,jsonb),public.compartir_ubicacion(uuid,numeric,numeric) from public;
grant execute on function public.pertenece_empresa(uuid),public.gestion_logistica(text,uuid,jsonb),public.compartir_ubicacion(uuid,numeric,numeric) to authenticated;

-- === 202610300006_controles_reportes.sql ===

create table if not exists public.zonas_cobertura (
 id uuid primary key default gen_random_uuid(),empresa_id uuid not null references public.empresas_distribuidoras(id),ciudad text not null,zona text not null,
 unique(empresa_id,ciudad,zona)
);
alter table public.zonas_cobertura enable row level security;
drop policy if exists cobertura_publica on public.zonas_cobertura;
create policy cobertura_publica on public.zonas_cobertura for select using(true);
grant select on public.zonas_cobertura to anon,authenticated;
revoke insert,update,delete on public.zonas_cobertura from anon,authenticated;
create or replace function public.guardar_cobertura(p_empresa uuid,p_ciudad text,p_zona text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.exigir_operacion(p_empresa);
 if length(trim(coalesce(p_ciudad,''))) not between 2 and 80 or length(trim(coalesce(p_zona,''))) not between 2 and 100 then raise exception using errcode='P0001',message='Completa ciudad y zona.'; end if;
 insert into public.zonas_cobertura(empresa_id,ciudad,zona) values(p_empresa,trim(p_ciudad),trim(p_zona)) on conflict do nothing;
end; $$;

-- Los repartidores solo avanzan los pedidos asignados. La entrega exige cÃ³digo.
create or replace function public.cambiar_estado_pedido(p_pedido uuid,p_estado public.estado_pedido)
returns void language plpgsql security definer set search_path='' as $$
declare o public.pedidos; item record; gerente boolean;
begin
 select * into o from public.pedidos where id=p_pedido for update;
 if not found then raise exception using errcode='42501',message='Pedido no autorizado.'; end if;
 gerente:=public.puede_gestionar(o.empresa_id);
 if not gerente and not (o.chofer_id=auth.uid() and public.pertenece_empresa(o.empresa_id)) then raise exception using errcode='42501',message='Pedido no autorizado.'; end if;
 if not public.membresia_activa(o.empresa_id) then raise exception using errcode='P0001',message='La empresa no tiene una membresÃ­a vigente.'; end if;
 if p_estado=o.estado then return; end if;
 if not o.stock_reservado then raise exception using errcode='P0001',message='Pedido antiguo: requiere revisiÃ³n manual de stock.'; end if;
 if p_estado is null or o.estado in ('cancelado','entregado') or not (
  (gerente and p_estado='cancelado') or (o.estado='asignado_chofer' and p_estado='en_camino' and o.chofer_id is not null)
  or (o.estado='en_camino' and p_estado='en_puerta_pesaje')) then
  raise exception using errcode='P0001',message='Asigna un repartidor y usa el cÃ³digo del balÃ³n para confirmar la entrega.';
 end if;
 if p_estado='cancelado' then
  for item in select capacidad,sum(cantidad) cantidad from public.pedido_items where pedido_id=o.id group by capacidad loop
   update public.inventario_empresa set stock=stock+item.cantidad,updated_at=now() where empresa_id=o.empresa_id and capacidad=item.capacidad;
  end loop;
  update public.cilindros set estado='en_almacen' where id in(select cilindro_asignado_id from public.pedido_items where pedido_id=o.id) and estado='en_ruta_entrega';
  delete from public.ubicaciones_repartidores where pedido_id=o.id;
 end if;
 update public.pedidos set estado=p_estado,fecha_hora_llegada=case when p_estado='en_puerta_pesaje' then now() else fecha_hora_llegada end where id=o.id;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id,detalle) values(o.empresa_id,auth.uid(),'estado_pedido',o.id,jsonb_build_object('estado',p_estado));
end; $$;

create or replace function public.reporte_empresa(p_empresa uuid,p_desde date,p_hasta date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare reporte jsonb;
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Reporte no autorizado.'; end if;
 if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>366 then raise exception using errcode='P0001',message='Selecciona un periodo de hasta 366 dÃ­as.'; end if;
 select jsonb_build_object('pedidos',count(*),'entregados',count(*) filter(where estado='entregado'),
 'ventas_pen',coalesce(sum(total_pedido_pen) filter(where estado='entregado'),0),
 'cobrado_pen',coalesce(sum(total_pedido_pen) filter(where estado='entregado' and estado_pago='completado'),0),
 'cancelados',count(*) filter(where estado='cancelado')) into reporte
 from public.pedidos where empresa_id=p_empresa and (created_at at time zone 'America/Lima')::date between p_desde and p_hasta;
 return reporte||jsonb_build_object('stock_disponible',(select coalesce(sum(stock),0) from public.inventario_empresa where empresa_id=p_empresa),
 'cilindros',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select estado,count(*) cantidad from public.cilindros where empresa_duena_id=p_empresa group by estado)t),
 'productos',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select i.capacidad,sum(i.cantidad) unidades from public.pedido_items i join public.pedidos p on p.id=i.pedido_id where p.empresa_id=p_empresa and p.estado='entregado' and (p.created_at at time zone 'America/Lima')::date between p_desde and p_hasta group by i.capacidad)t),
 'viajes',(select count(*) from public.viajes_flota where empresa_id=p_empresa and (created_at at time zone 'America/Lima')::date between p_desde and p_hasta),
 'incidencias_abiertas',(select count(*) from public.incidencias where empresa_id=p_empresa and estado='abierta'));
end; $$;
create or replace function public.reporte_sysgas() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS puede consultar el reporte global.'; end if;
 return jsonb_build_object('empresas',(select count(*) from public.empresas_distribuidoras),
 'solicitudes_pendientes',(select count(*) from public.solicitudes_afiliacion where estado='pendiente_revision'),
 'membresias_activas',(select count(*) from public.suscripciones_empresas where estado='activa' and vigente_hasta>now()),
 'ingresos_membresias_pen',(select coalesce(sum(importe_pen),0) from public.pagos_membresia where estado='verificado'));
end; $$;
create or replace function public.leer_notificacion(p_id uuid) returns void language sql security definer set search_path='' as $$
 update public.notificaciones set leida=true where id=p_id and usuario_id=auth.uid();
$$;
revoke all on function public.guardar_cobertura(uuid,text,text),public.reporte_empresa(uuid,date,date),public.reporte_sysgas(),public.leer_notificacion(uuid) from public;
grant execute on function public.guardar_cobertura(uuid,text,text),public.reporte_empresa(uuid,date,date),public.reporte_sysgas(),public.leer_notificacion(uuid) to authenticated;
-- Evitar importes especiales de PostgreSQL (NaN/Infinity).
alter table public.planes_suscripcion drop constraint if exists planes_importe_finito;
alter table public.planes_suscripcion add constraint planes_importe_finito check(precio_pen::text not in ('NaN','Infinity','-Infinity'));

-- === 202610300007_planes_gps.sql ===

create or replace function public.editar_plan(p_id uuid,p_nombre text,p_precio numeric,p_dias integer,p_activo boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS administra planes.'; end if;
 if p_nombre is null or length(trim(p_nombre)) not between 2 and 80 or p_precio is null or p_precio<=0 or p_precio::text in ('NaN','Infinity','-Infinity') or p_dias is null or p_dias not between 1 and 366 or p_activo is null then
  raise exception using errcode='P0001',message='Revisa nombre, precio y dÃ­as del plan.';
 end if;
 update public.planes_suscripcion set nombre=trim(p_nombre),precio_pen=p_precio,dias=p_dias,activo=p_activo where id=p_id;
 if not found then raise exception using errcode='P0001',message='El plan no existe.'; end if;
 insert into public.auditoria_operaciones(usuario_id,operacion,entidad_id) values(auth.uid(),'editar_plan',p_id);
end; $$;

create or replace function public.compartir_ubicacion_flota(p_viaje uuid,p_latitud numeric,p_longitud numeric) returns void language plpgsql security definer set search_path='' as $$
declare v public.viajes_flota;
begin
 select * into v from public.viajes_flota where id=p_viaje for share;
 if not found or v.operador_id is distinct from auth.uid() or v.estado<>'en_transito' or not public.pertenece_empresa(v.empresa_id) or not public.membresia_activa(v.empresa_id) then
  raise exception using errcode='42501',message='Solo el operador del viaje activo puede compartir su GPS.';
 end if;
 if p_latitud is null or p_longitud is null or not p_latitud between -90 and 90 or not p_longitud between -180 and 180 then raise exception using errcode='P0001',message='Coordenadas invÃ¡lidas.'; end if;
 insert into public.camiones_telemetria(camion_id,latitud,longitud) values(v.camion_id,p_latitud,p_longitud);
 update public.camiones_flota set ultima_latitud=p_latitud,ultima_longitud=p_longitud,ultima_telemetria=now() where id=v.camion_id;
end; $$;
drop policy if exists telemetria_privada on public.camiones_telemetria;
create policy telemetria_privada on public.camiones_telemetria for select to authenticated using(exists(select 1 from public.camiones_flota c where c.id=camion_id and (public.puede_gestionar(c.empresa_id) or exists(select 1 from public.viajes_flota v where v.camion_id=c.id and v.operador_id=auth.uid() and v.estado='en_transito' and camiones_telemetria.timestamp_gps>=v.salida_at and public.pertenece_empresa(v.empresa_id)))));
grant select on public.camiones_telemetria to authenticated;
revoke insert,update,delete on public.camiones_telemetria,public.pesajes_entrega from anon,authenticated;
drop policy if exists pesajes_autorizados on public.pesajes_entrega;
create policy pesajes_autorizados on public.pesajes_entrega for select to authenticated using(exists(select 1 from public.pedidos p where p.id=pedido_id));
grant select on public.pesajes_entrega to authenticated;
revoke all on function public.editar_plan(uuid,text,numeric,integer,boolean),public.compartir_ubicacion_flota(uuid,numeric,numeric) from public;
grant execute on function public.editar_plan(uuid,text,numeric,integer,boolean),public.compartir_ubicacion_flota(uuid,numeric,numeric) to authenticated;

-- === 202610300008_cobertura_viajes.sql ===

alter table public.pedidos add column if not exists zona_entrega text;
create or replace function public.crear_pedido_zona(p_nombre text,p_telefono text,p_direccion text,p_referencia text,p_capacidad public.capacidad_cilindro,p_empresa uuid,p_ciudad text default 'Puno',p_zona text default '')
returns text language plpgsql security definer set search_path='' as $$
declare ticket text;
begin
 if length(trim(coalesce(p_ciudad,''))) not between 2 and 60 or length(coalesce(p_zona,''))>100 then raise exception using errcode='P0001',message='Revisa ciudad y zona de entrega.'; end if;
 if exists(select 1 from public.zonas_cobertura where empresa_id=p_empresa) and not exists(
  select 1 from public.zonas_cobertura where empresa_id=p_empresa and lower(ciudad)=lower(trim(p_ciudad)) and lower(zona)=lower(trim(p_zona))) then
  raise exception using errcode='P0001',message='La distribuidora no atiende la ciudad y zona seleccionadas.';
 end if;
 if not exists(select 1 from public.zonas_cobertura where empresa_id=p_empresa) and not exists(select 1 from public.empresas_distribuidoras where id=p_empresa and lower(ciudad)=lower(trim(p_ciudad))) then raise exception using errcode='P0001',message='La distribuidora no atiende esa ciudad.'; end if;
 ticket:=public.crear_pedido_empresa(p_nombre,p_telefono,p_direccion,p_referencia,p_capacidad,p_empresa);
 update public.pedidos set ciudad=trim(p_ciudad),zona_entrega=nullif(trim(p_zona),'') where codigo_ticket=ticket;
 return ticket;
end; $$;
revoke all on function public.crear_pedido_empresa(text,text,text,text,public.capacidad_cilindro,uuid) from anon,authenticated;
revoke all on function public.crear_pedido_zona(text,text,text,text,public.capacidad_cilindro,uuid,text,text) from public;
grant execute on function public.crear_pedido_zona(text,text,text,text,public.capacidad_cilindro,uuid,text,text) to anon,authenticated;

drop function if exists public.resumen_viajes(uuid);
create or replace function public.resumen_viajes(p_empresa uuid)
returns table(id uuid,camion_id uuid,origen text,destino text,estado text,total bigint,recibidos bigint,esperados integer)
language sql stable security definer set search_path='' as $$
 select v.id,v.camion_id,v.origen,v.destino,v.estado,count(d.cilindro_id),count(d.recibido_at),v.cantidad_esperada
 from public.viajes_flota v left join public.detalle_cargas_balones d on d.viaje_id=v.id where v.empresa_id=p_empresa
 and (public.puede_gestionar(v.empresa_id) or (v.operador_id=auth.uid() and public.pertenece_empresa(v.empresa_id)))
 group by v.id order by v.created_at desc limit 100;
$$;
revoke all on function public.resumen_viajes(uuid) from public;
grant execute on function public.resumen_viajes(uuid) to authenticated;

-- === 202610300009_notificaciones_comprobantes.sql ===

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
 insert into public.notificaciones(usuario_id,titulo) select id,'Nueva solicitud de afiliaciÃ³n: '||new.nombre_empresa from public.perfiles where rol='super_admin' and activo;
 return new;
end; $$;
drop trigger if exists aviso_solicitud on public.solicitudes_afiliacion;
create trigger aviso_solicitud after insert on public.solicitudes_afiliacion for each row execute function public.notificar_solicitud();

-- Comprobante INTERNO, sin envÃ­o a SUNAT ni declaraciÃ³n de aceptaciÃ³n tributaria.
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

-- === 202610300010_administracion_activos.sql ===

create or replace function public.administrar_activo(p_tipo text,p_id uuid,p_activo boolean) returns void language plpgsql security definer set search_path='' as $$
declare empresa uuid;
begin
 if p_activo is null then raise exception using errcode='P0001',message='Estado invÃ¡lido.'; end if;
 if p_tipo='moto' then
  select empresa_id into empresa from public.vehiculos_reparto where id=p_id for update;
  if empresa is null then raise exception using errcode='P0001',message='VehÃ­culo no encontrado.'; end if;
  perform public.exigir_operacion(empresa);
  if not p_activo and exists(select 1 from public.pedidos where vehiculo_reparto_id=p_id and estado in ('asignado_chofer','en_camino','en_puerta_pesaje')) then raise exception using errcode='P0001',message='El vehÃ­culo tiene una entrega activa.'; end if;
  update public.vehiculos_reparto set activo=p_activo where id=p_id;
 elsif p_tipo='camion' then
  select empresa_id into empresa from public.camiones_flota where id=p_id for update;
  if empresa is null then raise exception using errcode='P0001',message='CamiÃ³n no encontrado.'; end if;
  perform public.exigir_operacion(empresa);
  if not p_activo and exists(select 1 from public.viajes_flota where camion_id=p_id and estado<>'recibido') then raise exception using errcode='P0001',message='El camiÃ³n tiene un viaje pendiente.'; end if;
  update public.camiones_flota set activo=p_activo where id=p_id;
 elsif p_tipo='empresa' then
  if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS administra empresas.'; end if;
  empresa:=p_id;
  update public.empresas_distribuidoras set estado=case when p_activo then 'activo' else 'suspendido' end where id=p_id;
  if not found then raise exception using errcode='P0001',message='Empresa no encontrada.'; end if;
 else raise exception using errcode='P0001',message='Tipo no vÃ¡lido.';
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id,detalle) values(empresa,auth.uid(),'estado_'||p_tipo,p_id,jsonb_build_object('activo',p_activo));
end; $$;
create or replace function public.asignar_administrador(p_empresa uuid,p_correo text) returns void language plpgsql security definer set search_path='' as $$
declare persona uuid;
begin
 if not public.es_superadmin() then raise exception using errcode='42501',message='Solo SYSGAS asigna administradores empresariales.'; end if;
 perform 1 from public.empresas_distribuidoras where id=p_empresa;
 if not found then raise exception using errcode='P0001',message='Empresa no encontrada.'; end if;
 select p.id into persona from public.perfiles p join auth.users u on u.id=p.id where lower(u.email)=lower(trim(p_correo)) and u.email_confirmed_at is not null and p.activo and p.rol='cliente_comun' and p.empresa_id is null for update of p;
 if persona is null then raise exception using errcode='P0001',message='Se requiere una cuenta de cliente confirmada, activa y sin empresa.'; end if;
 update public.perfiles set empresa_id=p_empresa,rol='empresa_admin' where id=persona;
 insert into public.notificaciones(usuario_id,titulo) values(persona,'Tu cuenta fue habilitada como administrador de distribuidora.');
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),'asignar_administrador',persona);
end; $$;
revoke all on function public.administrar_activo(text,uuid,boolean),public.asignar_administrador(uuid,text) from public;
grant execute on function public.administrar_activo(text,uuid,boolean),public.asignar_administrador(uuid,text) to authenticated;

-- === 202610300011_pedidos_idempotentes.sql ===

alter table public.pedidos add column if not exists solicitud_web_id uuid;
create unique index if not exists pedido_solicitud_web_unica on public.pedidos(solicitud_web_id) where solicitud_web_id is not null;
create or replace function public.crear_pedido_seguro(p_nombre text,p_telefono text,p_direccion text,p_referencia text,p_capacidad public.capacidad_cilindro,p_empresa uuid,p_ciudad text default 'Puno',p_zona text default '',p_solicitud uuid default gen_random_uuid())
returns text language plpgsql security definer set search_path='' as $$
declare o public.pedidos; ticket text;
begin
 if p_solicitud is null then raise exception using errcode='P0001',message='Falta el identificador de la solicitud.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_solicitud::text,0));
 select * into o from public.pedidos where solicitud_web_id=p_solicitud;
 if found then
  if o.cliente_id is distinct from auth.uid() or o.empresa_id is distinct from p_empresa or o.telefono_contacto is distinct from trim(p_telefono) or o.direccion_entrega is distinct from trim(p_direccion) or o.nombre_destinatario is distinct from trim(p_nombre) or o.ciudad is distinct from trim(p_ciudad) or coalesce(o.zona_entrega,'') is distinct from trim(p_zona) or not exists(select 1 from public.pedido_items where pedido_id=o.id and capacidad=p_capacidad) then
   raise exception using errcode='42501',message='La solicitud ya corresponde a otro pedido.';
  end if;
  return o.codigo_ticket;
 end if;
 ticket:=public.crear_pedido_zona(p_nombre,p_telefono,p_direccion,p_referencia,p_capacidad,p_empresa,p_ciudad,p_zona);
 update public.pedidos set solicitud_web_id=p_solicitud where codigo_ticket=ticket;
 return ticket;
end; $$;
revoke all on function public.crear_pedido_zona(text,text,text,text,public.capacidad_cilindro,uuid,text,text) from anon,authenticated;
revoke all on function public.crear_pedido_seguro(text,text,text,text,public.capacidad_cilindro,uuid,text,text,uuid) from public;
grant execute on function public.crear_pedido_seguro(text,text,text,text,public.capacidad_cilindro,uuid,text,text,uuid) to anon,authenticated;
notify pgrst,'reload schema';

-- === 202610300012_mantenimiento.sql ===

create or replace function public.control_cilindro(p_empresa uuid,p_codigo text,p_estado public.estado_cilindro,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare c public.cilindros;
begin
 perform public.exigir_operacion(p_empresa);
 if p_estado is null or p_estado not in ('en_mantenimiento','baja_recalificacion') or length(trim(coalesce(p_motivo,''))) not between 5 and 2000 then raise exception using errcode='P0001',message='Selecciona mantenimiento o retiro y describe el motivo.'; end if;
 select * into c from public.cilindros where codigo_qr=p_codigo and empresa_duena_id=p_empresa for update;
 if not found or c.estado not in ('en_almacen','recuperado_vacio','en_planta','en_mantenimiento') then raise exception using errcode='P0001',message='El balÃ³n no estÃ¡ disponible. Revisa sus asignaciones.'; end if;
 if c.estado='en_almacen' then
  update public.inventario_empresa set stock=stock-1,updated_at=now() where empresa_id=p_empresa and capacidad=c.capacidad and stock>0;
  if not found then raise exception using errcode='P0001',message='No hay stock libre: el balÃ³n puede estar reservado por un pedido.'; end if;
 end if;
 update public.cilindros set estado=p_estado,aprobado_calidad=false,motivo_bloqueo=trim(p_motivo) where id=c.id;
 insert into public.cilindros_trazabilidad(cilindro_id,tipo_evento,descripcion,operador_nombre,es_conforme) values(c.id,case when p_estado='en_mantenimiento' then 'Mantenimiento' else 'Retiro del servicio' end,trim(p_motivo),(select nombres from public.perfiles where id=auth.uid()),false);
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),'control_cilindro',c.id);
end; $$;
revoke all on function public.control_cilindro(uuid,text,public.estado_cilindro,text) from public;
grant execute on function public.control_cilindro(uuid,text,public.estado_cilindro,text) to authenticated;

-- === 202610300013_indicadores_operativos.sql ===

create or replace function public.reporte_empresa(p_empresa uuid,p_desde date,p_hasta date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare reporte jsonb;
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Reporte no autorizado.'; end if;
 if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>366 then raise exception using errcode='P0001',message='Selecciona un periodo de hasta 366 dÃ­as.'; end if;
 select jsonb_build_object('pedidos',count(*),'entregados',count(*) filter(where estado='entregado'),
 'ventas_pen',coalesce(sum(total_pedido_pen) filter(where estado='entregado'),0),
 'cobrado_pen',coalesce(sum(total_pedido_pen) filter(where estado='entregado' and estado_pago='completado'),0),
 'cancelados',count(*) filter(where estado='cancelado')) into reporte
 from public.pedidos where empresa_id=p_empresa and (created_at at time zone 'America/Lima')::date between p_desde and p_hasta;
 return reporte||jsonb_build_object('stock_disponible',(select coalesce(sum(stock),0) from public.inventario_empresa where empresa_id=p_empresa),
 'cilindros',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select estado,count(*) cantidad from public.cilindros where empresa_duena_id=p_empresa group by estado)t),
 'productos',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select i.capacidad,sum(i.cantidad) unidades from public.pedido_items i join public.pedidos p on p.id=i.pedido_id where p.empresa_id=p_empresa and p.estado='entregado' and (p.created_at at time zone 'America/Lima')::date between p_desde and p_hasta group by i.capacidad)t),
 'viajes',(select count(*) from public.viajes_flota where empresa_id=p_empresa and (created_at at time zone 'America/Lima')::date between p_desde and p_hasta),
 'unidades_recibidas',(select count(*) from public.detalle_cargas_balones d join public.viajes_flota v on v.id=d.viaje_id where v.empresa_id=p_empresa and (d.recibido_at at time zone 'America/Lima')::date between p_desde and p_hasta),
 'vacios_recuperados',(select count(*) from public.entregas_domiciliarias e join public.pedidos p on p.id=e.pedido_id where p.empresa_id=p_empresa and e.vacio_id is not null and (e.created_at at time zone 'America/Lima')::date between p_desde and p_hasta),
 'repartidores',(select coalesce(jsonb_agg(t),'[]'::jsonb) from(select u.nombres::text,count(*) entregas from public.pedidos p join public.perfiles u on u.id=p.chofer_id where p.empresa_id=p_empresa and p.estado='entregado' and (p.fecha_hora_entrega at time zone 'America/Lima')::date between p_desde and p_hasta group by u.id,u.nombres)t),
 'incidencias_abiertas',(select count(*) from public.incidencias where empresa_id=p_empresa and estado='abierta'));
end; $$;

-- === 202610300014_cantidad_esperada.sql ===
-- Compatibilidad con instalaciones que ya tenÃ­an viajes antes de aÃ±adir el contador.

alter table public.viajes_flota add column if not exists cantidad_esperada integer not null default 0 check(cantidad_esperada>=0);

-- === 202610300015_resumen_inventario.sql ===

create or replace function public.resumen_inventario(p_empresa uuid) returns table(capacidad public.capacidad_cilindro,estado public.estado_cilindro,cantidad bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Inventario no autorizado.'; end if;
 return query select c.capacidad,c.estado,count(*) from public.cilindros c where c.empresa_duena_id=p_empresa group by c.capacidad,c.estado;
end; $$;
revoke all on function public.resumen_inventario(uuid) from public;
grant execute on function public.resumen_inventario(uuid) to authenticated;

-- === 202610300016_viajes_activos.sql ===

alter table public.viajes_flota drop constraint if exists viajes_flota_estado_check;
alter table public.viajes_flota add constraint viajes_flota_estado_check check(estado in ('preparacion','en_transito','recibido','cancelado'));
create unique index if not exists un_viaje_activo_por_camion on public.viajes_flota(camion_id) where estado in ('preparacion','en_transito');
create unique index if not exists un_viaje_activo_por_operador on public.viajes_flota(operador_id) where estado in ('preparacion','en_transito');
create or replace function public.cancelar_viaje(p_empresa uuid,p_viaje uuid) returns void language plpgsql security definer set search_path='' as $$
declare v public.viajes_flota;
begin
 perform public.exigir_operacion(p_empresa);
 select * into v from public.viajes_flota where id=p_viaje and empresa_id=p_empresa for update;
 if not found or v.estado<>'preparacion' then raise exception using errcode='P0001',message='Solo se cancela un viaje antes de confirmar la carga.'; end if;
 update public.viajes_flota set estado='cancelado' where id=v.id;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id) values(p_empresa,auth.uid(),'cancelar_viaje',v.id);
end; $$;
revoke all on function public.cancelar_viaje(uuid,uuid) from public;
grant execute on function public.cancelar_viaje(uuid,uuid) to authenticated;

-- === 202610300017_indices_operativos.sql ===

create index if not exists pedidos_empresa_fecha on public.pedidos(empresa_id,created_at desc);
create index if not exists pedido_items_pedido on public.pedido_items(pedido_id);
create index if not exists perfiles_empresa_cargo on public.perfiles(empresa_id,rol,activo);
create index if not exists pagos_membresia_empresa_fecha on public.pagos_membresia(empresa_id,created_at desc);
create index if not exists invitaciones_correo_estado on public.invitaciones_personal(correo,estado);
create index if not exists notificaciones_bandeja on public.notificaciones(usuario_id,leida,created_at desc);
create index if not exists viajes_empresa_fecha on public.viajes_flota(empresa_id,created_at desc);
create index if not exists cargas_por_cilindro on public.detalle_cargas_balones(cilindro_id);
create index if not exists incidencias_empresa_estado on public.incidencias(empresa_id,estado,created_at desc);
create index if not exists auditoria_empresa_fecha on public.auditoria_operaciones(empresa_id,created_at desc);
create index if not exists movimientos_empresa_fecha on public.movimientos_inventario(empresa_id,created_at desc);
create index if not exists comprobantes_por_pedido on public.comprobantes_pago(pedido_id);

-- === 202611030018_alta_directa_fotos.sql ===

create or replace function public.alta_directa_empresa(p_datos jsonb,p_comprobar boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 correo text:=lower(trim(coalesce(p_datos->>'correo','')));
 ruc_empresa text:=trim(coalesce(p_datos->>'ruc',''));
 razon text:=trim(coalesce(p_datos->>'razon_social',''));
 ciudad_empresa text:=trim(coalesce(p_datos->>'ciudad',''));
 direccion_empresa text:=trim(coalesce(p_datos->>'direccion',''));
 telefono text:=trim(coalesce(p_datos->>'telefono',''));
 nombres_gerente text:=trim(coalesce(p_datos->>'nombres',''));
 apellidos_gerente text:=trim(coalesce(p_datos->>'apellidos',''));
 dias_cortesia text:=coalesce(p_datos->>'dias_cortesia','0');
 usuario auth.users; perfil public.perfiles; empresa public.empresas_distribuidoras;
begin
 if not public.es_superadmin() then raise exception using errcode='42501',message='Solo el superadministrador puede dar de alta empresas.'; end if;
 if ruc_empresa !~ '^[0-9]{11}$' or correo !~ '^[^ @]+@[^ @]+[.][^ @]+$' or length(correo)>120
 or length(razon) not between 2 and 150 or length(ciudad_empresa) not between 2 and 60
 or length(direccion_empresa) not between 5 and 500 or telefono !~ '^[+0-9 ()-]{7,20}$'
 or length(nombres_gerente) not between 2 and 100 or length(apellidos_gerente) not between 2 and 100
 or dias_cortesia not in ('0','7','15','30') then
  raise exception using errcode='P0001',message='Revisa el RUC y los datos de la empresa y del gerente.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('alta-empresa:'||ruc_empresa,0));
 select * into empresa from public.empresas_distribuidoras where ruc=ruc_empresa;
 select * into usuario from auth.users u where lower(u.email)=correo;
 if usuario.id is not null then
  select * into perfil from public.perfiles where id=usuario.id for update;
  if perfil.rol='empresa_admin' and perfil.empresa_id=empresa.id and perfil.activo then return empresa.id; end if;
  if perfil.id is null or not perfil.activo or perfil.rol<>'cliente_comun' or perfil.empresa_id is not null
    or (usuario.email_confirmed_at is null and usuario.invited_at is null) then
   raise exception using errcode='P0001',message='El gerente debe ser una cuenta confirmada sin empresa o una cuenta invitada por SYSGAS.';
  end if;
 end if;
 if empresa.id is not null then raise exception using errcode='P0001',message='Ese RUC ya existe. Usa Asignar administrador empresarial.'; end if;
 if p_comprobar then return usuario.id; end if;
 if usuario.id is null then raise exception using errcode='P0002',message='Primero crea la cuenta del gerente.'; end if;
 insert into public.empresas_distribuidoras(ruc,razon_social,nombre_comercial,ciudad,direccion,telefono_contacto,correo_contacto)
 values(ruc_empresa,razon,razon,ciudad_empresa,direccion_empresa,telefono,correo) returning * into empresa;
 update public.perfiles set empresa_id=empresa.id,rol='empresa_admin',nombres=nombres_gerente,apellidos=apellidos_gerente where id=usuario.id;
 if dias_cortesia<>'0' then
  insert into public.suscripciones_empresas(empresa_id,estado,vigente_hasta)
  values(empresa.id,'activa',now()+make_interval(days=>dias_cortesia::integer));
 end if;
 insert into public.auditoria_operaciones(empresa_id,usuario_id,operacion,entidad_id,detalle)
 values(empresa.id,auth.uid(),'alta_directa_empresa',usuario.id,jsonb_build_object('dias_cortesia',dias_cortesia::integer));
 return empresa.id;
end; $$;
revoke all on function public.alta_directa_empresa(jsonb,boolean) from public,anon;
grant execute on function public.alta_directa_empresa(jsonb,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('estado-vehiculos','estado-vehiculos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.puede_acceder_foto_vehiculo(p_ruta text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare partes text[]:=string_to_array(p_ruta,'/'); empresa uuid; vehiculo uuid;
begin
 if array_length(partes,1) is distinct from 4
 or partes[1] !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 or partes[3] !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 or partes[4] !~ '^[0-9a-f-]{36}[.](jpg|png|webp)$' then return false; end if;
 empresa:=partes[1]::uuid; vehiculo:=partes[3]::uuid;
 if not public.puede_gestionar(empresa) then return false; end if;
 if partes[2]='camion' then return exists(select 1 from public.camiones_flota where id=vehiculo and empresa_id=empresa); end if;
 if partes[2]='moto' then return exists(select 1 from public.vehiculos_reparto where id=vehiculo and empresa_id=empresa); end if;
 return false;
end; $$;
revoke all on function public.puede_acceder_foto_vehiculo(text) from public,anon;
grant execute on function public.puede_acceder_foto_vehiculo(text) to authenticated;
drop policy if exists estado_vehiculos_lectura on storage.objects;
create policy estado_vehiculos_lectura on storage.objects for select to authenticated
using(bucket_id='estado-vehiculos' and public.puede_acceder_foto_vehiculo(name));
drop policy if exists estado_vehiculos_subida on storage.objects;
create policy estado_vehiculos_subida on storage.objects for insert to authenticated
with check(bucket_id='estado-vehiculos' and public.puede_acceder_foto_vehiculo(name));
notify pgrst,'reload schema';

-- === 202611060019_comprobacion_cliente.sql ===

alter table public.pesajes_entrega add column if not exists margen_tolerancia_kg numeric(4,2) not null default 0.05;
alter table public.pesajes_entrega add column if not exists created_at timestamptz not null default now();
alter table public.incidencias add column if not exists cliente_reclamante_id uuid references public.perfiles(id);
alter table public.incidencias add column if not exists pedido_reclamado_id uuid references public.pedidos(id);
create unique index if not exists incidencia_peso_pedido on public.incidencias(pedido_reclamado_id) where pedido_reclamado_id is not null;

create table if not exists public.comprobaciones_peso (
 pedido_id uuid primary key references public.pedidos(id),
 cliente_id uuid not null references public.perfiles(id),
 peso_bruto_kg numeric(6,2) not null check(peso_bruto_kg>0),
 tara_kg numeric(6,2) not null,
 capacidad_kg numeric(6,2) not null,
 tolerancia_kg numeric(4,2) not null,
 faltante_kg numeric(6,2) not null,
 incidencia_id uuid references public.incidencias(id),
 created_at timestamptz not null default now()
);
alter table public.comprobaciones_peso enable row level security;
drop policy if exists comprobaciones_autorizadas on public.comprobaciones_peso;
create policy comprobaciones_autorizadas on public.comprobaciones_peso for select to authenticated
using(cliente_id=auth.uid() or exists(select 1 from public.pedidos p where p.id=pedido_id and public.puede_gestionar(p.empresa_id)));
grant select on public.comprobaciones_peso to authenticated;

create or replace function public.comprobar_peso_cliente(p_pedido uuid,p_peso numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 o public.pedidos;
 w public.pesajes_entrega;
 r public.comprobaciones_peso;
 capacidad numeric;
 faltante numeric;
 incidencia uuid;
begin
 select * into o from public.pedidos where id=p_pedido for update;
 if not found or o.cliente_id is distinct from auth.uid() or auth.uid() is null or o.estado<>'entregado' then
  raise exception using errcode='42501',message='Solo puedes comprobar tus pedidos entregados.';
 end if;
 select * into r from public.comprobaciones_peso where pedido_id=o.id;
 if found then return to_jsonb(r); end if;
 if p_peso is null or p_peso::text in ('NaN','Infinity','-Infinity') or p_peso<=0 or p_peso>9999.99 then
  raise exception using errcode='P0001',message='Ingresa un peso vÃ¡lido en kilogramos.';
 end if;
 select * into w from public.pesajes_entrega where pedido_id=o.id order by created_at desc limit 1;
 if not found then raise exception using errcode='P0001',message='Este pedido aÃºn no tiene pesaje de entrega registrado.'; end if;
 select replace(c.capacidad::text,'kg','')::numeric into capacidad from public.cilindros c where c.id=w.cilindro_entregado_id;
 faltante:=greatest(0,round(capacidad-(round(p_peso,2)-w.tara_descontada_kg),2));
 if faltante>w.margen_tolerancia_kg then
  insert into public.incidencias(empresa_id,responsable_id,cliente_reclamante_id,pedido_reclamado_id,descripcion)
  values(o.empresa_id,o.chofer_id,auth.uid(),o.id,
   'ComprobaciÃ³n del cliente para '||o.codigo_ticket||'. Peso bruto '||round(p_peso,2)||' kg; tara de entrega '||w.tara_descontada_kg||' kg; diferencia frente a capacidad '||faltante||' kg. Requiere revisiÃ³n de la distribuidora.')
  returning id into incidencia;
 end if;
 insert into public.comprobaciones_peso values(o.id,auth.uid(),round(p_peso,2),w.tara_descontada_kg,capacidad,w.margen_tolerancia_kg,faltante,incidencia,now()) returning * into r;
 return to_jsonb(r);
end;
$$;
revoke all on function public.comprobar_peso_cliente(uuid,numeric) from public;
grant execute on function public.comprobar_peso_cliente(uuid,numeric) to authenticated;
create or replace function public.reporte_pesos_cliente(p_empresa uuid,p_desde date,p_hasta date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.puede_gestionar(p_empresa) then raise exception using errcode='42501',message='Empresa no autorizada.'; end if;
 if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>366 then
  raise exception using errcode='P0001',message='Selecciona un periodo de hasta 366 dÃ­as.';
 end if;
 return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
  select coalesce(p.nombres,'Sin repartidor') as repartidor,
   count(*) as entregas_pesadas,
   count(c.incidencia_id) as reclamos_peso,
   count(*) filter(where i.estado='resuelta') as reclamos_resueltos
  from public.pedidos o
  join public.pesajes_entrega w on w.pedido_id=o.id
  left join public.perfiles p on p.id=o.chofer_id
  left join public.comprobaciones_peso c on c.pedido_id=o.id
  left join public.incidencias i on i.id=c.incidencia_id
  where o.empresa_id=p_empresa and o.estado='entregado'
   and (o.created_at at time zone 'America/Lima')::date between p_desde and p_hasta
  group by o.chofer_id,p.nombres
 ) r);
end;
$$;
revoke all on function public.reporte_pesos_cliente(uuid,date,date) from public;
grant execute on function public.reporte_pesos_cliente(uuid,date,date) to authenticated;

-- === 202611270020_locales_lotes_maps.sql ===
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SYSGAS Â· MigraciÃ³n 020: Locales con Google Maps, Lotes de Balones y Entregas
-- Compatible con Web (/admin, /panel, /gasero, Landing) y App MÃ³vil Android
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- 1. Locales de dispensa (sedes propias SYSGAS y distribuidoras afiliadas)
create table if not exists public.locales_dispensa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas_distribuidoras(id) on delete cascade,
  nombre_local text not null check (length(trim(nombre_local)) between 2 and 160),
  tipo text not null default 'Distribuidora afiliada'
    check (tipo in ('Sede propia', 'Distribuidora afiliada', 'Centro de dispensa')),
  ruc text check (ruc is null or ruc = '' or ruc ~ '^[0-9]{11}$'),
  ciudad text not null default 'Puno' check (length(trim(ciudad)) between 2 and 80),
  zona text not null default '',
  direccion text not null check (length(trim(direccion)) between 4 and 300),
  coordenadas text not null default '',
  latitud numeric(9,6),
  longitud numeric(9,6),
  estado text not null default 'activo' check (estado in ('activo', 'piloto', 'suspendido', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_locales_dispensa_empresa on public.locales_dispensa(empresa_id);
create index if not exists idx_locales_dispensa_ciudad on public.locales_dispensa(ciudad);

alter table public.locales_dispensa enable row level security;

drop policy if exists "locales_lectura_autenticados" on public.locales_dispensa;
create policy "locales_lectura_autenticados" on public.locales_dispensa
  for select to authenticated using (true);

drop policy if exists "locales_admin_gestion" on public.locales_dispensa;
create policy "locales_admin_gestion" on public.locales_dispensa
  for all to authenticated
  using (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo and (
        p.rol = 'super_admin'
        or (p.rol = 'empresa_admin' and p.empresa_id = locales_dispensa.empresa_id)
      )
    )
  )
  with check (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo and (
        p.rol = 'super_admin'
        or (p.rol = 'empresa_admin' and p.empresa_id = locales_dispensa.empresa_id)
      )
    )
  );

grant select, insert, update, delete on public.locales_dispensa to authenticated;

-- 2. Lotes de balones (entrada / salida por kg y control de calidad)
create table if not exists public.lotes_balones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas_distribuidoras(id) on delete cascade,
  local_id uuid references public.locales_dispensa(id) on delete set null,
  codigo_lote text not null check (length(trim(codigo_lote)) between 2 and 60),
  capacidad public.capacidad_cilindro not null default '10kg',
  cantidad integer not null check (cantidad between 1 and 5000),
  movimiento text not null check (movimiento in ('Entrada', 'Salida')),
  tara_unitaria_kg numeric(6,2) not null check (tara_unitaria_kg >= 0),
  peso_neto_unitario_kg numeric(6,2) not null check (peso_neto_unitario_kg >= 0),
  peso_total_kg numeric(10,2) not null check (peso_total_kg >= 0),
  calidad text not null default 'Apto'
    check (calidad in ('Apto', 'En inspecciÃ³n', 'Mantenimiento')),
  codigos_qr text not null default '',
  ultima_prueba date not null default current_date,
  registrado_por uuid references public.perfiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_lotes_balones_empresa on public.lotes_balones(empresa_id, created_at desc);
create index if not exists idx_lotes_balones_local on public.lotes_balones(local_id);

alter table public.lotes_balones enable row level security;

drop policy if exists "lotes_gestion_autorizada" on public.lotes_balones;
create policy "lotes_gestion_autorizada" on public.lotes_balones
  for all to authenticated
  using (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo and (
        p.rol = 'super_admin'
        or (
          p.empresa_id = lotes_balones.empresa_id
          and p.rol in ('empresa_admin', 'supervisor_calidad', 'planta_operador', 'chofer_repartidor')
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo and (
        p.rol = 'super_admin'
        or (
          p.empresa_id = lotes_balones.empresa_id
          and p.rol in ('empresa_admin', 'supervisor_calidad', 'planta_operador')
        )
      )
    )
  );

grant select, insert, update, delete on public.lotes_balones to authenticated;

-- 3. Campos de Google Maps, pesaje en puerta y cobro en pedidos
alter table public.pedidos
  add column if not exists coordenadas text not null default '',
  add column if not exists metodo_pago text not null default 'Efectivo',
  add column if not exists vacio_recuperado boolean not null default false,
  add column if not exists peso_bruto_entrega_kg numeric(6,2),
  add column if not exists tara_entrega_kg numeric(6,2),
  add column if not exists peso_neto_entrega_kg numeric(6,2);

-- 4. Permitir envÃ­o de solicitudes de afiliaciÃ³n desde la landing page (sin WhatsApp)
drop policy if exists "Cualquiera puede enviar solicitud de afiliaciÃ³n" on public.solicitudes_afiliacion;
create policy "Cualquiera puede enviar solicitud de afiliaciÃ³n" on public.solicitudes_afiliacion
  for insert to anon, authenticated
  with check (
    length(trim(nombre_empresa)) between 2 and 150
    and length(trim(representante_nombre)) between 2 and 120
    and length(trim(telefono)) between 7 and 20
    and length(trim(correo)) between 5 and 120
    and volumen_mensual_balones > 0
  );

grant insert on public.solicitudes_afiliacion to anon, authenticated;

