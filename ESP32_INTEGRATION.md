# Integración ESP32 - Sistema de Push Automático

## Resumen

El backend ahora envía **automáticamente** la configuración actualizada al ESP32 cuando:
- ✅ Se crea una nueva automatización
- ✅ Se actualiza una automatización existente
- ✅ Se activa/desactiva una automatización (toggle)

**No es necesario que el ESP32 haga polling constantemente** al iniciar. El backend le notificará los cambios.

---

## 🔌 Endpoint que debe implementar el ESP32

### `POST /update-config`

El ESP32 debe crear un servidor HTTP y escuchar en este endpoint para recibir actualizaciones del backend.

**URL completa**: `http://{ESP32_IP}/update-config`

### Ejemplo de solicitud POST recibida

```json
{
  "id": "673dcf39bef80e0ed02c1f04",
  "nombre": "Sala Principal",
  "ip": "192.168.1.100",
  "dispositivos": [
    {
      "id": "673dcf39bef80e0ed02c1f06",
      "nombre": "Foco LED",
      "pin": 5,
      "tipo": "luz"
    },
    {
      "id": "673dcf39bef80e0ed02c1f07",
      "nombre": "Sensor DHT22",
      "pin": 4,
      "tipo": "temperatura"
    },
    {
      "id": "673dcf39bef80e0ed02c1f08",
      "nombre": "Ventilador",
      "pin": 12,
      "tipo": "actuador"
    }
  ],
  "automatizaciones": [
    {
      "id": "auto123abc",
      "activa": true,
      "condicion": {
        "dispositivo_id": "673dcf39bef80e0ed02c1f07",
        "dispositivo_tipo": "temperatura",
        "valor": 30,
        "operador": ">"
      },
      "accion": {
        "dispositivo_id": "673dcf39bef80e0ed02c1f08",
        "comando": "ON"
      }
    },
    {
      "id": "auto456def",
      "activa": true,
      "condicion": {
        "dispositivo_id": "673dcf39bef80e0ed02c1f07",
        "dispositivo_tipo": "temperatura",
        "valor": 25,
        "operador": "<"
      },
      "accion": {
        "dispositivo_id": "673dcf39bef80e0ed02c1f08",
        "comando": "OFF"
      }
    }
  ]
}
```

### Respuesta esperada del ESP32

El ESP32 debe responder con código HTTP `200 OK` para confirmar que recibió la configuración.

```
HTTP/1.1 200 OK
Content-Type: text/plain

OK
```

---

## 📡 Estructura de Datos

### Tipos de Dispositivos

| `tipo` | Descripción |
|--------|-------------|
| `luz` | Foco/lámpara |
| `actuador` | Ventilador, relay genérico |
| `temperatura` | Sensor DHT22, DS18B20 |
| `humedad` | Sensor de humedad |
| `movimiento` | Sensor PIR |
| `gas` | Sensor MQ-2, MQ-135 |

### Operadores de Condiciones

| Backend | ESP32 | Significado |
|---------|-------|-------------|
| `mayor` | `>` | Mayor que |
| `menor` | `<` | Menor que |
| `mayor_igual` | `>=` | Mayor o igual |
| `menor_igual` | `<=` | Menor o igual |
| `igual` | `==` | Igual a |
| `diferente` | `!=` | Diferente de |

### Comandos de Acción

| Backend | ESP32 | Acción |
|---------|-------|--------|
| `encender` | `ON` | Encender dispositivo |
| `apagar` | `OFF` | Apagar dispositivo |

---

## 💻 Ejemplo de Código ESP32 (Arduino/C++)

### Servidor HTTP básico

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

WebServer server(80);

// Variables globales para almacenar configuración
struct Dispositivo {
  String id;
  String nombre;
  int pin;
  String tipo;
};

struct Automatizacion {
  String id;
  bool activa;
  String dispositivoSensorId;
  String dispositivoSensorTipo;
  float valorUmbral;
  String operador;
  String dispositivoAccionId;
  String comando;
};

std::vector<Dispositivo> dispositivos;
std::vector<Automatizacion> automatizaciones;

void handleUpdateConfig() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  String body = server.arg("plain");

  DynamicJsonDocument doc(8192);
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    Serial.println("[ERROR] JSON inválido recibido");
    server.send(400, "text/plain", "Bad Request");
    return;
  }

  // Limpiar configuración anterior
  dispositivos.clear();
  automatizaciones.clear();

  // Parsear dispositivos
  JsonArray devicesArray = doc["dispositivos"].as<JsonArray>();
  for (JsonObject device : devicesArray) {
    Dispositivo d;
    d.id = device["id"].as<String>();
    d.nombre = device["nombre"].as<String>();
    d.pin = device["pin"].as<int>();
    d.tipo = device["tipo"].as<String>();
    dispositivos.push_back(d);

    // Configurar pin como salida si es actuador/luz
    if (d.tipo == "luz" || d.tipo == "actuador") {
      pinMode(d.pin, OUTPUT);
    }
  }

  // Parsear automatizaciones
  JsonArray autoArray = doc["automatizaciones"].as<JsonArray>();
  for (JsonObject auto : autoArray) {
    Automatizacion a;
    a.id = auto["id"].as<String>();
    a.activa = auto["activa"].as<bool>();

    if (auto.containsKey("condicion")) {
      a.dispositivoSensorId = auto["condicion"]["dispositivo_id"].as<String>();
      a.dispositivoSensorTipo = auto["condicion"]["dispositivo_tipo"].as<String>();
      a.valorUmbral = auto["condicion"]["valor"].as<float>();
      a.operador = auto["condicion"]["operador"].as<String>();
    }

    if (auto.containsKey("accion")) {
      a.dispositivoAccionId = auto["accion"]["dispositivo_id"].as<String>();
      a.comando = auto["accion"]["comando"].as<String>();
    }

    automatizaciones.push_back(a);
  }

  Serial.println("[✓] Configuración actualizada desde backend");
  Serial.printf("   - Dispositivos: %d\n", dispositivos.size());
  Serial.printf("   - Automatizaciones: %d\n", automatizaciones.size());

  server.send(200, "text/plain", "OK");
}

void setup() {
  Serial.begin(115200);

  // Conectar a WiFi
  WiFi.begin("TU_SSID", "TU_PASSWORD");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Configurar rutas del servidor
  server.on("/update-config", handleUpdateConfig);
  server.on("/control", handleControl); // Endpoint para recibir comandos del backend

  server.begin();
  Serial.println("Servidor HTTP iniciado");
}

void loop() {
  server.handleClient();

  // Evaluar automatizaciones localmente
  evaluarAutomatizaciones();

  delay(1000);
}

void evaluarAutomatizaciones() {
  for (const auto& regla : automatizaciones) {
    if (!regla.activa) continue;

    // Leer valor del sensor
    float valorSensor = leerSensor(regla.dispositivoSensorId, regla.dispositivoSensorTipo);

    // Evaluar condición
    bool cumple = false;
    if (regla.operador == ">") cumple = valorSensor > regla.valorUmbral;
    else if (regla.operador == "<") cumple = valorSensor < regla.valorUmbral;
    else if (regla.operador == ">=") cumple = valorSensor >= regla.valorUmbral;
    else if (regla.operador == "<=") cumple = valorSensor <= regla.valorUmbral;
    else if (regla.operador == "==") cumple = (valorSensor == regla.valorUmbral);

    if (cumple) {
      // Ejecutar acción
      ejecutarAccion(regla.dispositivoAccionId, regla.comando);
    }
  }
}

float leerSensor(String id, String tipo) {
  // Implementar lectura según tipo de sensor
  // Esta es solo una plantilla
  for (const auto& disp : dispositivos) {
    if (disp.id == id) {
      if (tipo == "temperatura") {
        // return dht.readTemperature();
      } else if (tipo == "humedad") {
        // return dht.readHumidity();
      }
    }
  }
  return 0.0;
}

void ejecutarAccion(String dispositivoId, String comando) {
  for (const auto& disp : dispositivos) {
    if (disp.id == dispositivoId) {
      if (comando == "ON") {
        digitalWrite(disp.pin, HIGH);
        Serial.printf("[Acción] %s encendido (pin %d)\n", disp.nombre.c_str(), disp.pin);
      } else if (comando == "OFF") {
        digitalWrite(disp.pin, LOW);
        Serial.printf("[Acción] %s apagado (pin %d)\n", disp.nombre.c_str(), disp.pin);
      }
    }
  }
}

void handleControl() {
  // Endpoint para recibir comandos manuales desde el backend
  String dispositivoId = server.arg("dispositivo");
  String comando = server.arg("comando");

  ejecutarAccion(dispositivoId, comando);
  server.send(200, "text/plain", "OK");
}
```

---

## 🔄 Flujo Completo

### 1. Usuario crea/actualiza automatización en la web
```
Usuario → Web Frontend → POST /api/automatize
```

### 2. Backend guarda en MongoDB
```
Backend → MongoDB (guarda automatización)
```

### 3. Backend envía push al ESP32 (AUTOMÁTICO)
```
Backend → POST http://{ESP32_IP}/update-config
```

### 4. ESP32 recibe y actualiza su configuración local
```
ESP32 → Parsea JSON → Actualiza variables locales
```

### 5. ESP32 evalúa reglas localmente
```
ESP32 → Lee sensores → Evalúa condiciones → Ejecuta acciones
```

---

## ⏱️ Ventajas del Sistema de Push

✅ **Actualización instantánea**: No hay delay de polling
✅ **Menor consumo de red**: Solo se envían datos cuando hay cambios
✅ **Inicio más rápido**: El ESP32 no necesita esperar para hacer polling al arrancar
✅ **Menos carga en el servidor**: No hay requests constantes de polling

---

## 🛠️ Configuración Inicial del ESP32

Al arrancar por primera vez, el ESP32 puede opcionalmente hacer **una sola consulta** al endpoint GET para obtener la configuración inicial:

```cpp
void obtenerConfiguracionInicial(String habitacionId) {
  HTTPClient http;
  String url = "http://TU_SERVIDOR:3000/api/esp/esp-config/" + habitacionId;

  http.begin(url);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    // Parsear payload igual que en handleUpdateConfig()
    Serial.println("[✓] Configuración inicial obtenida");
  }

  http.end();
}
```

Después de esto, todas las actualizaciones llegarán automáticamente vía push.

---

## 📝 Notas Importantes

1. **IP del ESP32**: Debe estar configurada en la habitación de MongoDB (campo `ip` en modelo `Room`)
2. **Timeout**: El backend espera 5 segundos para que el ESP32 responda
3. **Error handling**: Si el ESP32 no responde, el backend registra el error en consola pero NO falla la operación
4. **Múltiples habitaciones**: Si una automatización afecta dispositivos en diferentes habitaciones, se notifica a todos los ESP32 involucrados

---

## 🔍 Logs del Backend

Cuando se envía una actualización, verás en la consola del servidor:

```
[Push] Notificando ESP32s de actualización de automatización 673dcf39bef80e0ed02c1f09
[Push] Habitaciones afectadas: 673dcf39bef80e0ed02c1f04
[Push] ✅ ESP32 Sala Principal (192.168.1.100) actualizado correctamente
```

Si hay error:
```
[Push] ❌ Error conectando a ESP32 Sala Principal (192.168.1.100): connect ETIMEDOUT
```

---

## 🚀 Próximos Pasos

1. Implementar el endpoint `POST /update-config` en el ESP32
2. Implementar el endpoint `GET /control` para recibir comandos del backend
3. Configurar la IP del ESP32 en la base de datos (campo `ip` en habitación)
4. Probar creando/actualizando automatizaciones desde la web
5. Verificar en el monitor serial del ESP32 que llegan las actualizaciones

---

¿Necesitas ayuda con alguna parte de la implementación? Contacta al equipo de backend.
