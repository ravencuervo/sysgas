-- ══════════════════════════════════════════════════════════════════════════════
--   SISTEMA SYSGAS · ARQUITECTURA DE BASE DE DATOS PARA POSTGRESQL & SUPABASE
--   Región: Puno, Perú © 2026
--   Módulos: Trazabilidad QR, IoT Pesaje Digital, Flota GPS, Pedidos & B2B
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 0. EXTENSIONES BÁSICAS ───
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. TIPOS ENUMERADOS (ENUMS) ───

-- Roles de usuarios del ecosistema SYSGAS
DO $$ BEGIN
  CREATE TYPE public.rol_usuario AS ENUM (
    'super_admin',          -- Control total del sistema y auditoría
    'empresa_admin',        -- Gerente/dueño de distribuidora B2B
    'supervisor_calidad',   -- Inspector de pruebas hidrostáticas e ISO
    'planta_operador',      -- Operador de envasado y calibración de tara
    'chofer_repartidor',    -- Conductor en ruta con app móvil y GPS
    'cliente_comun'         -- Usuario final / consumidor del balón
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Capacidades oficiales de cilindros
DO $$ BEGIN
  CREATE TYPE public.capacidad_cilindro AS ENUM (
    '5kg',    -- Balón Portátil / Camping
    '10kg',   -- Balón Familiar Doméstico Estándar
    '45kg'    -- Balón Industrial / Comercial
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ciclo de vida y estado físico del cilindro de gas
DO $$ BEGIN
  CREATE TYPE public.estado_cilindro AS ENUM (
    'en_planta',            -- En planta envasadora para llenado
    'en_almacen',           -- Almacenado y certificado listo para despacho
    'cargado_camion',       -- Asignado a unidad móvil de reparto
    'en_ruta_entrega',      -- En camino a domicilio del cliente
    'entregado_cliente',    -- En poder del cliente (activo)
    'recuperado_vacio',     -- Balón vacío devuelto por el cliente
    'en_mantenimiento',     -- Reparación de válvula o soldadura
    'baja_recalificacion'   -- Retirado por falla en prueba hidrostática
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estados de pedidos
DO $$ BEGIN
  CREATE TYPE public.estado_pedido AS ENUM (
    'pendiente',            -- Recibido en web o app móvil
    'asignado_chofer',      -- Asignado al camión más cercano
    'en_camino',            -- Chofer en ruta hacia el domicilio
    'en_puerta_pesaje',     -- En puerta: validación de balanza digital
    'entregado',            -- Entregado y cobrado conforme
    'cancelado'             -- Pedido cancelado
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Métodos de pago disponibles en Puno
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

-- Estado de solicitudes B2B de afiliación
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


-- ─── 2. TABLAS MAESTRAS & ESTRUCTURA ORGANIZACIONAL ───

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

-- 2.2 Plantas Envasadoras de GLP (Bahías de llenado e inspección)
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

-- 2.4 Catálogo Oficial de Productos GLP
CREATE TABLE IF NOT EXISTS public.productos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capacidad public.capacidad_cilindro NOT NULL UNIQUE,
  nombre_comercial VARCHAR(80) NOT NULL,     -- 'Balón Familiar 10 kg'
  descripcion TEXT NOT NULL,
  dimensiones VARCHAR(60) NOT NULL,          -- '62 cm alto × 30 cm ø'
  tara_promedio_kg NUMERIC(6, 2) NOT NULL,   -- 11.50
  peso_neto_gas_kg NUMERIC(6, 2) NOT NULL,   -- 10.00
  precio_venta_pen NUMERIC(8, 2) NOT NULL,   -- 48.00
  disponible_en_puno BOOLEAN NOT NULL DEFAULT true,
  imagen_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- ─── 3. FLOTA DE TRANSPORTE Y TELEMETRÍA GPS ───

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

-- 3.2 Historial de Telemetría GPS en Tiempo Real
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


-- ─── 4. CILINDROS DE GAS & PASAPORTE QR INMUTABLE ───

-- 4.1 Cilindros Físicos (Pasaporte Digital Unitario)
CREATE TABLE IF NOT EXISTS public.cilindros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_qr VARCHAR(60) UNIQUE NOT NULL,      -- Ej: 'SYS-2026-LPG-001' o 'GD-2024-00142'
  uuid_inmutable VARCHAR(64) UNIQUE NOT NULL, -- Hash o UUID público del pasaporte
  numero_serie_fabricacion VARCHAR(60) NOT NULL,
  capacidad public.capacidad_cilindro NOT NULL DEFAULT '10kg',
  empresa_duena_id UUID REFERENCES public.empresas_distribuidoras(id) ON DELETE SET NULL,
  planta_envasado_id UUID REFERENCES public.plantas_envasadoras(id) ON DELETE SET NULL,
  camion_actual_id UUID REFERENCES public.camiones_flota(id) ON DELETE SET NULL,
  cliente_actual_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  
  -- Pesos y calibración física (Sistema métrico)
  tara_calibrada_kg NUMERIC(6, 2) NOT NULL,   -- Tara vacía estampada (ej: 11.45 kg)
  peso_bruto_actual_kg NUMERIC(6, 2),        -- Con gas (ej: 21.45 kg)
  
  -- Estado y trazabilidad
  estado public.estado_cilindro NOT NULL DEFAULT 'en_planta',
  codigo_precinto_actual VARCHAR(40),        -- Precinto inviolable #PR-7721
  lote_envasado VARCHAR(40),
  
  -- Fechas normativas y certificaciones
  fecha_fabricacion DATE,
  fecha_ultimo_envasado TIMESTAMPTZ,
  fecha_ultima_prueba_hidrostatica DATE,     -- Prueba a 14.7 bar
  fecha_proxima_recalificacion DATE,         -- Vigencia por norma técnica
  norma_tecnica_certificada VARCHAR(60) DEFAULT 'ISO 4706 / NTP 350.011',
  
  -- Bloqueo de seguridad preventivo
  aprobado_calidad BOOLEAN NOT NULL DEFAULT true,
  motivo_bloqueo TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4.2 Historial Inmutable de Eventos del Balón (Auditoría para el escáner QR)
CREATE TABLE IF NOT EXISTS public.cilindros_trazabilidad (
  id BIGSERIAL PRIMARY KEY,
  cilindro_id UUID NOT NULL REFERENCES public.cilindros(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(80) NOT NULL, -- 'Llenado y Control de Tara', 'Prueba Hidrostática', 'Despacho', 'Entrega a Cliente'
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


-- ─── 5. PEDIDOS, DESPACHO EXPRESS Y PESAJE EN PUERTA ───

-- 5.1 Pedidos de Gas (Web, Móvil, WhatsApp)
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

-- 5.2 Detalle de Ítems del Pedido
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

-- 5.3 Certificación de Pesaje Digital en Puerta (IoT Balanza Bluetooth)
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

-- 5.4 Comprobantes de Pago Electrónicos (SUNAT)
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


-- ─── 6. B2B SOLICITUDES DE AFILIACIÓN (Landing Page Calculadora) ───
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


-- ─── 7. ÍNDICES DE RENDIMIENTO (QUERIES FRECUENTES) ───

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


-- ─── 8. TRIGGERS AUTOMÁTICOS & FUNCIONES ───

-- 8.1 Función genérica para actualizar columna `updated_at`
CREATE OR REPLACE FUNCTION public.actualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asignación de triggers de timestamp
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


-- ─── 9. ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACCESO ───

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

-- 9.1 Políticas Públicas Transparentes (Lectura libre sin login para verificar QR del balón)
CREATE POLICY "Lectura pública de pasaporte QR de cilindros"
ON public.cilindros FOR SELECT
USING (true);

CREATE POLICY "Lectura pública del historial de eventos de trazabilidad"
ON public.cilindros_trazabilidad FOR SELECT
USING (true);

CREATE POLICY "Lectura pública del catálogo de productos"
ON public.productos_catalogo FOR SELECT
USING (true);

-- 9.2 Políticas de Perfiles
CREATE POLICY "Lectura de perfiles de usuarios autenticados"
ON public.perfiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
ON public.perfiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 9.3 Políticas para Pedidos
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

-- 9.4 Solicitudes B2B de Afiliación
CREATE POLICY "Crear solicitud de afiliación pública"
ON public.solicitudes_afiliacion FOR INSERT
WITH CHECK (true);

CREATE POLICY "Ver solicitudes de afiliación administradores"
ON public.solicitudes_afiliacion FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE perfiles.id = auth.uid()
    AND perfiles.rol IN ('super_admin', 'empresa_admin')
  )
);


-- ─── 10. DATOS SEMILLA (SEED DATA REALISTA PARA PUNO) ───

-- 10.1 Catálogo Oficial
INSERT INTO public.productos_catalogo (capacidad, nombre_comercial, descripcion, dimensiones, tara_promedio_kg, peso_neto_gas_kg, precio_venta_pen)
VALUES
  ('5kg', 'Balón Portátil', 'Departamentos, campamentos, parrillas y espacios reducidos.', '38 cm alto × 23 cm ø', 6.20, 5.00, 28.50),
  ('10kg', 'Balón Familiar', 'El más elegido para hogares familiares, cocinas y pequeños negocios.', '62 cm alto × 30 cm ø', 11.50, 10.00, 48.00),
  ('45kg', 'Balón Industrial', 'Restaurantes, panaderías, hoteles y calderas de alta demanda.', '132 cm alto × 38 cm ø', 38.00, 45.00, 185.00)
ON CONFLICT (capacidad) DO UPDATE
SET
  precio_venta_pen = EXCLUDED.precio_venta_pen,
  dimensiones = EXCLUDED.dimensiones;

-- 10.2 Planta Envasadora en Puno
INSERT INTO public.plantas_envasadoras (codigo_planta, nombre, ubicacion, supervisor_responsable, licencia_osinergmin)
VALUES
  ('PL-PUNO-01', 'Planta Envasadora Central Puno · Bahía 04', 'Av. Sesquicentenario 1140, Puno', 'Ing. Carlos Morales · Lic. GLP-884', 'OSINERGMIN-GLP-2026-PUNO')
ON CONFLICT (codigo_planta) DO NOTHING;

-- 10.3 Empresa Distribuidora B2B
INSERT INTO public.empresas_distribuidoras (ruc, razon_social, nombre_comercial, ciudad, direccion, telefono_contacto, correo_contacto, volumen_estimado_mensual)
VALUES
  ('20608821941', 'DISTRIBUIDORA GAS DEL ALTIPLANO S.A.C.', 'SYSGAS Red Puno', 'Puno', 'Jr. Arequipa 520, Puno', '+51 951 667 696', 'contacto@sysgas.pe', 3500)
ON CONFLICT (ruc) DO NOTHING;

-- 10.4 Camión de Flota Demo
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

-- 10.5 Cilindros de Demostración con Códigos del Sistema (Coincidentes con la Demo del Frontend)
-- Cilindro 1: 'demo-001' (Balón Familiar 10 kg con trazabilidad completa)
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

-- Cilindro 3: Balón Industrial 45 kg
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
  'ISO 4706 / ASME Sección VIII'
) ON CONFLICT (codigo_qr) DO NOTHING;

-- 10.6 Trazabilidad Inmutable para 'demo-001' (Idéntico a BalloonHistory.jsx)
INSERT INTO public.cilindros_trazabilidad (cilindro_id, tipo_evento, descripcion, operador_nombre, planta_o_sede, icono_bootstrap, es_conforme, presion_prueba_bar, peso_registrado_kg, precinto_seguridad)
SELECT
  id,
  'Llenado y Control de Tara',
  'Carga computarizada de 10.00 kg netos de propano/butano. Báscula calibrada #B-04.',
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
  'Prueba de Presión Hidrostática',
  'Presión aplicada de 14.7 bar durante 60 segundos. Deformación permanente: 0.00%. APROBADO.',
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
  'Certificación de Calidad ISO 4706',
  'Inspección de cordón de soldadura por ultrasonido. Válvula de alivio calibrada a 24 bar.',
  'Supervisor ISO: T. Gómez · Acta #ISO-4706-9912',
  'Organismo de Acreditación',
  'bi-patch-check-fill',
  true,
  NULL,
  NULL,
  NULL
FROM public.cilindros WHERE codigo_qr = 'demo-001';

INSERT INTO public.cilindros_trazabilidad (cilindro_id, tipo_evento, descripcion, operador_nombre, planta_o_sede, icono_bootstrap, es_conforme, presion_prueba_bar, peso_registrado_kg, precinto_seguridad)
SELECT
  id,
  'Despacho y Carga a Vehículo',
  'Salida de planta en camión GLP-03 con precinto de seguridad #PR-7721.',
  'Despachador en Ruta: J. Pérez',
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
  'Telemetría en Vivo de Aproximación',
  'Vehículo a 850 metros del domicilio de destino en Puno. Hora estimada de llegada: 14:35.',
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
  'Jr. Deustua 428, Barrio Porteño',
  'A media cuadra del Lago Titicaca',
  -15.8389100,
  -70.0234000,
  'en_camino',
  8,
  48.00,
  'yape',
  'pendiente'
) ON CONFLICT (codigo_ticket) DO NOTHING;
