/*
 * Borrar EEPROM - ESP32-CAM
 * Este código borra toda la configuración guardada
 */

#include <EEPROM.h>

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=== Borrando EEPROM ===");

  // Inicializar EEPROM
  EEPROM.begin(512);

  // Escribir 0 en todos los bytes
  for (int i = 0; i < 512; i++) {
    EEPROM.write(i, 0);
  }

  // Guardar cambios
  EEPROM.commit();

  Serial.println("✓ EEPROM borrada completamente");
  Serial.println("✓ Ahora puedes cargar el código del Captive Portal");
  Serial.println("\nEste programa ya terminó. Desconecta y carga el siguiente código.");
}

void loop() {
  // No hacer nada
  delay(1000);
}
