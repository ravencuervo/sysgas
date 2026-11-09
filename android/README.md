# SYSGAS Móvil · Aplicación Android Nativa en Kotlin

Aplicación móvil nativa en **Kotlin 2.0+** y **Jetpack Compose (Material 3)** para usuarios finales y hogares de **Puno y Juliaca (3,812 msnm)** para solicitar balones de gas GLP (5 kg, 10 kg, 45 kg) con **garantía de pesaje digital en puerta**, **trazabilidad por pasaporte QR** y **seguimiento en vivo por GPS**.

---

## 🚀 Arquitectura y Tecnologías

- **Lenguaje:** Kotlin 2.0.21
- **UI Toolkit:** Jetpack Compose 1.7+ & Material 3 (100% declarativo, sin XML legacy)
- **Patrón:** Clean Architecture + MVVM + UDF (Unidirectional Data Flow)
- **Backend & Realtime:** Supabase Kotlin SDK 3.0.2 (`supabase-kt`)
  - PostgREST (Catálogo de productos y pedidos)
  - Realtime WebSockets (Telemetría y ubicación GPS de camiones)
  - Auth & Storage
- **Conectividad IoT:** Soporte Bluetooth BLE para balanzas electrónicas en puerta
- **Cámara & Escáner:** CameraX 1.4.0 para pasaportes QR de cilindros
- **Paleta de Identidad Visual:**
  - Jade Primario: `#00A878`
  - Deepest Jade: `#062118`
  - Mint Suave: `#E8F5EE`
  - Gas Blue (Balones): `#0066A2`
  - Perno / Válvula Dorada: `#D4AF37`

---

## 📱 Pantallas y Flujos de Usuario

1. **Catálogo & Inicio (`HomeScreen.kt`)**:
   - Selector interactivo de balones de **5 kg** (Portátil), **10 kg** (Familiar, más pedido) y **45 kg** (Industrial) con dimensiones oficiales calibradas (38 cm × 23 cm, 62 cm × 30 cm, 132 cm × 38 cm).
   - Selector de cantidad y precio oficial en Soles (PEN).
   - Sellos de confianza y cobertura en Puno, Juliaca e Ilave.

2. **Checkout & Confirmación (`CheckoutScreen.kt`)**:
   - Dirección de entrega con selector de ciudad (Puno / Juliaca) y referencias locales (ej. Jr. Arequipa 520, frente al Colegio San Carlos).
   - Nombre y teléfono celular de contacto (+51 951 667 696).
   - Métodos de pago populares: **Yape**, **Plin**, **Efectivo contra entrega**, **Tarjeta POS**.
   - Emisión de ticket numerado (`TK-2026-XXXXX`).

3. **Seguimiento GPS en Tiempo Real (`OrderTrackingScreen.kt`)**:
   - Mapa con ruta en vivo del camión repartidor hacia el domicilio.
   - Telemetría en tiempo real: ETA en minutos, distancia restante (km), velocidad actual.
   - Datos del repartidor certificado (Ramiro Quispe Condori), placa (`V8X-721`), y botones de llamada directa y WhatsApp.

4. **Pesaje Digital en Puerta (`CustomerWeightScreen.kt`)**:
   - Vinculación con balanza Bluetooth del repartidor (`SYSGAS-SCALE-BT04`).
   - Display digital LCD de alta precisión mostrando Peso Bruto, Tara del cilindro y Gas Neto real (garantía de 10.00 kg).
   - Emisión y almacenamiento de comprobante de pesaje certificado.

5. **Pasaporte Digital QR (`PassportScannerScreen.kt`)**:
   - Escáner con retícula y láser para inspeccionar el QR del cilindro.
   - Consulta técnica: Tara oficial, prueba hidrostática (14.7 bar), fecha de vigencia (5 años), lote de llenado y precinto inviolable.

6. **Historial de Pedidos (`OrderHistoryScreen.kt`)**:
   - Registro de pedidos anteriores con comprobante de pesaje y botón de re-orden en 1 toque.

---

## 🛠️ Cómo compilar y generar el APK

### Opción A: Desde Android Studio
1. Abre **Android Studio** (Koala, Ladybug o superior).
2. Selecciona **Open** y navega a la carpeta `android/` de este repositorio.
3. Espera a que Gradle sincronice las dependencias del `libs.versions.toml`.
4. Conecta un dispositivo físico Android o inicia un emulador con Google Play Services (API 26 a 35).
5. Presiona **Run 'app'** (`Shift + F10`) o ve a **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
6. El APK compilado se generará en:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Opción B: Desde la Línea de Comandos (con JDK 17+ instalado)
```bash
cd android
./gradlew assembleDebug
```
Para release firmado:
```bash
./gradlew assembleRelease
```

---

## 🔐 Configuración de Supabase

El cliente de Supabase se inicializa en `core/network/SupabaseClientProvider.kt`. Las credenciales públicas anon se configuran en `app/build.gradle.kts`:
- **URL:** `https://tsegodcutcgchvyurvik.supabase.co`
- **Key:** Public Anon Key del proyecto SYSGAS.

