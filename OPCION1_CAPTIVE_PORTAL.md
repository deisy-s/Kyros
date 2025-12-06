# Opción 1: Captive Portal WiFi (Implementación Futura)

## 🎯 Descripción

Sistema de configuración profesional donde el ESP32-CAM crea su propia red WiFi temporal para que el usuario configure las credenciales desde su celular.

## 📋 Flujo de Usuario

1. **Usuario enchufa ESP32-CAM nuevo**
2. **ESP32 detecta** que no tiene configuración WiFi guardada
3. **ESP32 crea red WiFi temporal:** `KYROS-CAM-XXXX` (sin contraseña)
4. **Usuario se conecta** desde su celular a esa red
5. **Se abre portal web automáticamente** (captive portal)
6. **Usuario completa formulario:**
   - WiFi de su casa (SSID)
   - Contraseña WiFi
   - Código de activación (del sitio web)
7. **ESP32 valida código** con el servidor
8. **ESP32 descarga configuración** completa (cameraId, server IP, etc.)
9. **ESP32 guarda todo en EEPROM** y se reinicia
10. **ESP32 se conecta al WiFi** de casa y empieza a transmitir

## 🔧 Ventajas vs Opción 2

| Característica | Opción 1 (Captive Portal) | Opción 2 (Web Config) |
|----------------|---------------------------|----------------------|
| **UX** | ⭐⭐⭐⭐⭐ Profesional | ⭐⭐⭐ Simple |
| **Seguridad** | ⭐⭐⭐⭐ Sin exponer WiFi en DB | ⭐⭐⭐ Contraseña en DB |
| **Instalación** | ⭐⭐⭐⭐⭐ Plug & Play total | ⭐⭐⭐⭐ Pre-configurado |
| **Complejidad** | ⭐⭐ Alta | ⭐⭐⭐⭐ Baja |
| **Cambio WiFi** | ⭐⭐⭐⭐⭐ Resetear y reconfigurar | ⭐⭐⭐ Editar en web |

## 🛠️ Requerimientos Técnicos

### Backend (Node.js)

**Nuevo endpoint:**
```javascript
POST /api/esp/validate-activation-code
{
  "activationCode": "ABC123",
  "macAddress": "AA:BB:CC:DD:EE:FF"
}

Respuesta:
{
  "success": true,
  "cameraId": "6756...",
  "serverHost": "192.168.1.100",
  "serverPort": 3000
}
```

**Modificaciones en Camera.js:**
```javascript
activationCode: {
  type: String,
  default: () => Math.random().toString(36).substring(2, 8).toUpperCase(),
  unique: true
},
activationCodeUsed: {
  type: Boolean,
  default: false
}
```

### ESP32-CAM

**Librerías adicionales:**
- `WiFiManager` by tzapu
- `DNSServer` (incluida en ESP32)
- `EEPROM` (para persistencia)

**Lógica principal:**
```cpp
void setup() {
  // Intentar leer WiFi de EEPROM
  if (loadWiFiFromEEPROM()) {
    // Ya configurado, conectar y arrancar
    connectToWiFiAndStart();
  } else {
    // Primera vez, abrir captive portal
    startCaptivePortal();
  }
}

void startCaptivePortal() {
  WiFi.softAP("KYROS-CAM-SETUP");
  DNSServer dnsServer;
  WebServer server(80);

  // Servidor web que muestra formulario
  server.on("/", handleRoot);
  server.on("/save", handleSave);

  // Captive portal
  dnsServer.start(53, "*", WiFi.softAPIP());

  while (!configured) {
    dnsServer.processNextRequest();
    server.handleClient();
  }
}

void handleSave() {
  String ssid = server.arg("ssid");
  String password = server.arg("password");
  String activationCode = server.arg("code");

  // Validar código con servidor
  if (validateActivationCode(activationCode)) {
    saveToEEPROM(ssid, password, cameraId);
    ESP.restart();
  }
}
```

### Frontend (security.html)

**Modificar formulario de creación:**
```html
<div class="alert alert-success">
  <strong>Código de Activación:</strong>
  <code style="font-size: 20px;">AB3XY9</code>
  <button onclick="copyActivationCode()">📋 Copiar</button>

  <p class="mt-2">
    Ingresa este código en el portal WiFi del ESP32
  </p>
</div>
```

**Flujo visual:**
```
1. [Crear Cámara] → Se genera código: AB3XY9
2. [Mostrar QR Code] con el código
3. Usuario escanea QR o anota código
4. Usuario conecta ESP32
5. Usuario se conecta a "KYROS-CAM-SETUP"
6. Ingresa código + WiFi
7. ✅ Listo
```

## 📱 Interfaz del Captive Portal (ESP32)

```html
<!DOCTYPE html>
<html>
<head>
  <title>KYROS Setup</title>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; }
    input { width: 80%; padding: 10px; margin: 10px; font-size: 16px; }
    button { padding: 15px 30px; font-size: 18px; }
  </style>
</head>
<body>
  <h1>🏠 KYROS Camera Setup</h1>

  <form action="/save" method="POST">
    <input type="text" name="ssid" placeholder="Nombre de tu WiFi" required>
    <input type="password" name="password" placeholder="Contraseña WiFi" required>
    <input type="text" name="code" placeholder="Código de Activación" required pattern="[A-Z0-9]{6}">
    <button type="submit">✅ Configurar</button>
  </form>

  <p>Obtén tu código en: http://kyros.local/security</p>
</body>
</html>
```

## 🔐 Seguridad

### Opción 2 (Actual)
- ⚠️ Contraseña WiFi se almacena en MongoDB
- ⚠️ Se envía por HTTP al ESP32
- ✅ Solo accesible por usuario autenticado

### Opción 1 (Futura)
- ✅ Contraseña WiFi NUNCA se almacena en servidor
- ✅ Código de activación de un solo uso
- ✅ Código expira después de 24 horas
- ✅ Cada ESP32 solo puede usar el código una vez

## 📊 Comparación de Flujos

### Opción 2 (Implementada) - 4 pasos
```
1. Usuario crea cámara en web
2. Usuario ingresa WiFi en web
3. Usuario enciende ESP32
4. ✅ ESP32 descarga todo y funciona
```

### Opción 1 (Futura) - 5 pasos
```
1. Usuario crea cámara en web → obtiene código AB3XY9
2. Usuario enciende ESP32
3. Usuario se conecta a "KYROS-CAM-SETUP"
4. Usuario ingresa WiFi + código
5. ✅ ESP32 se configura solo
```

## 🚀 Plan de Migración

1. **Mantener Opción 2** como método legacy
2. **Agregar Opción 1** como método preferido
3. **Detectar automáticamente:**
   - Si cámara tiene `wifiConfig` → usar Opción 2
   - Si cámara tiene `activationCode` → usar Opción 1
4. **UI adaptativa:**
   - Mostrar campos WiFi O código de activación según preferencia del usuario

## 📝 Notas de Implementación

- Compatible con ambas opciones al mismo tiempo
- No requiere cambios en WebSocket server
- No requiere cambios en streaming
- Solo agrega capa de configuración inicial

---

**Última actualización:** 2025-12-04
**Estado:** Documentación de referencia
**Prioridad:** Media (implementar después de validar Opción 2)
