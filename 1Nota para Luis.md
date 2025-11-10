
### 🔌 ENDPOINT ESP32 - DOCUMENTACIÓN PARA PRUEBAS

#### Endpoint Implementado:
```
GET /api/esp-config/:habitacionId
```

**Importante:** Este endpoint es **público** (no requiere autenticación JWT), diseñado específicamente para que los ESP32 puedan acceder sin tokens.

#### Cómo Probarlo:

##### Opción 1: Desde el Navegador
Simplemente abre esta URL en tu navegador (reemplaza el habitacionId con el ID real de tu habitación):
```
http://localhost:3000/api/esp-config/690cd1b395326198f964c875
```

##### Opción 2: Desde la Terminal (curl)
```bash
curl http://localhost:3000/api/esp-config/690cd1b395326198f964c875
```

##### Opción 3: Desde el ESP32 (código C++)
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

void obtenerConfiguracion() {
  HTTPClient http;
  String habitacionId = "690cd1b395326198f964c875"; // ID de tu habitación
  String url = "http://192.168.0.100:3000/api/esp-config/" + habitacionId;

  http.begin(url);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();

    // Parsear JSON
    DynamicJsonDocument doc(4096);
    deserializeJson(doc, payload);

    // Acceder a los datos
    String nombre = doc["nombre"];
    JsonArray dispositivos = doc["dispositivos"];

    for (JsonObject disp : dispositivos) {
      String id = disp["id"];
      String nombre = disp["nombre"];
      int pin = disp["pin"];
      String tipo = disp["tipo"];

      Serial.printf("Dispositivo: %s, Pin: %d, Tipo: %s\n",
                    nombre.c_str(), pin, tipo.c_str());
    }
  }

  http.end();
}
```

#### Respuesta Esperada:

```json
{
  "id": "690cd1b395326198f964c875",
  "nombre": "Cocina",
  "ip": "192.168.0.28",
  "dispositivos": [
    {
      "id": "690e297411a8e558e79d3e9e",
      "nombre": "Abanico",
      "pin": 17,
      "tipo": "actuador"
    },
    {
      "id": "690e298c11a8e558e79d3ea1",
      "nombre": "Sensor Temperatura",
      "pin": 23,
      "tipo": "temperatura"
    }
  ],
  "automatizaciones": [
    {
      "id": "690e2d7199de9dcf6b72e17f",
      "nombre": "Refrescar",
      "activa": true,
      "trigger": {
        "tipo": "horario",
        "horario": {
          "hora": "10:20",
          "dias": [0, 1, 2, 3, 4, 5, 6]
        }
      },
      "acciones": [
        {
          "dispositivo_id": "690e297411a8e558e79d3e9e",
          "accion": "encender",
          "parametros": {
            "horaApagar": "11:24"
          }
        }
      ]
    }
  ]
}
```

#### Cómo Obtener el habitacionId:

**Opción 1:** Desde MongoDB Compass o la base de datos directamente
- Abre la colección rooms
- Copia el campo _id de la habitación que deseas

**Opción 2:** Desde el frontend (inspeccionar en el navegador)
1. Abre el sitio web en http://localhost:3000
2. Ve a la página de Habitaciones
3. Abre las Herramientas de Desarrollo (F12)
4. Ve a la pestaña Network (Red)
5. Haz clic en cualquier habitación
6. Busca la petición a /api/rooms
7. En la respuesta JSON, copia el _id de la habitación

**Opción 3:** Con el script helper:
```bash
cd database
node scripts/list-rooms.js
```

#### Notas Importantes:

1. El servidor debe estar corriendo: cd database && npm run dev
2. El endpoint devuelve solo automatizaciones activas (activa: true)
3. Los dispositivos están mapeados con solo los campos necesarios: id, nombre, pin, tipo
4. Las automatizaciones incluyen:
   - Automatizaciones por horario (trigger.tipo: "horario")
   - Automatizaciones por sensor (si las hay configuradas)
   - Los parámetros adicionales como horaApagar, temperaturaEncender, etc.

#### Troubleshooting:

- Error 404: Verifica que el habitacionId sea correcto
- Error 500: Revisa los logs del servidor, puede ser que la habitación tenga dispositivos sin el campo pin
- Respuesta vacía en dispositivos: Asegúrate de que la habitación tenga dispositivos asignados
- IP en blanco: Edita la habitación en el frontend y añade la IP del ESP32

