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
      "id": "foco_led_sala",
      "nombre": "Foco LED",
      "pin": 5,
      "tipo": "actuador",
      "subtipo": "luz"
    },
    {
      "id": "sensor_temp_sala",
      "nombre": "Sensor DHT22",
      "pin": 4,
      "tipo": "temperatura",
      "subtipo": null
    },
    {
      "id": "ventilador_sala",
      "nombre": "Ventilador",
      "pin": 12,
      "tipo": "actuador",
      "subtipo": "ventilador"
    },
    {
      "id": "sensor_luz_sala",
      "nombre": "Fotoresistor",
      "pin": 34,
      "tipo": "luz",
      "subtipo": null
    }
  ],
  "automatizaciones": [
    {
      "id": "auto_ventilador_on",
      "activa": true,
      "condicion": {
        "dispositivo_id": "sensor_temp_sala",
        "dispositivo_tipo": "temperatura",
        "valor": 28,
        "operador": ">"
      },
      "accion": {
        "dispositivo_id": "ventilador_sala",
        "comando": "ON"
      }
    },
    {
      "id": "auto_ventilador_off",
      "activa": true,
      "condicion": null,
      "accion": {
        "dispositivo_id": "ventilador_sala",
        "comando": "OFF"
      },
      "parametros": {
        "temperaturaApagar": 25
      }
    },
    {
      "id": "auto_luz_sensor",
      "activa": true,
      "condicion": {
        "dispositivo_id": "sensor_luz_sala",
        "dispositivo_tipo": "luz",
        "valor": 2000,
        "operador": ">"
      },
      "accion": {
        "dispositivo_id": "foco_led_sala",
        "comando": "ON"
      },
      "parametros": {
        "usarSensorLuz": true
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

| `tipo` | `subtipo` | Descripción |
|--------|-----------|-------------|
| `luz` | - | Sensor de luz (LDR, fotoresistor) |
| `actuador` | `luz` | Foco/lámpara controlable |
| `actuador` | `ventilador` | Ventilador, extractor |
| `actuador` | `alarma` | Sirena, buzzer |
| `actuador` | `null` | Relay genérico (legacy) |
| `temperatura` | - | Sensor DHT22, DS18B20 |
| `humedad` | - | Sensor de humedad |
| `movimiento` | - | Sensor PIR |
| `gas` | - | Sensor MQ-2, MQ-135 |

**IMPORTANTE**: Los actuadores ahora incluyen un campo `subtipo` opcional para diferenciar el propósito del dispositivo. Dispositivos antiguos sin `subtipo` se consideran genéricos.

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

## 🆕 Automatizaciones con Sensores (ACTUALIZACIÓN 2025)

### Caso 1: Actuador Luz con Sensor de Luz Compartido

Cuando un foco se enciende/apaga basándose en un sensor de luz, **el mismo sensor se usa para ambas condiciones**.

**Estructura de datos**:
```json
{
  "id": "auto_luz_001",
  "activa": true,
  "condicion": {
    "dispositivo_id": "sensor_luz_sala",
    "dispositivo_tipo": "luz",
    "valor": 2000,
    "operador": ">"
  },
  "accion": {
    "dispositivo_id": "foco_sala",
    "comando": "ON"
  },
  "parametros": {
    "usarSensorLuz": true
  }
}
```

**Interpretación para ESP32** (⚠️ Lógica Inversa):
- **Encendido**: Cuando `sensor_luz_sala > 2000` (oscuridad - lectura alta) → Encender `foco_sala`
- **Apagado**: Cuando `sensor_luz_sala <= 2000` (hay luz - lectura baja/0) → Apagar `foco_sala`
- El flag `usarSensorLuz: true` indica que se debe apagar con el mismo sensor
- **Nota**: El LDR tiene lógica inversa (0=luz, 4095=oscuridad) y está saturado dando solo valores extremos

**Pseudocódigo ESP32** (⚠️ Lógica Inversa):
```cpp
// IMPORTANTE: El LDR tiene lógica inversa (valores altos = oscuridad)
int lecturaLuz = analogRead(PIN_LDR);  // 0 (luz) o 4095 (oscuridad)

if (lecturaLuz > 2000 && focoApagado) {
    digitalWrite(PIN_FOCO, HIGH); // Encender (hay oscuridad)
} else if (lecturaLuz <= 2000 && focoEncendido) {
    digitalWrite(PIN_FOCO, LOW);  // Apagar (hay luz)
}
```

---

### Caso 2: Actuador Ventilador con Sensor de Temperatura

Cuando un ventilador se controla por temperatura, debe recibir **dos automatizaciones**: una para encender y otra opcional para apagar.

**Estructura de datos (Encendido)**:
```json
{
  "id": "auto_vent_on",
  "activa": true,
  "condicion": {
    "dispositivo_id": "sensor_temp_habitacion",
    "dispositivo_tipo": "temperatura",
    "valor": 28,
    "operador": ">"
  },
  "accion": {
    "dispositivo_id": "ventilador_habitacion",
    "comando": "ON"
  }
}
```

**Estructura de datos (Apagado - opcional)**:
```json
{
  "id": "auto_vent_off",
  "activa": true,
  "condicion": null,
  "accion": {
    "dispositivo_id": "ventilador_habitacion",
    "comando": "OFF"
  },
  "parametros": {
    "temperaturaApagar": 25
  }
}
```

**Interpretación para ESP32**:
- **Encendido**: Cuando `sensor_temp_habitacion > 28°C` → Encender ventilador
- **Apagado**: Cuando `sensor_temp_habitacion <= 25°C` → Apagar ventilador (si existe `parametros.temperaturaApagar`)

**Pseudocódigo ESP32**:
```cpp
if (temperatura > 28 && ventiladorApagado) {
    digitalWrite(PIN_VENTILADOR, HIGH); // Encender
}

// Si existe temperaturaApagar
if (temperaturaApagar != null && temperatura <= 25 && ventiladorEncendido) {
    digitalWrite(PIN_VENTILADOR, LOW);  // Apagar
}
```

**NOTA**: El mismo sensor de temperatura se usa para ambas condiciones (encender y apagar).

---

### Caso 3: Actuador Alarma con Sensores de Movimiento o Gas

Las alarmas pueden dispararse por múltiples tipos de sensores.

**Estructura con Sensor de Gas**:
```json
{
  "id": "auto_alarma_gas",
  "activa": true,
  "condicion": {
    "dispositivo_id": "sensor_gas_cocina",
    "dispositivo_tipo": "gas",
    "valor": 800,
    "operador": ">"
  },
  "accion": {
    "dispositivo_id": "sirena_cocina",
    "comando": "ON"
  },
  "parametros": {
    "duracionSegundos": 30
  }
}
```

**Estructura con Sensor de Movimiento**:
```json
{
  "id": "auto_alarma_movimiento",
  "activa": true,
  "condicion": {
    "dispositivo_id": "sensor_pir_entrada",
    "dispositivo_tipo": "movimiento",
    "valor": true,
    "operador": "=="
  },
  "accion": {
    "dispositivo_id": "sirena_entrada",
    "comando": "ON"
  },
  "parametros": {
    "duracionSegundos": 60,
    "rangoInicio": "22:00",
    "rangoFin": "06:00"
  }
}
```

**Interpretación para ESP32**:
- **Gas**: Si nivel de gas > 800 ppm → Sonar alarma por 30 segundos
- **Movimiento**: Si se detecta movimiento entre 22:00-06:00 → Sonar alarma por 60 segundos

**Pseudocódigo ESP32**:
```cpp
// Para alarma con temporizador
if (condicionCumplida && alarmaInactiva) {
    digitalWrite(PIN_ALARMA, HIGH);
    tiempoInicio = millis();
}

if (alarmaActiva && (millis() - tiempoInicio >= duracionSegundos * 1000)) {
    digitalWrite(PIN_ALARMA, LOW);
}

// Para alarma con rango horario
if (horaActual >= rangoInicio && horaActual <= rangoFin && condicionCumplida) {
    digitalWrite(PIN_ALARMA, HIGH);
}
```

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
  String subtipo;  // NUEVO: luz, ventilador, alarma (solo para actuadores)
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

  // NUEVO: Parámetros adicionales
  bool usarSensorLuz;           // Para luces: usar mismo sensor para apagar
  float temperaturaApagar;      // Para ventiladores: temp de apagado
  int duracionSegundos;         // Para alarmas: duración de activación
  String rangoInicio;           // Para alarmas: hora inicio rango
  String rangoFin;              // Para alarmas: hora fin rango
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
    d.subtipo = device["subtipo"].as<String>();  // NUEVO
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

    // Inicializar parámetros opcionales
    a.usarSensorLuz = false;
    a.temperaturaApagar = 0;
    a.duracionSegundos = 0;
    a.rangoInicio = "";
    a.rangoFin = "";

    if (auto.containsKey("condicion") && !auto["condicion"].isNull()) {
      a.dispositivoSensorId = auto["condicion"]["dispositivo_id"].as<String>();
      a.dispositivoSensorTipo = auto["condicion"]["dispositivo_tipo"].as<String>();
      a.valorUmbral = auto["condicion"]["valor"].as<float>();
      a.operador = auto["condicion"]["operador"].as<String>();
    }

    if (auto.containsKey("accion")) {
      a.dispositivoAccionId = auto["accion"]["dispositivo_id"].as<String>();
      a.comando = auto["accion"]["comando"].as<String>();
    }

    // NUEVO: Parsear parámetros adicionales
    if (auto.containsKey("parametros")) {
      JsonObject params = auto["parametros"];
      if (params.containsKey("usarSensorLuz")) {
        a.usarSensorLuz = params["usarSensorLuz"].as<bool>();
      }
      if (params.containsKey("temperaturaApagar")) {
        a.temperaturaApagar = params["temperaturaApagar"].as<float>();
      }
      if (params.containsKey("duracionSegundos")) {
        a.duracionSegundos = params["duracionSegundos"].as<int>();
      }
      if (params.containsKey("rangoInicio")) {
        a.rangoInicio = params["rangoInicio"].as<String>();
      }
      if (params.containsKey("rangoFin")) {
        a.rangoFin = params["rangoFin"].as<String>();
      }
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

    // CASO ESPECIAL: Luz con sensor compartido
    if (regla.usarSensorLuz && regla.dispositivoSensorTipo == "luz") {
      float lecturaLuz = leerSensor(regla.dispositivoSensorId, "luz");
      bool dispositivoEncendido = estaEncendido(regla.dispositivoAccionId);

      // ⚠️ LÓGICA INVERSA: valores ALTOS = oscuridad, valores BAJOS = luz
      // Encender si hay oscuridad (lectura ALTA) y está apagado
      if (lecturaLuz > regla.valorUmbral && !dispositivoEncendido) {
        ejecutarAccion(regla.dispositivoAccionId, "ON");
      }
      // Apagar si hay luz (lectura BAJA) y está encendido
      else if (lecturaLuz <= regla.valorUmbral && dispositivoEncendido) {
        ejecutarAccion(regla.dispositivoAccionId, "OFF");
      }
      continue;
    }

    // CASO ESPECIAL: Ventilador con temperatura de apagado
    if (regla.temperaturaApagar > 0 && regla.comando == "OFF") {
      float temperatura = leerSensor(regla.dispositivoSensorId, "temperatura");
      bool dispositivoEncendido = estaEncendido(regla.dispositivoAccionId);

      if (temperatura <= regla.temperaturaApagar && dispositivoEncendido) {
        ejecutarAccion(regla.dispositivoAccionId, "OFF");
      }
      continue;
    }

    // CASO NORMAL: Evaluar condición estándar
    if (!regla.dispositivoSensorId.isEmpty()) {
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

        // Si es alarma con duración, programar apagado
        if (regla.duracionSegundos > 0) {
          // Implementar lógica de temporizador según necesidad
          // Ejemplo: usar un timer o AsyncDelay
        }
      }
    }
  }
}

// NUEVA FUNCIÓN: Verificar si un dispositivo está encendido
bool estaEncendido(String dispositivoId) {
  for (const auto& disp : dispositivos) {
    if (disp.id == dispositivoId) {
      return digitalRead(disp.pin) == HIGH;
    }
  }
  return false;
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

## 📋 Resumen de Cambios (Actualización 2025)

### ✅ Nuevos Campos en Dispositivos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `subtipo` | String | ❌ | Diferencia actuadores: `luz`, `ventilador`, `alarma` |

**Impacto**:
- Dispositivos antiguos tendrán `subtipo: null` (funcionarán normalmente)
- El ESP32 debe leer este campo pero puede ignorarlo si no lo necesita

### ✅ Nuevos Campos en Automatizaciones

| Campo | Ubicación | Tipo | Descripción |
|-------|-----------|------|-------------|
| `usarSensorLuz` | `parametros` | Boolean | Si true, usar mismo sensor para apagar luz |
| `temperaturaApagar` | `parametros` | Float | Temperatura para apagar ventilador |
| `duracionSegundos` | `parametros` | Integer | Duración de alarma en segundos |
| `rangoInicio` | `parametros` | String | Hora inicio rango (ej: "22:00") |
| `rangoFin` | `parametros` | String | Hora fin rango (ej: "06:00") |

### 🔄 Lógica de Evaluación Actualizada

#### Antes (Sistema Antiguo)
```cpp
// Cada automatización era independiente
if (temperatura > 28) encender_ventilador();
if (temperatura < 25) apagar_ventilador();
```

#### Ahora (Sistema Nuevo)
```cpp
// Luz: Mismo sensor para encender/apagar (⚠️ LÓGICA INVERSA)
if (usarSensorLuz) {
  // Valores ALTOS (>2000) = oscuridad → encender
  // Valores BAJOS (<=2000) = luz → apagar
  if (luz > 2000) encender();
  else if (luz <= 2000) apagar();
}

// Ventilador: Referencia al mismo sensor
if (temperatura > 28) encender();
if (temperaturaApagar > 0 && temperatura <= 25) apagar();
```

---

## 🛠️ Guía de Implementación para Sensores Específicos

### Sensor de Luz (LDR/Fotoresistor)

⚠️ **IMPORTANTE - Lógica Inversa del Hardware**:
El circuito LDR implementado tiene polaridad inversa:
- **0** = Mucha luz (sensor saturado por luz intensa)
- **4095** = Oscuridad total (sensor sin luz)
- El sensor está **saturado/binario**: solo produce valores extremos (0 o 4095), no hay valores intermedios

```cpp
float leerSensorLuz(int pin) {
  int valorAnalogico = analogRead(pin);  // 0-4095

  // LÓGICA INVERSA: valores altos = oscuridad
  // El sensor está saturado, solo da 0 o 4095
  // Retornar valor RAW para evaluar contra umbral 2000

  return valorAnalogico;
}
```

**Valores de umbral (Sistema Real)**:
- **> 2000**: Oscuridad (encender focos) - el sensor lee valores altos cuando está oscuro
- **<= 2000**: Hay luz (apagar focos) - el sensor lee valores bajos (usualmente 0) cuando hay luz

**Nota**: Se usa 2000 como umbral medio para separar los dos estados extremos del sensor saturado (0 vs 4095)

### Sensor de Temperatura (DHT22)

```cpp
#include <DHTesp.h>

DHTesp dht;

void setup() {
  dht.setup(PIN_DHT22, DHTesp::DHT22);
}

float leerSensorTemperatura(int pin) {
  TempAndHumidity datos = dht.getTempAndHumidity();

  if (dht.getStatus() != 0) {
    Serial.println("Error leyendo DHT22");
    return 0.0;
  }

  return datos.temperature;
}
```

**Valores típicos de umbral**:
- Ventilador ON: `> 28°C`
- Ventilador OFF: `<= 25°C` (con histéresis de 3°C)

### Sensor de Gas (MQ-2)

```cpp
float leerSensorGas(int pin) {
  int valorAnalogico = analogRead(pin);

  // Convertir a ppm (partes por millón)
  // Esta conversión depende del sensor específico
  float ppm = valorAnalogico * (5000.0 / 4095.0);

  return ppm;
}
```

**Valores típicos de umbral**:
- `> 800 ppm`: Nivel peligroso (activar alarma)

### Sensor de Movimiento (PIR)

```cpp
bool leerSensorMovimiento(int pin) {
  return digitalRead(pin) == HIGH;
}
```

**Uso**:
- `true` (1): Movimiento detectado
- `false` (0): Sin movimiento

---

## ⚠️ Consideraciones Importantes

### 1. Manejo de Estados Compartidos

Cuando un mismo sensor controla encendido y apagado, **mantener un estado local** evita encendidos/apagados continuos:

```cpp
// Variable global para rastrear estado previo
struct EstadoDispositivo {
  String id;
  bool encendido;
  unsigned long ultimoCambio;
};

std::vector<EstadoDispositivo> estadosDispositivos;

// Evitar cambios muy rápidos (debounce)
const unsigned long DEBOUNCE_MS = 2000; // 2 segundos

bool puedecambiarEstado(String dispositivoId) {
  for (auto& estado : estadosDispositivos) {
    if (estado.id == dispositivoId) {
      if (millis() - estado.ultimoCambio < DEBOUNCE_MS) {
        return false; // Muy pronto para cambiar
      }
      estado.ultimoCambio = millis();
      return true;
    }
  }
  // Primera vez, agregar a la lista
  EstadoDispositivo nuevo = {dispositivoId, false, millis()};
  estadosDispositivos.push_back(nuevo);
  return true;
}
```

### 2. Validación de Automatizaciones Recibidas

```cpp
bool validarAutomatizacion(const Automatizacion& auto) {
  // Validar que el dispositivo de acción existe
  bool dispositivoExiste = false;
  for (const auto& disp : dispositivos) {
    if (disp.id == auto.dispositivoAccionId) {
      dispositivoExiste = true;
      break;
    }
  }

  if (!dispositivoExiste) {
    Serial.printf("[ERROR] Dispositivo de acción %s no existe\n",
                  auto.dispositivoAccionId.c_str());
    return false;
  }

  // Validar que el sensor existe (si aplica)
  if (!auto.dispositivoSensorId.isEmpty()) {
    bool sensorExiste = false;
    for (const auto& disp : dispositivos) {
      if (disp.id == auto.dispositivoSensorId) {
        sensorExiste = true;
        break;
      }
    }

    if (!sensorExiste) {
      Serial.printf("[ERROR] Sensor %s no existe\n",
                    auto.dispositivoSensorId.c_str());
      return false;
    }
  }

  return true;
}
```

### 3. Compatibilidad con Versiones Anteriores

El sistema es **totalmente compatible** con dispositivos antiguos:

```cpp
// Si subtipo es null o vacío, tratar como genérico
String obtenerTipoDispositivo(const Dispositivo& disp) {
  if (disp.tipo == "actuador" && !disp.subtipo.isEmpty()) {
    return disp.subtipo; // "luz", "ventilador", "alarma"
  }
  return disp.tipo; // "actuador" genérico
}
```

---

## 📊 Tabla de Decisión Rápida

### ¿Qué hacer cuando llega una automatización?

| `condicion` | `parametros.usarSensorLuz` | `parametros.temperaturaApagar` | Acción del ESP32 |
|-------------|---------------------------|-------------------------------|------------------|
| ✅ Existe | `true` | - | Usar sensor para ON/OFF automático |
| ✅ Existe | - | > 0 | Evaluar condición + apagar si temp baja |
| ✅ Existe | - | - | Evaluar condición normal |
| ❌ Null | - | > 0 | Solo apagar cuando temp <= valor |
| ❌ Null | - | - | Comando manual (no automático) |

---

## 🔍 Logs Recomendados para Debugging

```cpp
void imprimirConfiguracion() {
  Serial.println("\n========== CONFIGURACIÓN ACTUAL ==========");

  Serial.printf("Dispositivos: %d\n", dispositivos.size());
  for (const auto& d : dispositivos) {
    Serial.printf("  [%s] %s (Pin %d, Tipo: %s",
                  d.id.c_str(), d.nombre.c_str(), d.pin, d.tipo.c_str());
    if (!d.subtipo.isEmpty()) {
      Serial.printf(", Subtipo: %s", d.subtipo.c_str());
    }
    Serial.println(")");
  }

  Serial.printf("\nAutomatizaciones: %d\n", automatizaciones.size());
  for (const auto& a : automatizaciones) {
    Serial.printf("  [%s] %s %s → %s %s\n",
                  a.id.c_str(),
                  a.dispositivoSensorTipo.c_str(),
                  a.operador.c_str(),
                  a.dispositivoAccionId.c_str(),
                  a.comando.c_str());

    if (a.usarSensorLuz) {
      Serial.println("    └─ Sensor compartido para ON/OFF");
    }
    if (a.temperaturaApagar > 0) {
      Serial.printf("    └─ Apagar a %.1f°C\n", a.temperaturaApagar);
    }
    if (a.duracionSegundos > 0) {
      Serial.printf("    └─ Duración: %d segundos\n", a.duracionSegundos);
    }
  }

  Serial.println("==========================================\n");
}
```

---

## 📞 Contacto y Soporte

### Problemas Comunes

**1. El ESP32 no recibe actualizaciones**
- ✅ Verificar que la IP del ESP32 está configurada en la base de datos
- ✅ Verificar que el ESP32 está en la misma red que el servidor
- ✅ Verificar que el endpoint `/update-config` está implementado
- ✅ Revisar logs del backend para ver errores de conexión

**2. Las automatizaciones no se ejecutan**
- ✅ Verificar que la automatización está `activa: true`
- ✅ Verificar que los IDs de dispositivos coinciden
- ✅ Imprimir valores de sensores para ver si cumplen la condición
- ✅ Verificar que `evaluarAutomatizaciones()` se llama periódicamente

**3. Dispositivos se encienden/apagan continuamente**
- ✅ Implementar debounce (ver sección de estados compartidos)
- ✅ Verificar histéresis en condiciones de temperatura
- ✅ Revisar si hay automatizaciones duplicadas

---

¿Necesitas ayuda con alguna parte de la implementación? Contacta al equipo de backend.
