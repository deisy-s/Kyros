/*
 * ESP32-CAM - CAPTIVE PORTAL para KYROS
 * Configuración automática sin tocar código
 *
 * FLUJO:
 * 1. ESP32 verifica si tiene WiFi guardado en EEPROM
 * 2. Si NO → Crea red "KYROS-CAM-SETUP" + Captive Portal
 * 3. Usuario se conecta → Ingresa código + WiFi
 * 4. ESP32 valida código con servidor → Descarga config
 * 5. ESP32 guarda WiFi en EEPROM → Se reinicia
 * 6. ESP32 se conecta al WiFi → Inicia streaming
 *
 * DEPENDENCIAS (instalar desde Library Manager):
 * - ArduinoWebsockets (Gil Maimon)
 * - DNSServer (incluida en ESP32)
 * - EEPROM (incluida en ESP32)
 * - ArduinoJson (Benoit Blanchon)
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <EEPROM.h>
#include <ArduinoWebsockets.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

using namespace websockets;

// ============================================
// CONFIGURACIÓN DE PINES (AI THINKER ESP32-CAM)
// ============================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ============================================
// CONFIGURACIÓN DE EEPROM
// ============================================
#define EEPROM_SIZE 512
#define EEPROM_MAGIC 0xAB  // Marca para saber si EEPROM tiene datos válidos

struct WiFiConfig {
  char magic;                  // 0xAB si está configurado
  char ssid[32];              // WiFi SSID
  char password[64];          // WiFi Password
  char cameraId[25];          // MongoDB ObjectId (24 chars + null)
  char serverHost[40];        // IP del servidor (ej: 192.168.1.34)
  int  serverPort;            // Puerto del servidor (ej: 3000)
  char wsPath[20];            // Path del WebSocket (ej: /ws/camera)
};

WiFiConfig wifiConfig;
bool configured = false;

// ============================================
// SERVIDOR WEB (Captive Portal)
// ============================================
WebServer server(80);
DNSServer dnsServer;
const byte DNS_PORT = 53;

// ============================================
// WEBSOCKET CLIENT (para streaming)
// ============================================
WebsocketsClient wsClient;
bool registeredInBackend = false;

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32-CAM KYROS Captive Portal ===");

  // Inicializar EEPROM
  EEPROM.begin(EEPROM_SIZE);

  // ⚠️ BORRAR CONFIGURACIÓN (DESCOMENTAR SOLO PARA RESETEAR)
  // Serial.println("Borrando configuración del EEPROM...");
  // for (int i = 0; i < EEPROM_SIZE; i++) {
  //   EEPROM.write(i, 0);
  // }
  // EEPROM.commit();
  // Serial.println("EEPROM borrado. El ESP32 iniciará en modo Captive Portal.");
  // delay(2000);

  // Intentar leer configuración de EEPROM
  if (loadConfigFromEEPROM()) {
    Serial.println(" Configuración encontrada en EEPROM");
    Serial.printf("  WiFi: %s\n", wifiConfig.ssid);
    Serial.printf("  Cámara: %s\n", wifiConfig.cameraId);
    Serial.printf("  Servidor: %s:%d%s\n", wifiConfig.serverHost, wifiConfig.serverPort, wifiConfig.wsPath);

    // Inicializar cámara
    if (!initCamera()) {
      Serial.println("ERROR: Fallo al inicializar cámara. Reiniciando...");
      delay(5000);
      ESP.restart();
    }

    // Conectar a WiFi y empezar streaming
    connectToWiFiAndStream();

  } else {
    Serial.println("⚠ No hay configuración guardada");
    Serial.println("→ Iniciando Captive Portal...");

    // Inicializar cámara de todos modos (para probar que funciona)
    if (!initCamera()) {
      Serial.println("ERROR: Fallo al inicializar cámara. Reiniciando...");
      delay(5000);
      ESP.restart();
    }

    // Iniciar Captive Portal
    startCaptivePortal();
  }
}

// ============================================
// LOOP
// ============================================
void loop() {
  if (configured) {
    // Modo normal: streaming
    if (wsClient.available()) {
      wsClient.poll();
    } else {
      Serial.println("WebSocket desconectado. Reconectando...");
      delay(2000);
      connectToWebSocket();
      return;
    }

    // Enviar frame
    sendCameraFrame();
    delay(100);  // ~10 FPS

  } else {
    // Modo Captive Portal: manejar solicitudes HTTP
    dnsServer.processNextRequest();
    server.handleClient();
  }
}

// ============================================
// INICIALIZAR CÁMARA
// ============================================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;  // 640x480
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("ERROR: Cámara init falló: 0x%x\n", err);
    return false;
  }

  Serial.println("✓ Cámara inicializada");
  return true;
}

// ============================================
// LEER CONFIGURACIÓN DE EEPROM
// ============================================
bool loadConfigFromEEPROM() {
  EEPROM.get(0, wifiConfig);
  return (wifiConfig.magic == EEPROM_MAGIC);
}

// ============================================
// GUARDAR CONFIGURACIÓN EN EEPROM
// ============================================
void saveConfigToEEPROM() {
  wifiConfig.magic = EEPROM_MAGIC;
  EEPROM.put(0, wifiConfig);
  EEPROM.commit();
  Serial.println("✓ Configuración guardada en EEPROM");
}

// ============================================
// CAPTIVE PORTAL
// ============================================
void startCaptivePortal() {
  // Crear Access Point
  WiFi.mode(WIFI_AP);
  WiFi.softAP("KYROS-CAM-SETUP");  // Sin contraseña para fácil acceso
  Serial.println("✓ Access Point creado: KYROS-CAM-SETUP");
  Serial.print("  IP del portal: ");
  Serial.println(WiFi.softAPIP());

  // Iniciar DNS Server (redirige todo a nosotros)
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

  // Rutas HTTP
  server.on("/", HTTP_GET, handleRoot);
  server.on("/networks", HTTP_GET, handleNetworks);
  server.on("/save", HTTP_POST, handleSave);
  server.onNotFound(handleRoot);  // Captive portal redirect

  server.begin();
  Serial.println("✓ Servidor HTTP iniciado");
  Serial.println("\n→ Esperando configuración del usuario...");
}

// ============================================
// ESCANEAR REDES WIFI (Endpoint /networks)
// ============================================
void handleNetworks() {
  Serial.println("[Portal] Escaneando redes WiFi...");

  int n = WiFi.scanNetworks();

  String json = "[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"secure\":" + String(WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
    json += "}";
  }
  json += "]";

  Serial.printf("[Portal] Encontradas %d redes\n", n);
  server.send(200, "application/json", json);
  WiFi.scanDelete();
}

// ============================================
// PÁGINA PRINCIPAL DEL CAPTIVE PORTAL
// ============================================
void handleRoot() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KYROS - Configuración ESP32-CAM</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #667eea 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px 30px;
      max-width: 400px;
      width: 100%;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #555;
      font-weight: 600;
      font-size: 14px;
    }
    input, select {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 16px;
      transition: border-color 0.3s;
      background: white;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
    }
    button:active {
      transform: translateY(0);
    }
    .info {
      background: #f0f7ff;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 5px;
      font-size: 13px;
      color: #555;
    }
    .logo {
      text-align: center;
      font-size: 50px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>KYROS Setup</h1>
    <p class="subtitle">Configura tu ESP32-CAM</p>

    <div class="info">
      Obtén el <strong>código de activación</strong> desde la web de KYROS en la sección de Seguridad.
    </div>

    <form action="/save" method="POST">
      <div class="form-group">
        <label> Código de Activación</label>
        <input type="text" name="code" id="code" placeholder="Ej: AB3XY9" required pattern="[A-Z0-9]{6}" maxlength="6" style="text-transform: uppercase;" autocomplete="off">
      </div>

      <div class="form-group">
        <label>Selecciona tu red WiFi</label>
        <select name="ssid" id="ssid" required>
          <option value="">Cargando redes...</option>
        </select>
      </div>

      <div class="form-group">
        <label>Contraseña WiFi</label>
        <input type="password" name="password" id="password" placeholder="Contraseña de la red" required maxlength="63" autocomplete="current-password">
      </div>

      <button type="submit">Configurar ESP32-CAM</button>
    </form>

    <script>
      // Cargar redes WiFi disponibles
      window.addEventListener('load', function() {
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Escaneando redes...';

        fetch('/networks')
          .then(res => res.json())
          .then(networks => {
            const select = document.getElementById('ssid');
            select.innerHTML = '<option value="">-- Selecciona tu red --</option>';

            networks.forEach(net => {
              const option = document.createElement('option');
              option.value = net.ssid;
              const signal = net.rssi > -60 ? '' : net.rssi > -70 ? '' : '';
              const lock = net.secure ? '' : '';
              option.textContent = `${signal} ${lock} ${net.ssid}`;
              select.appendChild(option);
            });

            // Habilitar botón
            submitBtn.disabled = false;
            submitBtn.textContent = ' Configurar ESP32-CAM';

            // Focus en el código al cargar
            document.getElementById('code').focus();
          })
          .catch(err => {
            console.error('Error cargando redes:', err);
            const select = document.getElementById('ssid');
            select.innerHTML = '<option value="">Error al escanear</option>';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Configurar ESP32-CAM';
          });

        // Validar antes de enviar
        document.querySelector('form').addEventListener('submit', function(e) {
          const code = document.getElementById('code').value.trim();
          const ssid = document.getElementById('ssid').value;
          const password = document.getElementById('password').value;

          if (!code || !ssid || !password) {
            e.preventDefault();
            alert('Por favor completa todos los campos');
            return false;
          }

          if (code.length !== 6) {
            e.preventDefault();
            alert('El código debe tener 6 caracteres');
            return false;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = 'Configurando...';
        });
      });
    </script>
  </div>
</body>
</html>
)rawliteral";

  server.send(200, "text/html", html);
}

// ============================================
// GUARDAR CONFIGURACIÓN (Handler /save)
// ============================================
void handleSave() {
  // Debug: Mostrar todos los argumentos recibidos
  Serial.println("\n[Setup] DEBUG - Argumentos recibidos:");
  Serial.printf("  Número de args: %d\n", server.args());
  for (int i = 0; i < server.args(); i++) {
    Serial.printf("  [%d] %s = %s\n", i, server.argName(i).c_str(), server.arg(i).c_str());
  }

  String activationCode = server.arg("code");
  String ssid = server.arg("ssid");
  String password = server.arg("password");

  activationCode.toUpperCase();  // Convertir a mayúsculas
  activationCode.trim();
  ssid.trim();
  password.trim();

  Serial.println("\n[Setup] Configuración recibida:");
  Serial.printf("  Código: %s\n", activationCode.c_str());
  Serial.printf("  WiFi: %s\n", ssid.c_str());

  // Validar que no estén vacíos
  if (activationCode.length() == 0 || ssid.length() == 0 || password.length() == 0) {
    Serial.println("[Setup] ERROR: Datos vacíos");
    server.send(200, "text/html", "<html><body><h1>Error</h1><p>Por favor completa todos los campos.</p><a href='/'>Volver</a></body></html>");
    return;
  }

  // Conectar a WiFi para validar código
  Serial.println("[Setup] Conectando a WiFi para validar código...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n[Setup] ERROR: No se pudo conectar al WiFi");
    server.send(200, "text/html", "<html><body><h1>Error</h1><p>No se pudo conectar al WiFi. Verifica el nombre y contraseña.</p><a href='/'>Volver</a></body></html>");
    WiFi.mode(WIFI_AP);
    WiFi.softAP("KYROS-CAM-SETUP");
    return;
  }

  Serial.println("\n[Setup] ✓ WiFi conectado");
  Serial.printf("  IP: %s\n", WiFi.localIP().toString().c_str());

  // Preparar payload JSON
  String macAddress = WiFi.macAddress();
  StaticJsonDocument<200> doc;
  doc["activationCode"] = activationCode;
  doc["macAddress"] = macAddress;

  String jsonPayload;
  serializeJson(doc, jsonPayload);
  Serial.printf("[Setup] Payload JSON: %s\n", jsonPayload.c_str());

  // Intentar validar código con el backend
  // Primero intenta Render (HTTPS), luego localhost (HTTP)
  String serverUrls[] = {
    "https://kyros-app.onrender.com/api/esp/validate-activation-code",
    "http://192.168.1.34:3000/api/esp/validate-activation-code"
  };

  int httpCode = -1;
  HTTPClient http;
  String response = "";

  for (int i = 0; i < 2; i++) {
    if (i > 0) {
      Serial.println("[Setup] Esperando 2 segundos antes del siguiente intento...");
      delay(2000);
    }

    Serial.printf("[Setup] Intento #%d: %s\n", i+1, serverUrls[i].c_str());

    Serial.println("[Setup] Iniciando conexión HTTP...");
    if (!http.begin(serverUrls[i])) {
      Serial.println("[Setup] Error al iniciar HTTPClient");
      continue;
    }

    Serial.println("[Setup] Agregando headers...");
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(15000); // 15 segundos timeout
    http.setReuse(false); // No reusar conexión

    Serial.println("[Setup] Enviando POST request...");
    httpCode = http.POST(jsonPayload);
    Serial.printf("[Setup] Código HTTP recibido: %d\n", httpCode);

    if (httpCode < 0) {
      Serial.printf("[Setup] Error HTTPClient: %s\n", http.errorToString(httpCode).c_str());
    }

    if (httpCode == HTTP_CODE_OK || httpCode == 200) {
      response = http.getString();
      http.end();
      Serial.printf("[Setup] Servidor encontrado: %s\n", serverUrls[i].c_str());
      break;
    } else {
      Serial.printf("[Setup] Fallo con código %d, intentando siguiente...\n", httpCode);
      http.end();
    }
  }

  if (httpCode == HTTP_CODE_OK || httpCode == 200) {
    Serial.println("[Setup] Respuesta del servidor:");
    Serial.println(response);

    // Parsear respuesta
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error && responseDoc["success"] == true) {
      // Código válido! Guardar configuración
      const char* cameraId = responseDoc["config"]["cameraId"];
      const char* serverHost = responseDoc["config"]["server"]["host"];
      int serverPort = responseDoc["config"]["server"]["port"];
      const char* wsPath = responseDoc["config"]["server"]["wsPath"];

      strncpy(wifiConfig.ssid, ssid.c_str(), sizeof(wifiConfig.ssid) - 1);
      strncpy(wifiConfig.password, password.c_str(), sizeof(wifiConfig.password) - 1);
      strncpy(wifiConfig.cameraId, cameraId, sizeof(wifiConfig.cameraId) - 1);
      strncpy(wifiConfig.serverHost, serverHost, sizeof(wifiConfig.serverHost) - 1);
      wifiConfig.serverPort = serverPort;
      strncpy(wifiConfig.wsPath, wsPath, sizeof(wifiConfig.wsPath) - 1);

      saveConfigToEEPROM();

      Serial.println("\n[Setup] ¡Configuración completada!");
      Serial.println("[Setup] Reiniciando en 5 segundos...");

      server.send(200, "text/html", "<html><body style='font-family: Arial; text-align: center; padding: 50px;'><h1>¡Éxito!</h1><p>ESP32-CAM configurado correctamente.</p><p>Reiniciando... Verás el video en la web en unos segundos.</p></body></html>");

      delay(5000);
      ESP.restart();

    } else {
      Serial.println("[Setup] Código inválido o expirado");
      Serial.println(response);
      server.send(200, "text/html", "<html><body><h1>Error</h1><p>Código de activación inválido o ya usado.</p><a href='/'>Volver</a></body></html>");
    }
  } else {
    Serial.printf("[Setup] Error HTTP: %d\n", httpCode);

    if (httpCode > 0) {
      // Recibió respuesta del servidor pero con código de error
      String errorResponse = http.getString();
      Serial.printf("[Setup] Respuesta del servidor: %s\n", errorResponse.c_str());
    } else {
      // Error de conexión
      Serial.println("[Setup] Error de conexión HTTP (no se pudo alcanzar el servidor)");
      Serial.println("[Setup] Verifica que el servidor esté ejecutándose en http://192.168.1.34:3000");
    }

    server.send(200, "text/html", "<html><body><h1>Error</h1><p>No se pudo conectar con el servidor KYROS.</p><a href='/'>Volver</a></body></html>");
  }

  http.end();
}

// ============================================
// CONECTAR A WIFI Y EMPEZAR STREAMING
// ============================================
void connectToWiFiAndStream() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiConfig.ssid, wifiConfig.password);

  Serial.printf("Conectando a WiFi: %s\n", wifiConfig.ssid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nNo se pudo conectar al WiFi");
    Serial.println("Borrando configuración y reiniciando...");

    // Borrar EEPROM
    wifiConfig.magic = 0x00;
    EEPROM.put(0, wifiConfig);
    EEPROM.commit();

    delay(2000);
    ESP.restart();
  }

  Serial.println("\n✓ WiFi conectado");
  Serial.printf("  IP: %s\n", WiFi.localIP().toString().c_str());

  // Conectar WebSocket
  connectToWebSocket();

  configured = true;
}

// ============================================
// CONECTAR A WEBSOCKET
// ============================================
void connectToWebSocket() {
  String wsUrl = String("ws://") + wifiConfig.serverHost + ":" + wifiConfig.serverPort + wifiConfig.wsPath;

  Serial.printf("Conectando a WebSocket: %s\n", wsUrl.c_str());

  bool connected = wsClient.connect(wifiConfig.serverHost, wifiConfig.serverPort, wifiConfig.wsPath);

  if (connected) {
    Serial.println("✓ WebSocket conectado");

    // Registrarse como ESP32
    String registerMsg = "{\"type\":\"register_esp32\",\"cameraId\":\"" + String(wifiConfig.cameraId) + "\"}";
    wsClient.send(registerMsg);

    wsClient.onMessage([](WebsocketsMessage msg) {
      if (msg.data().indexOf("\"type\":\"registered\"") > 0 && msg.data().indexOf("\"success\":true") > 0) {
        registeredInBackend = true;
        Serial.println("✓ Registrado en KYROS!");
      }
    });

    delay(1000);
    wsClient.poll();

    if (registeredInBackend) {
      Serial.println("\n=== SISTEMA LISTO - Iniciando streaming ===\n");
    }

  } else {
    Serial.println("Error al conectar WebSocket");
  }
}

// ============================================
// ENVIAR FRAME DE CÁMARA
// ============================================
void sendCameraFrame() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("ERROR: Fallo al capturar frame");
    return;
  }

  wsClient.sendBinary((const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);
}