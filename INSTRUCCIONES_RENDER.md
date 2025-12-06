# Instrucciones para Desplegar en Render con ESP32-CAM

## 1. Configurar Variables de Entorno en Render

En el panel de Render, agrega estas variables de entorno:

```
MONGODB_URI=tu-mongodb-uri
JWT_SECRET=tu-jwt-secret
NODE_ENV=production
SERVER_HOST=tu-app.onrender.com
PORT=3000
```

**IMPORTANTE**: Cambia `tu-app.onrender.com` por la URL real que te asigne Render.

---

## 2. Para usar ESP32-CAM en Producción (Render)

### Opción A: Mismo código ESP32, solo cambiar .env
El código del ESP32 está actualmente configurado para localhost (`192.168.1.34:3000`).

Para usar con Render, tendrías que:
1. Editar `esp32_cam_captive_portal.ino`
2. Cambiar la línea 518:
   ```cpp
   // ANTES (localhost)
   String serverUrl = "http://192.168.1.34:3000/api/esp/validate-activation-code";

   // DESPUÉS (Render)
   String serverUrl = "https://tu-app.onrender.com/api/esp/validate-activation-code";
   ```
3. Recompilar y subir el código al ESP32-CAM

### Opción B: Usar solo en localhost (Recomendado)
Si tu app en Render solo la usan usuarios externos (sin ESP32-CAM), mantén el código ESP32 sin cambios.

El ESP32-CAM solo funcionará en tu red local, que es lo más común para cámaras de seguridad.

---

## 3. ¿Cómo saber si estoy en localhost o Render?

**Localhost**:
- URL: `http://localhost:3000` o `http://192.168.1.34:3000`
- ESP32-CAM funciona ✅
- Variable `SERVER_HOST=192.168.1.34`

**Render**:
- URL: `https://tu-app.onrender.com`
- ESP32-CAM NO funciona (a menos que recompiles el código)
- Variable `SERVER_HOST=tu-app.onrender.com`

---

## 4. Recomendación Final

**Para uso normal**: Usa Render para la web app y localhost para el ESP32-CAM.

**Para demostración remota**: Si necesitas demostrar el ESP32-CAM a alguien remoto, puedes:
1. Usar ngrok para exponer tu localhost
2. O recompilar el ESP32 con la URL de Render (pero necesitas que el ESP32 tenga acceso a internet público)

---

## 5. Testing

### Localhost:
```bash
cd database
npm run dev
# Servidor en http://localhost:3000
# ESP32-CAM puede conectarse ✅
```

### Render:
1. Push a GitHub
2. Render detecta cambios y despliega automáticamente
3. Configura `SERVER_HOST` en variables de entorno
4. ESP32-CAM solo funciona si recompilaste con URL de Render
