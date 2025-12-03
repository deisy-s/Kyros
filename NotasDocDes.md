# NOTAS PARA DOCUMENTADORA - PROYECTO KYROS

## Índice
1. [Autenticación y Usuarios](#1-autenticación-y-usuarios)
2. [Gestión de Habitaciones](#2-gestión-de-habitaciones)
3. [Gestión de Dispositivos](#3-gestión-de-dispositivos)
4. [Tareas Automatizadas](#4-tareas-automatizadas)
5. [Reglas de Automatización](#5-reglas-de-automatización)
6. [Cámaras de Seguridad](#6-cámaras-de-seguridad)
7. [Integración ESP32](#7-integración-esp32)
8. [Utilidades y Middleware](#8-utilidades-y-middleware)
9. [Resumen de Funciones Críticas](#9-resumen-de-funciones-críticas)

---

## 1. AUTENTICACIÓN Y USUARIOS

### Backend - authController.js

**Ubicación:** `database/controllers/authController.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `register` | 6 | **Se encarga del REGISTRO de nuevos usuarios**. Verifica que el email no esté duplicado, crea el usuario en la BD, genera un token JWT y lo devuelve. También soporta registro con Google OAuth. | ⭐⭐⭐ CRÍTICA - Sin esta función nadie puede crear cuenta |
| `login` | 66 | **Se encarga del LOGIN de usuarios**. Verifica email y contraseña, valida que el usuario esté activo, genera token JWT y lo devuelve para mantener la sesión. | ⭐⭐⭐ CRÍTICA - Sin esta función nadie puede entrar al sistema |
| `getMe` | 123 | **Obtiene el perfil del usuario actual**. Usando el token JWT, devuelve los datos del usuario que está logueado (nombre, email, rol). | ⭐⭐ ALTA - Necesaria para mostrar información del usuario |
| `updateProfile` | 139 | **Actualiza datos del perfil**. Permite cambiar nombre, email y campo estudiante. Valida que el nuevo email no esté en uso. | ⭐ MEDIA - Para editar perfil |
| `updatePassword` | 174 | **Cambia la contraseña**. Verifica la contraseña actual antes de permitir cambiarla por una nueva. | ⭐⭐ ALTA - Seguridad del usuario |

### Backend - User.js (Modelo)

**Ubicación:** `database/models/User.js`

| Método/Hook | Línea | ¿Qué hace? | Importancia |
|-------------|-------|------------|-------------|
| `pre('save')` | 94 | **Hashea (encripta) la contraseña automáticamente** antes de guardarla en la base de datos usando bcrypt. Así nunca se guardan contraseñas en texto plano. | ⭐⭐⭐ CRÍTICA - Seguridad de contraseñas |
| `matchPassword` | 107 | **Compara contraseñas en el login**. Recibe la contraseña que el usuario escribió y la compara con el hash guardado en la BD para saber si es correcta. | ⭐⭐⭐ CRÍTICA - Validación de login |
| `getSignedJwtToken` | 112 | **Genera el token JWT** con el ID del usuario. Este token es lo que mantiene la sesión activa. | ⭐⭐⭐ CRÍTICA - Sistema de autenticación |
| `getPublicProfile` | 121 | **Devuelve datos del usuario sin la contraseña**. Para seguridad, nunca se debe enviar el password al frontend. | ⭐⭐ ALTA - Seguridad de datos |

### Backend - auth.js (Middleware)

**Ubicación:** `database/middleware/auth.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `protect` | 5 | **Protege las rutas del API**. Verifica que el token JWT sea válido y agrega los datos del usuario a `req.user` para que los controladores sepan quién está haciendo la petición. | ⭐⭐⭐ CRÍTICA - Sin esto cualquiera podría acceder a todo |
| `authorize` | 49 | **Restringe acceso por rol**. Verifica si el usuario tiene el rol necesario (estudiante/admin) para acceder a ciertas funciones. | ⭐⭐ ALTA - Control de permisos |

### Frontend - auth.js

**Ubicación:** `js/auth.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `saveToken` | 5 | **Guarda el token JWT** en localStorage del navegador para mantener la sesión activa. | ⭐⭐⭐ CRÍTICA - Sin esto el usuario tendría que loguearse cada vez |
| `getToken` | 10 | **Obtiene el token** guardado en localStorage. | ⭐⭐⭐ CRÍTICA - Necesario para todas las peticiones |
| `removeToken` | 15 | **Elimina el token (logout)**. Se usa cuando el usuario cierra sesión. | ⭐⭐ ALTA - Función de logout |
| `isAuthenticated` | 20 | **Verifica si hay sesión activa**. Revisa si existe un token guardado. | ⭐⭐ ALTA - Para saber si el usuario está logueado |
| `fetchWithAuth` | 25 | **Hace peticiones al API con autenticación**. Agrega automáticamente el token JWT en el header de todas las peticiones. Si el token es inválido, redirige al login. | ⭐⭐⭐ CRÍTICA - Todas las peticiones autenticadas usan esta función |
| `requireAuth` | 50 | **Protege páginas del frontend**. Si el usuario no está logueado, lo redirige a login.html. Se llama al cargar cada página protegida. | ⭐⭐⭐ CRÍTICA - Protege todas las páginas privadas |
| `getCurrentUser` | 57 | **Obtiene datos del usuario actual** llamando al API `/auth/me`. | ⭐⭐ ALTA - Para mostrar información del usuario |

**RESUMEN AUTENTICACIÓN:**
- **Login/Registro:** `register()` y `login()` en backend crean cuenta y validan usuario
- **Token JWT:** Se genera con `getSignedJwtToken()`, se guarda con `saveToken()` en localStorage
- **Protección:** Backend usa `protect` middleware, frontend usa `requireAuth()` y `fetchWithAuth()`
- **Seguridad:** Contraseñas hasheadas con bcrypt en `pre('save')` hook

---

## 2. GESTIÓN DE HABITACIONES

### Backend - roomController.js

**Ubicación:** `database/controllers/roomController.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getRooms` | 9 | **Lista todas las habitaciones del usuario**. Obtiene solo las habitaciones que pertenecen al usuario logueado e incluye la lista de dispositivos de cada una. | ⭐⭐ ALTA - Vista principal de habitaciones |
| `getRoom` | 28 | **Obtiene una habitación específica** con todos sus dispositivos. Valida que la habitación pertenezca al usuario. | ⭐⭐ ALTA - Para ver detalles de una habitación |
| `createRoom` | 63 | **Crea una nueva habitación**. Guarda nombre, icono, descripción e IP (para conectar con ESP32). | ⭐⭐ ALTA - Agregar habitaciones |
| `updateRoom` | 83 | **Actualiza datos de la habitación**. Permite cambiar nombre, icono, descripción y la IP del ESP32. | ⭐ MEDIA - Editar habitaciones |
| `deleteRoom` | 121 | **Elimina una habitación con todas sus dependencias**. Borra la habitación Y opcionalmente todos sus dispositivos, automatizaciones y datos históricos (efecto cascade). | ⭐⭐⭐ CRÍTICA - Eliminación segura que limpia todo |
| `getRoomDevices` | 205 | **Obtiene todos los dispositivos de una habitación**. Lista solo los dispositivos de la habitación especificada. | ⭐⭐ ALTA - Ver dispositivos por habitación |

### Frontend - rooms.html

**Ubicación:** `rooms.html` (funciones JavaScript embebidas)

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getIconForRoom` | 143 | **Devuelve el ícono correcto** según el nombre de la habitación (sala → fa-couch, cocina → fa-utensils, etc). | ⭐ MEDIA - UI bonita |
| `navigateToRoom` | 148 | **Navega a la vista de dispositivos** de una habitación. Redirige a devices.html con el ID de la habitación. | ⭐⭐ ALTA - Navegación principal |
| `navigateToEdit` | 152 | **Navega a editar habitación**. Redirige a roomedit.html con el ID. | ⭐ MEDIA - Edición |
| `loadRooms` | 156 | **Carga y muestra todas las habitaciones**. Llama al API, obtiene la lista y renderiza las tarjetas con nombre, ícono y cantidad de dispositivos. | ⭐⭐⭐ CRÍTICA - Vista principal de la app |

**RESUMEN HABITACIONES:**
- **CRUD básico:** Crear (`createRoom`), Leer (`getRooms`, `getRoom`), Actualizar (`updateRoom`), Eliminar (`deleteRoom`)
- **Campo IP:** Cada habitación tiene una IP para comunicarse con su ESP32
- **Eliminación cascade:** Al borrar habitación se puede optar por borrar todo lo relacionado (dispositivos, automatizaciones, datos)

---

## 3. GESTIÓN DE DISPOSITIVOS

### Backend - deviceController.js

**Ubicación:** `database/controllers/deviceController.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getDevices` | 9 | **Lista dispositivos con filtros**. Puede filtrar por tipo (luz, temperatura, etc.) y por habitación. Devuelve solo dispositivos del usuario. | ⭐⭐ ALTA - Vista de dispositivos |
| `getDevice` | 34 | **Obtiene un dispositivo específico** con sus datos completos (nombre, tipo, estado, habitación, etc). | ⭐⭐ ALTA - Ver detalles |
| `createDevice` | 67 | **Crea un nuevo dispositivo**. Valida que la habitación pertenezca al usuario antes de crear. | ⭐⭐ ALTA - Agregar dispositivos |
| `updateDevice` | 104 | **Actualiza configuración del dispositivo**. Permite cambiar nombre, pin GPIO, tipo, etc. | ⭐ MEDIA - Editar dispositivos |
| `deleteDevice` | 141 | **Elimina un dispositivo**. Opcionalmente puede borrar también todos los datos históricos del dispositivo. | ⭐⭐ ALTA - Eliminar dispositivos |
| `toggleDevice` | 178 | **⭐⭐⭐ FUNCIÓN MÁS IMPORTANTE DE DISPOSITIVOS**<br>**Enciende/apaga el dispositivo**. Hace 3 cosas:<br>1. Cambia el estado en la base de datos<br>2. Guarda el evento en el historial (DeviceData)<br>3. **Envía comando HTTP al ESP32** usando la IP de la habitación para que físicamente encienda/apague el dispositivo | ⭐⭐⭐ CRÍTICA - Control ON/OFF del hardware físico |
| `getDeviceData` | 257 | **Obtiene datos históricos del dispositivo**. Trae todos los registros de uso (cuándo se encendió/apagó, valores de sensores) con filtros de fecha y tipo. | ⭐⭐ ALTA - Historial para gráficas |
| `handleAggregatedData` | 309 | **Procesa datos para gráficas**. Función auxiliar que:<br>- Agrupa datos por períodos (24h/7días/30días)<br>- Consolida eventos ON/OFF consecutivos<br>- Calcula promedios/min/max para sensores<br>- Prepara datos para Chart.js | ⭐⭐⭐ CRÍTICA - Gráficas y analytics funcionan gracias a esta |

### Backend - Device.js (Modelo)

**Ubicación:** `database/models/Device.js`

**7 Tipos de dispositivos soportados:**
1. `actuador` - Dispositivos que hacen algo (ventiladores, alarmas, luces)
2. `camara` - Cámaras de seguridad
3. `gas` - Sensores de gas (MQ-2)
4. `humedad` - Sensores de humedad
5. `luz` - Sensores de luz (LDR)
6. `movimiento` - Sensores de movimiento (PIR)
7. `temperatura` - Sensores de temperatura (DHT)

**Subtipos de actuadores:**
- `luz` - Focos/lámparas (vida útil: 15,000 horas)
- `ventilador` - Ventiladores (vida útil: 20,000 horas)
- `alarma` - Alarmas/sirenas (vida útil: 30,000 horas)

### Frontend - deviceinfo.html

**Ubicación:** `deviceinfo.html` (funciones JavaScript embebidas)

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `fetchWithTimeout` | 201 | **Hace peticiones con timeout**. Evita que peticiones al ESP32 se queden colgadas si el dispositivo no responde. | ⭐⭐ ALTA - Estabilidad |
| `showUpdateSpinner` | 223 | **Muestra/oculta el spinner de carga** cuando se hace toggle del dispositivo. | ⭐ MEDIA - UX |
| `getParameterByName` | 241 | **Lee parámetros de la URL** (deviceId, roomId, etc). Todas las páginas usan esto para navegación. | ⭐⭐ ALTA - Navegación |
| `displayRoomName` | 256 | **Actualiza el breadcrumb** (navegación superior) con el nombre de la habitación y dispositivo. | ⭐ MEDIA - UI |
| `loadDeviceInfo` | 266 | **Carga información del dispositivo**. Llama al API para obtener datos y luego llama a `setupInterfaceByType` para configurar la interfaz. | ⭐⭐⭐ CRÍTICA - Inicializa toda la página |
| `updateToggleState` | 283 | **Actualiza visualmente el switch ON/OFF**. Cambia el color y estado del toggle cuando el dispositivo cambia de estado. | ⭐⭐ ALTA - Feedback visual |
| `setupInterfaceByType` | 294 | **Configura la interfaz según tipo de dispositivo**. Muestra/oculta elementos dependiendo si es sensor, actuador, etc. | ⭐⭐ ALTA - UI dinámica |
| `fetchHistoricalData` | 344 | **⭐⭐⭐ FUNCIÓN PRINCIPAL DE ANALYTICS**<br>**Obtiene datos históricos** del API y decide qué renderizar:<br>- Gráfica de barras para actuadores (uso)<br>- Gráfica de líneas para sensores (valores)<br>- Lista de eventos para movimiento/luz/alarmas | ⭐⭐⭐ CRÍTICA - Sistema de analytics completo |
| `changeTimeRange` | 441 | **Cambia el rango de tiempo** (24h/Semana/Mes) y recarga los datos. | ⭐ MEDIA - Filtros de tiempo |
| `renderHeaderValue` | 448 | **Muestra el valor actual del sensor** en el header (temperatura actual, humedad actual). | ⭐⭐ ALTA - Info en tiempo real |
| `renderDataView` | 501 | **Decide qué tipo de vista mostrar**. Dependiendo del tipo de dispositivo, muestra gráfica de barras, gráfica de líneas, o lista de eventos. | ⭐⭐ ALTA - Lógica de vistas |
| `filterDataByTime` | 540 | **Filtra datos por rango temporal**. Elimina datos fuera del rango seleccionado (24h/7d/30d). | ⭐ MEDIA - Filtrado |
| `showLastReadingInfo` | 550 | **Muestra información de última lectura Y calcula vida útil**. Para actuadores muestra:<br>- Tiempo total de uso<br>- Barra de progreso de vida útil<br>- Colores: verde (>50%), amarillo (10-50%), rojo (<10%) | ⭐⭐ ALTA - Vida útil de dispositivos |
| `renderHistoryList` | 609 | **Renderiza lista de eventos** para sensores de movimiento, luz y alarmas (lista de "Movimiento detectado", "Luz apagada", etc). | ⭐⭐ ALTA - Vista de eventos |
| `renderUsageChart` | 722 | **⭐⭐⭐ RENDERIZA GRÁFICA DE BARRAS PARA ACTUADORES**<br>Muestra cuántos minutos estuvo encendido el dispositivo por hora (24h) o por día (7d/30d). Usa Chart.js. | ⭐⭐⭐ CRÍTICA - Gráfica de consumo |
| `aggregateUsageByPeriod` | 855 | **Agrupa datos de uso por período**. Suma las duraciones de uso por hora o por día para la gráfica de barras. | ⭐⭐ ALTA - Procesamiento de uso |
| `calculateTotalUsage` | 936 | **Calcula tiempo total de uso** en horas. Necesario para calcular vida útil. | ⭐⭐ ALTA - Cálculo de vida útil |
| `renderLineChart` | 951 | **⭐⭐⭐ RENDERIZA GRÁFICA DE LÍNEAS PARA SENSORES**<br>Muestra valores de temperatura/humedad a lo largo del tiempo. Usa Chart.js. | ⭐⭐⭐ CRÍTICA - Gráfica de tendencias |

### Frontend - devices.html

**Ubicación:** `devices.html` (funciones JavaScript embebidas)

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getIconForDevice` | 175 | **Devuelve el ícono correcto** según tipo y subtipo de dispositivo. | ⭐ MEDIA - UI |
| `getDisplayName` | 183 | **Devuelve nombre legible** del tipo de dispositivo (temperatura → "Sensor de Temperatura"). | ⭐ MEDIA - UI |
| `navigateToDevice` | 204 | **Navega a la vista de información del dispositivo**. | ⭐⭐ ALTA - Navegación |
| `navigateToEdit` | 208 | **Navega a editar dispositivo**. | ⭐ MEDIA - Edición |
| `loadDevices` | 212 | **⭐⭐⭐ CARGA Y MUESTRA TODOS LOS DISPOSITIVOS DE UNA HABITACIÓN**<br>Renderiza tarjetas con toggle ON/OFF para cada dispositivo. | ⭐⭐⭐ CRÍTICA - Vista principal de dispositivos |

**RESUMEN DISPOSITIVOS:**
- **Toggle ON/OFF:** `toggleDevice()` en backend cambia estado en BD, guarda historial Y envía comando HTTP al ESP32
- **Analytics:** `fetchHistoricalData()` → `renderUsageChart()` o `renderLineChart()` según tipo
- **Vida útil:** `calculateTotalUsage()` + `showLastReadingInfo()` calculan y muestran vida útil restante
- **7 tipos soportados:** actuador, camara, gas, humedad, luz, movimiento, temperatura

---

## 4. TAREAS AUTOMATIZADAS

### Backend - taskController.js

**Ubicación:** `database/controllers/taskController.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getTasks` | 7 | **Lista tareas con filtros**. Puede filtrar por estado (pendiente/completada) y si está activa o no. Incluye los datos de dispositivos y condiciones. | ⭐⭐ ALTA - Vista de tareas |
| `getTask` | 48 | **Obtiene una tarea específica**. Valida que la tarea pertenezca al usuario. | ⭐⭐ ALTA - Detalle de tarea |
| `createTask` | 85 | **Crea una nueva tarea**. Valida que todos los dispositivos involucrados pertenezcan al usuario. | ⭐⭐ ALTA - Crear tareas |
| `updateTask` | 131 | **Actualiza una tarea existente**. Permite cambiar configuración, horarios, acciones. | ⭐⭐ ALTA - Editar tareas |
| `deleteTask` | 171 | **Elimina una tarea**. Valida que pertenezca al usuario. | ⭐ MEDIA - Borrar tareas |
| `toggleTask` | 208 | **Activa/desactiva una tarea**. Cambia el campo `activa` para que la tarea se ejecute o no. | ⭐⭐ ALTA - Control de ejecución |
| `executeTask` | 247 | **Ejecuta una tarea manualmente**. Permite al usuario forzar la ejecución de una tarea sin esperar al horario programado. | ⭐ MEDIA - Ejecución manual |

### Backend - Task.js (Modelo)

**Ubicación:** `database/models/Task.js`

**3 Tipos de tareas:**
1. `manual` - Se ejecuta cuando el usuario presiona un botón
2. `programada` - Se ejecuta en horario específico
3. `evento` - Se ejecuta cuando sucede algo (sensor detecta algo)

**Estados de tarea:**
- `pendiente` - No se ha ejecutado
- `en_progreso` - Se está ejecutando ahora
- `completada` - Terminó exitosamente
- `cancelada` - Fue cancelada
- `fallida` - Falló al ejecutar

**Tipos de programación:**
- `una_vez` - Solo se ejecuta una vez
- `diaria` - Todos los días
- `semanal` - Ciertos días de la semana
- `mensual` - Ciertos días del mes

### Frontend - addtask.html (Crear tarea desde dispositivo)

**Ubicación:** `addtask.html` (funciones JavaScript embebidas)

**ESTA PÁGINA ES COMPLEJA - Crea tareas cuando vienes desde un dispositivo específico**

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getParameterByName` | 513 | **Lee parámetros URL** (deviceId, roomId, etc). | ⭐⭐ ALTA - Inicialización |
| `displayRoomName` | 527 | **Actualiza breadcrumb** con nombres. | ⭐ MEDIA - UI |
| `showFormForDeviceType` | 543 | **⭐⭐⭐ MUY IMPORTANTE**<br>**Muestra el formulario correcto según tipo de dispositivo**:<br>- Ventilador → formulario de temperatura<br>- Luz → formulario de luz<br>- Alarma → formulario de alarma<br>- Movimiento → formulario de activación<br>- Gas → formulario de activación | ⭐⭐⭐ CRÍTICA - Formularios dinámicos |
| `loadDevices` | 577 | **Carga información del dispositivo actual**. | ⭐⭐ ALTA - Inicialización |
| `loadMovementSensors` | 604 | **Carga sensores de movimiento** para automatizaciones de alarmas (alarma suena cuando hay movimiento). | ⭐ MEDIA - Datos relacionados |
| `loadGasSensors` | 646 | **Carga sensores de gas** para automatizaciones de alarmas (alarma suena cuando detecta gas). | ⭐ MEDIA - Datos relacionados |
| `loadTempSensors` | 688 | **⭐⭐⭐ MUY IMPORTANTE PARA TAREAS MIXTAS**<br>**Carga sensores de temperatura** para dropdowns:<br>- Dropdown de encendido (¿a qué temperatura encender?)<br>- Dropdown de apagado (¿a qué temperatura apagar?)<br>Permite tareas mixtas temperatura-temperatura | ⭐⭐⭐ CRÍTICA - Tareas mixtas con temperatura |
| `nameClick` | 968 | **Avanza del paso 1 (nombre) al paso 2** (opciones). | ⭐ MEDIA - Flujo del wizard |
| `startFanClick` | 1029 | **⭐⭐⭐ FUNCIÓN CRÍTICA - GUARDA TAREAS DE VENTILADOR/TEMPERATURA**<br>Valida y guarda tarea mixta:<br>- **Temperatura → Temperatura**: sensor ON, sensor OFF<br>- **Temperatura → Hora**: sensor ON, hora OFF<br>- **Hora → Temperatura**: hora ON, sensor OFF<br>- **Hora → Hora**: hora ON, hora OFF<br>Guarda `trigger.sensor.dispositivo`, `parametros.sensorTemperaturaApagar`, `temperaturaApagar`, `trigger.horario.hora`, `trigger.horario.horaFin` | ⭐⭐⭐ CRÍTICA - Guardado de tareas mixtas temperatura |
| `startLightClick` | 1048 | **⭐⭐⭐ FUNCIÓN CRÍTICA - GUARDA TAREAS DE LUZ**<br>Valida y guarda tarea mixta:<br>- **Hora → Hora**: hora ON, hora OFF<br>- **Hora → Sensor**: hora ON, sensor luz OFF<br>- **Sensor → Hora**: sensor luz ON, hora OFF<br>- **Sensor → Sensor**: sensor luz ON, sensor luz OFF<br>Guarda sensorLuz para encendido/apagado cuando no hay luz | ⭐⭐⭐ CRÍTICA - Guardado de tareas mixtas luz |

**CASOS MIXTOS SOPORTADOS EN addtask.html:**

**Para Ventilador/Temperatura:**
1. ✅ **Temperatura → Temperatura**: "Encender cuando temp > 30°C, apagar cuando temp < 20°C"
2. ✅ **Temperatura → Hora**: "Encender cuando temp > 30°C, apagar a las 10:00 PM"
3. ✅ **Hora → Temperatura**: "Encender a las 8:00 AM, apagar cuando temp < 20°C"
4. ✅ **Hora → Hora**: "Encender a las 8:00 AM, apagar a las 10:00 PM"

**Para Luz:**
1. ✅ **Hora → Hora**: "Encender a las 7:00 PM, apagar a las 11:00 PM"
2. ✅ **Hora → Sensor**: "Encender a las 7:00 PM, apagar cuando hay luz natural"
3. ✅ **Sensor → Hora**: "Encender cuando oscurece, apagar a las 11:00 PM"
4. ✅ **Sensor → Sensor**: "Encender cuando oscurece, apagar cuando hay luz natural"

### Frontend - newtask.html (Crear tarea desde automatización)

**Ubicación:** `newtask.html` (funciones JavaScript embebidas)

**ESTA PÁGINA ES LA MÁS COMPLEJA - Crea tareas cuando vienes desde la sección de automatización**

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `loadDevices` | 528 | **Carga lista de actuadores** disponibles para seleccionar en el primer paso. | ⭐⭐ ALTA - Selección de dispositivo |
| `loadMovementSensors` | 582 | **Carga sensores de movimiento**. | ⭐ MEDIA - Datos relacionados |
| `loadGasSensors` | 624 | **Carga sensores de gas**. | ⭐ MEDIA - Datos relacionados |
| `loadTempSensors` | 666 | **⭐⭐⭐ CRÍTICA - Carga sensores de temperatura** para tareas de ventiladores con soporte mixto. | ⭐⭐⭐ CRÍTICA - Tareas mixtas |
| `nameClick` | 931 | **Avanza a selección de dispositivo**. | ⭐ MEDIA - Flujo |
| `devClick` | 945 | **Avanza a configuración según tipo de dispositivo seleccionado**. Muestra el formulario correcto (ventilador/luz/alarma). | ⭐⭐ ALTA - Flujo dinámico |
| `startFanClick` | 1000 | **⭐⭐⭐ CRÍTICA - Guarda tarea de ventilador** con soporte mixto (igual que addtask.html). | ⭐⭐⭐ CRÍTICA - Guardado mixto |
| `startLightClick` | 1019 | **⭐⭐⭐ CRÍTICA - Guarda tarea de luz** con soporte mixto (igual que addtask.html). | ⭐⭐⭐ CRÍTICA - Guardado mixto |
| `saveButton.addEventListener` | 1042 | **⭐⭐⭐ FUNCIÓN MÁS COMPLEJA DEL FRONTEND**<br>**Event listener principal que guarda TODAS las tareas**:<br>- Ventilador: casos mixtos temp/hora<br>- Luz: casos mixtos sensor/hora<br>- Alarma: hora, movimiento, gas<br>Construye el objeto completo de automatización con trigger, acciones, parametros y envía POST a `/api/automatize` | ⭐⭐⭐ CRÍTICA - Guardado universal de tareas |

### Frontend - taskinfo.html (Editar tarea existente)

**Ubicación:** `taskinfo.html` (funciones JavaScript embebidas)

**ESTA PÁGINA CARGA UNA TAREA EXISTENTE Y LA MUESTRA PARA EDITAR**

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `loadMovementSensors` | 387 | **Carga sensores de movimiento con pre-selección**. Si la tarea ya tiene un sensor de movimiento, lo marca como seleccionado. | ⭐⭐ ALTA - Edición |
| `loadGasSensors` | 426 | **Carga sensores de gas con pre-selección**. | ⭐⭐ ALTA - Edición |
| `loadLightSensors` | 466 | **Carga sensores de luz con pre-selección**. | ⭐⭐ ALTA - Edición |
| `loadTempSensors` | 506 | **⭐⭐⭐ FUNCIÓN MUY IMPORTANTE**<br>**Carga sensores de temperatura con pre-selección para ON y OFF por separado**. Esto permite editar tareas mixtas donde el sensor de encendido y apagado son diferentes. | ⭐⭐⭐ CRÍTICA - Edición de tareas mixtas |
| `showFormForDeviceType` | 745 | **Muestra el formulario correcto** según tipo/subtipo del dispositivo. | ⭐⭐ ALTA - UI dinámica |
| `loadDevices` | 795 | **Carga lista de dispositivos para el selector** con pre-selección del dispositivo actual. | ⭐⭐ ALTA - Edición |
| `loadTaskData` | 840 | **⭐⭐⭐ FUNCIÓN MÁS COMPLEJA DE CARGA**<br>**Carga datos de tarea existente y pre-llena TODOS los campos**:<br>- Lee automatización desde API<br>- Detecta si es trigger horario o sensor<br>- Pre-selecciona sensor de temperatura ON (`trigger.sensor.dispositivo`)<br>- Pre-selecciona sensor de temperatura OFF (`parametros.sensorTemperaturaApagar`)<br>- Pre-llena horas de encendido y apagado<br>- Pre-selecciona sensores de luz<br>- Pre-llena temperaturas objetivo<br>- Maneja correctamente todos los casos mixtos | ⭐⭐⭐ CRÍTICA - Carga para edición de tareas mixtas |

**RESUMEN TAREAS:**
- **3 páginas para tareas:**
  - `addtask.html` - Crear desde dispositivo específico
  - `newtask.html` - Crear desde automatización
  - `taskinfo.html` - Editar existente
- **Funciones críticas de guardado:**
  - `startFanClick()` - Guarda tareas de ventilador con 4 combinaciones mixtas
  - `startLightClick()` - Guarda tareas de luz con 4 combinaciones mixtas
  - `saveButton listener` (newtask) - Guarda todas las tareas
- **Función crítica de carga:**
  - `loadTaskData()` - Carga y pre-llena formularios para edición
- **Campos importantes en BD:**
  - `trigger.sensor.dispositivo` - Sensor que activa el encendido
  - `trigger.horario.hora` - Hora de encendido
  - `trigger.horario.horaFin` - Hora de apagado
  - `parametros.sensorTemperaturaApagar` - Sensor que activa el apagado
  - `parametros.temperaturaApagar` - Temperatura de apagado

---

## 5. REGLAS DE AUTOMATIZACIÓN

### Backend - automatizeController.js

**Ubicación:** `database/controllers/automatizeController.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getAutomatizations` | 8 | **Lista automatizaciones con filtros**. Puede filtrar por activa (true/false) y tipo de trigger (horario/sensor/manual). | ⭐⭐ ALTA - Vista principal |
| `getAutomatization` | 46 | **Obtiene automatización específica** con todos sus datos (trigger, condiciones, acciones, dispositivos). | ⭐⭐ ALTA - Detalle |
| `createAutomatization` | 91 | **⭐⭐⭐ IMPORTANTE - Crea automatización Y notifica ESP32s**<br>Valida dispositivos, crea la automatización y llama a `notifyESP32ConfigUpdate()` para avisar al ESP32 que hay una nueva regla. | ⭐⭐⭐ CRÍTICA - Crear con integración ESP32 |
| `updateAutomatization` | 181 | **Actualiza automatización Y notifica ESP32s**. Cambia configuración y avisa al ESP32. | ⭐⭐ ALTA - Editar con integración |
| `deleteAutomatization` | 226 | **Elimina automatización**. Valida propiedad. | ⭐ MEDIA - Borrar |
| `toggleAutomatization` | 263 | **Activa/desactiva automatización Y notifica ESP32s**. Cuando se desactiva, el ESP32 deja de ejecutar esa regla. | ⭐⭐ ALTA - Control + integración |
| `executeAutomatization` | 307 | **Ejecuta manualmente una automatización**. Permite forzar ejecución, actualiza contadores y guarda en historial. | ⭐ MEDIA - Ejecución manual |
| `getHistory` | 359 | **Obtiene historial de ejecuciones** de una automatización (últimas 50 ejecuciones). | ⭐ MEDIA - Auditoría |

### Backend - Automatize.js (Modelo)

**Ubicación:** `database/models/Automatize.js`

**5 Tipos de Triggers (¿Qué activa la automatización?):**

1. **`horario`** - Se activa a cierta hora
   - `dias` - Array de días (0=Domingo, 1=Lunes, ..., 6=Sábado)
   - `hora` - Hora de activación
   - `horaFin` - Hora de finalización (opcional)
   - `amanecer` - Boolean (activar al amanecer)
   - `atardecer` - Boolean (activar al atardecer)

2. **`sensor`** - Se activa cuando un sensor lee cierto valor
   - `dispositivo` - Referencia al sensor
   - `tipoSensor` - Tipo (temperatura/humedad/luz/movimiento/gas)
   - `condicion.operador` - Comparación (mayor/menor/igual/diferente/rango)
   - `condicion.valor` - Valor a comparar
   - `condicion.valorMax` - Valor máximo (para operador "rango")

3. **`estado_dispositivo`** - Se activa cuando un dispositivo cambia de estado
   - `dispositivo` - Referencia al dispositivo
   - `estadoEsperado` - Estado que debe tener (ON/OFF)

4. **`ubicacion`** - Se activa según ubicación GPS (NO IMPLEMENTADO AÚN)

5. **`manual`** - Solo se ejecuta cuando el usuario presiona el botón

**Condiciones adicionales:**
- Array de condiciones extras que TODAS deben cumplirse
- Cada condición tiene: dispositivo, tipoSensor, operador, valor

**Acciones:**
- Array de acciones a ejecutar cuando se cumple el trigger
- Cada acción tiene:
  - `dispositivo` - Qué dispositivo controlar
  - `accion` - Qué hacer (encender/apagar/toggle/ajustar)
  - `parametros` - Parámetros adicionales (temperatura objetivo, duración, etc)
  - `retardo` - Segundos de espera antes de ejecutar
  - `orden` - Orden de ejecución

**Configuración avanzada:**
- `cooldown` - Tiempo mínimo entre ejecuciones (evita spam)
- `unaVezPorDia` - Solo ejecutar una vez al día
- `revertirAutomaticamente` - Deshacer la acción después de cierto tiempo

**Estadísticas:**
- `ultimaEjecucion` - Fecha de última ejecución
- `totalEjecuciones` - Contador de veces ejecutadas
- `totalFallos` - Contador de errores

**Historial:**
- `historial` - Array de últimas 50 ejecuciones
- Cada registro tiene: fecha, exitoso, mensaje, error

### Frontend - automatize.html

**Ubicación:** `automatize.html` (funciones JavaScript embebidas)

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `loadAutomatizations` | 127 | **⭐⭐⭐ CARGA Y MUESTRA TODAS LAS AUTOMATIZACIONES**<br>Llama al API, obtiene lista y renderiza tarjetas con toggle ON/OFF, información del trigger y acciones. | ⭐⭐⭐ CRÍTICA - Vista principal |
| `toggleAutomation` | 197 | **Activa/desactiva automatización**. Llama a `PUT /api/automatize/:id/toggle` que también notifica al ESP32. | ⭐⭐ ALTA - Control |

**RESUMEN AUTOMATIZACIONES:**
- **Diferencia con Tareas:** Las automatizaciones son reglas permanentes que se evalúan constantemente, las tareas son acciones puntuales
- **5 tipos de triggers:** horario, sensor, estado_dispositivo, ubicacion, manual
- **Integración ESP32:** Al crear/modificar/eliminar automatización se notifica automáticamente al ESP32 con `notifyESP32ConfigUpdate()`
- **Historial:** Guarda últimas 50 ejecuciones en el modelo para auditoría

---

## 6. CÁMARAS DE SEGURIDAD

### Backend - cameraController.js

**Ubicación:** `database/controllers/cameraController.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getCameras` | 7 | **Lista cámaras** con filtro opcional por habitación. | ⭐⭐ ALTA - Vista principal |
| `getCamera` | 37 | **Obtiene cámara específica** con validación de propiedad. | ⭐⭐ ALTA - Detalle |
| `createCamera` | 73 | **Crea cámara nueva**. Valida que la habitación pertenezca al usuario y fuerza estado inicial: activa=true, conectada=true. | ⭐⭐ ALTA - Crear cámara |
| `updateCamera` | 120 | **Actualiza configuración** de cámara (URL stream, resolución, FPS). | ⭐ MEDIA - Editar |
| `deleteCamera` | 160 | **Elimina cámara** con validación. | ⭐ MEDIA - Borrar |
| `toggleCamera` | 197 | **Activa/desactiva cámara**. Cambia el campo `estado.activa`. | ⭐⭐ ALTA - Control ON/OFF |
| `toggleRecording` | 236 | **Activa/desactiva grabación**. Cambia el campo `estado.grabando`. | ⭐⭐ ALTA - Control de grabación |
| `updateConnectionStatus` | 275 | **Actualiza estado de conexión**. Cambia el campo `estado.conectada` (para indicar si la cámara responde). | ⭐ MEDIA - Monitoreo |

### Backend - Camera.js (Modelo)

**Ubicación:** `database/models/Camera.js`

**Campos de una cámara:**
- `nombre` - Nombre de la cámara
- `marca` - Marca (Hikvision, Dahua, etc)
- `modelo` - Modelo específico
- `url` - URL del stream HTTP (para navegador)
- `urlRTSP` - URL RTSP (para aplicaciones)
- `habitacion` - Referencia a habitación
- `usuario` - Referencia a usuario
- `resolucion` - Resolución (1080p, 720p, etc)
- `fps` - Frames por segundo
- `estado.activa` - Si está encendida
- `estado.conectada` - Si está conectada a la red
- `estado.grabando` - Si está grabando

### Frontend - security.html

**Ubicación:** `security.html` (funciones JavaScript embebidas)

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `loadCameras` | 124 | **⭐⭐⭐ CARGA Y MUESTRA TODAS LAS CÁMARAS**<br>Llama al API, obtiene lista y renderiza tarjetas con:<br>- Video stream en vivo<br>- Botón ON/OFF<br>- Botón Grabar<br>- Estado de conexión | ⭐⭐⭐ CRÍTICA - Vista principal de seguridad |
| `updateCameraStatus` | 234 | **Actualiza visualmente el estado**. Cambia color del badge según si está conectada o desconectada. | ⭐ MEDIA - UI |
| `toggleCamera` | 275 | **Enciende/apaga cámara**. Llama al API `PUT /api/cameras/:id/toggle`. | ⭐⭐ ALTA - Control |
| `toggleRecording` | 292 | **Inicia/detiene grabación**. Llama al API `PUT /api/cameras/:id/recording`. | ⭐⭐ ALTA - Control de grabación |
| `editCam` | 309 | **Navega a edición de cámara**. | ⭐ MEDIA - Editar |
| `deleteCam` | 314 | **Elimina cámara con confirmación**. Pide confirmación antes de borrar. | ⭐ MEDIA - Borrar |

### Frontend - cameraedit.html (NUEVA PÁGINA)

**Ubicación:** `cameraedit.html`

**Página para editar/eliminar cámaras de seguridad**. Permite cambiar URL del stream, resolución, FPS, etc.

**RESUMEN CÁMARAS:**
- **3 estados independientes:** activa (ON/OFF), conectada (red), grabando (grabación)
- **Streams:** Soporta URL HTTP (navegador) y URL RTSP (apps)
- **Vista en vivo:** security.html muestra video stream en tiempo real
- **Controles:** Toggle para activar/desactivar y botón separado para grabar

---

## 7. INTEGRACIÓN ESP32

### Backend - espController.js

**Ubicación:** `database/controllers/espController.js`

**ESTA ES LA PARTE MÁS IMPORTANTE PARA INTEGRACIÓN CON HARDWARE ESP32**

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `getESPConfig` | 10 | **⭐⭐⭐ FUNCIÓN MÁS IMPORTANTE DE ESP32**<br>**Endpoint GET que envía configuración completa al ESP32**:<br>1. Lista de dispositivos con: id, nombre, pin GPIO, tipo<br>2. Automatizaciones activas mapeadas con:<br>   - Operadores traducidos (mayor→>, menor→<, igual→==)<br>   - Sensor trigger (dispositivo_id, operador, valor)<br>   - Acción (dispositivo_id, comando ON/OFF, duración)<br>   - **NUEVO:** condicionApagado con sensor de temperatura y valor<br><br>El ESP32 llama a este endpoint al iniciar para saber qué dispositivos controlar y qué reglas ejecutar. | ⭐⭐⭐ CRÍTICA - Configuración ESP32 |
| `reportSensorData` | 133 | **⭐⭐⭐ FUNCIÓN CRÍTICA - RECIBE DATOS DE SENSORES**<br>**Endpoint POST que el ESP32 llama periódicamente**:<br>1. Recibe datos: temperatura, humedad, LDR (luz), PIR (movimiento), MQ2 (gas)<br>2. Guarda cada dato en DeviceData (historial)<br>3. Llama a `checkAndTriggerAutomations()` para ejecutar el motor de reglas<br><br>Este es el flujo principal: ESP32 envía datos → backend evalúa reglas → backend envía comandos de vuelta al ESP32 | ⭐⭐⭐ CRÍTICA - Recepción de datos + Motor |
| `checkAndTriggerAutomations` | 185 | **⭐⭐⭐ MOTOR DE REGLAS - LA FUNCIÓN MÁS COMPLEJA DEL BACKEND**<br>**Evalúa automatizaciones y ejecuta acciones:**<br><br>**Para automatizaciones de HORARIO:**<br>- Compara hora actual con `trigger.horario.hora`<br>- Si coincide, ejecuta acción<br>- Si existe `horaFin`, calcula duración automática<br><br>**Para automatizaciones de SENSOR:**<br>- Obtiene último valor del sensor<br>- Compara usando operador (>, <, ==, !=)<br>- Si se cumple condición, ejecuta acción<br><br>**Envía comandos al ESP32:**<br>- Llama a `enviarComandoESP()` para controlar dispositivo<br>- Guarda evento en historial<br>- Actualiza contadores de automatización | ⭐⭐⭐ CRÍTICA - Motor de automatización |
| `enviarComandoESP` | 288 | **⭐⭐⭐ FUNCIÓN AUXILIAR - ENVÍA COMANDOS AL ESP32**<br>Construye URL: `http://{ip}/control?dispositivo={id}&comando={on\|off}&duration={segundos}`<br>Hace petición HTTP GET al ESP32 físico para que encienda/apague el dispositivo.<br><br>**Ejemplo:**<br>`http://192.168.1.100/control?dispositivo=abc123&comando=on&duration=3600` | ⭐⭐⭐ CRÍTICA - Control físico del hardware |
| `notifyESP32ConfigUpdate` | 300 | **Notifica ESP32s cuando cambia configuración**. Cuando se crea/actualiza/elimina una automatización, avisa a los ESP32s afectados para que recarguen su configuración llamando a `getESPConfig()`. | ⭐⭐ ALTA - Sincronización en tiempo real |

**FLUJO COMPLETO ESP32 ↔ BACKEND:**

```
1. ESP32 INICIA:
   ESP32 → GET /api/esp/esp-config/:habitacionId
   ← Backend envía: dispositivos + automatizaciones

2. ESP32 ENVÍA DATOS PERIÓDICAMENTE (cada 30 seg aprox):
   ESP32 → POST /api/esp/report-data/:habitacionId
           Body: { temperatura: 25, humedad: 60, ldr: 450, pir: 0, mq2: 100 }
   Backend:
   - Guarda datos en DeviceData
   - Evalúa automatizaciones con checkAndTriggerAutomations()
   - Si se cumple regla → enviarComandoESP()
   ← Backend responde: { success: true, comandosEjecutados: [...] }

3. BACKEND ENVÍA COMANDO:
   Backend → GET http://{ip}/control?dispositivo={id}&comando=on&duration=3600
   ← ESP32 enciende dispositivo físicamente

4. USUARIO HACE TOGGLE MANUAL:
   Frontend → PUT /api/devices/:id/toggle
   Backend:
   - Cambia estado en BD
   - Guarda en historial
   - Llama enviarComandoESP()
   Backend → GET http://{ip}/control?dispositivo={id}&comando=off
   ← ESP32 apaga dispositivo

5. SE CREA/MODIFICA AUTOMATIZACIÓN:
   Frontend → POST /api/automatize
   Backend:
   - Guarda automatización
   - Llama notifyESP32ConfigUpdate()
   - ESP32 recibe notificación y vuelve a llamar getESPConfig()
```

**ESTRUCTURA DE CONFIGURACIÓN ENVIADA AL ESP32:**

```json
{
  "id": "692bf58e1085c402b9595abf",
  "nombre": "Sala",
  "ip": "192.168.1.100",
  "dispositivos": [
    {
      "id": "692bf5901085c402b9595ac5",
      "nombre": "Foco Principal",
      "pin": 5,
      "tipo": "luz"
    },
    {
      "id": "692bf5941085c402b9595acb",
      "nombre": "Sensor Temperatura",
      "pin": 4,
      "tipo": "temperatura"
    },
    {
      "id": "692bf5961085c402b9595acd",
      "nombre": "Ventilador",
      "pin": 12,
      "tipo": "actuador"
    }
  ],
  "automatizaciones": [
    {
      "id": "692bf5a01085c402b9595ad5",
      "condicion": {
        "dispositivo_id": "692bf5941085c402b9595acb",
        "operador": ">",
        "valor": 30
      },
      "accion": {
        "dispositivo_id": "692bf5961085c402b9595acd",
        "comando": "ON",
        "duracion": 0
      },
      "condicionApagado": {
        "dispositivo_id": "692bf5941085c402b9595acb",
        "operador": "<",
        "valor": 25
      }
    }
  ]
}
```

**MAPEO DE OPERADORES (línea 88-95 de espController.js):**
- `mayor` → `>`
- `menor` → `<`
- `igual` → `==`
- `diferente` → `!=`
- `rango` → `between` (NO IMPLEMENTADO AÚN en ESP32)

**NUEVA FUNCIONALIDAD - condicionApagado (línea 62-73):**

Cuando la automatización tiene sensor de temperatura para apagar, se incluye en la configuración:

```javascript
condicionApagado: {
  dispositivo_id: accion.parametros.sensorTemperaturaApagar,
  operador: '<',
  valor: accion.parametros.temperaturaApagar
}
```

Esto permite que el ESP32 ejecute tareas mixtas como:
- "Encender ventilador cuando temp > 30°C"
- "Apagar ventilador cuando temp < 25°C"

**RESUMEN ESP32:**
- **getESPConfig()** - ESP32 obtiene configuración al iniciar
- **reportSensorData()** - ESP32 envía datos periódicamente
- **checkAndTriggerAutomations()** - Motor que evalúa reglas
- **enviarComandoESP()** - Envía comandos HTTP al ESP32
- **notifyESP32ConfigUpdate()** - Avisa cuando hay cambios
- **Endpoints públicos:** No requieren JWT para que ESP32 pueda acceder

---

## 8. UTILIDADES Y MIDDLEWARE

### Backend - errorHandler.js

**Ubicación:** `database/middleware/errorHandler.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `errorHandler` | 3 | **⭐⭐⭐ MIDDLEWARE CENTRALIZADO DE ERRORES**<br>Captura todos los errores del backend y los formatea correctamente:<br><br>**Errores de Mongoose:**<br>- Error de validación → 400 con detalles de campos inválidos<br>- Email duplicado → 400 "El email ya está registrado"<br>- ID inválido (CastError) → 404 "Recurso no encontrado"<br><br>**Errores de JWT:**<br>- Token inválido → 401 "No autorizado: Token inválido"<br>- Token expirado → 401 "Token expirado"<br><br>**Errores genéricos:**<br>- Status 500 "Error del servidor" | ⭐⭐⭐ CRÍTICA - Manejo de errores uniforme |

### Frontend - auth.js (Ya documentado arriba)

**Ubicación:** `js/auth.js`

Ya está documentado en la sección 1 (Autenticación).

### Frontend - navbar.js

**Ubicación:** `js/navbar.js`

| Función | Línea | ¿Qué hace? | Importancia |
|---------|-------|------------|-------------|
| `updateNavbar` | 2 | **Actualiza el navbar** según estado de autenticación. Si el usuario está logueado muestra "Logout", si no muestra "Login". | ⭐⭐ ALTA - UX consistente |

### Funciones auxiliares comunes (múltiples archivos HTML)

Estas funciones aparecen en casi todos los HTML:

| Función | ¿Qué hace? | Importancia |
|---------|------------|-------------|
| `getParameterByName(name)` | **Lee parámetros de la URL**. Por ejemplo, si la URL es `devices.html?roomId=123`, esta función obtiene "123". Todas las páginas la usan para navegación. | ⭐⭐⭐ CRÍTICA - Navegación |
| `eraseEnd(name)` | **Limpia parámetros de nombres**. Elimina caracteres extraños de los nombres antes de mostrarlos. | ⭐ MEDIA - UI limpia |
| `displayRoomName()` | **Actualiza el breadcrumb** (navegación superior) con el nombre de la habitación actual. | ⭐ MEDIA - UI |
| `sendRoom()` | **Navega hacia atrás con parámetros de habitación**. Permite volver a la página anterior manteniendo el contexto. | ⭐⭐ ALTA - Navegación |
| `sendDevice()` | **Navega hacia atrás con parámetros de dispositivo**. | ⭐⭐ ALTA - Navegación |
| `sendName()` | **Navega hacia atrás con parámetros de nombre**. | ⭐⭐ ALTA - Navegación |
| `getName()` | **Obtiene nombre de entidad desde URL**. Usado para mostrar nombres en títulos. | ⭐ MEDIA - UI |

### Event Listeners de Bootstrap (múltiples archivos)

Casi todos los HTML tienen event listeners para manejar dropdowns y mostrar/ocultar divs:

```javascript
// Ejemplo común:
document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(dropdown => {
    dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
});
```

Esto hace que los dropdowns de Bootstrap funcionen correctamente en la interfaz.

---

## 9. RESUMEN DE FUNCIONES CRÍTICAS

### 🔴 FUNCIONES CRÍTICAS DEL BACKEND (Sistema no funciona sin ellas)

1. **Autenticación:**
   - `authController.register()` - Registro de usuarios
   - `authController.login()` - Login y generación de JWT
   - `protect middleware` - Protección de rutas
   - `User.pre('save')` hook - Hash de contraseñas
   - `User.matchPassword()` - Validación de login
   - `User.getSignedJwtToken()` - Generación de tokens

2. **Dispositivos:**
   - `deviceController.toggleDevice()` - Control ON/OFF + envío a ESP32
   - `deviceController.getDeviceData()` - Datos históricos para gráficas
   - `deviceController.handleAggregatedData()` - Procesamiento para analytics

3. **ESP32:**
   - `espController.getESPConfig()` - Configuración inicial del ESP32
   - `espController.reportSensorData()` - Recepción de datos de sensores
   - `espController.checkAndTriggerAutomations()` - Motor de reglas
   - `espController.enviarComandoESP()` - Envío de comandos al hardware

4. **Automatizaciones:**
   - `automatizeController.createAutomatization()` - Crear + notificar ESP32
   - `automatizeController.toggleAutomatization()` - Activar/desactivar + notificar

5. **Habitaciones:**
   - `roomController.deleteRoom()` - Eliminación cascade completa

6. **Errores:**
   - `errorHandler middleware` - Manejo centralizado de errores

### 🔴 FUNCIONES CRÍTICAS DEL FRONTEND (UI no funciona sin ellas)

1. **Autenticación:**
   - `auth.js → fetchWithAuth()` - Todas las peticiones autenticadas
   - `auth.js → requireAuth()` - Protección de páginas
   - `auth.js → saveToken() / getToken()` - Persistencia de sesión

2. **Dispositivos:**
   - `deviceinfo.html → loadDeviceInfo()` - Inicializa página de dispositivo
   - `deviceinfo.html → fetchHistoricalData()` - Carga datos para analytics
   - `deviceinfo.html → renderUsageChart()` - Gráfica de barras (consumo)
   - `deviceinfo.html → renderLineChart()` - Gráfica de líneas (sensores)
   - `devices.html → loadDevices()` - Vista principal de dispositivos

3. **Tareas (MÁS COMPLEJAS):**
   - `addtask.html → showFormForDeviceType()` - Formularios dinámicos
   - `addtask.html → loadTempSensors()` - Carga sensores para tareas mixtas
   - `addtask.html → startFanClick()` - Guarda tareas mixtas ventilador
   - `addtask.html → startLightClick()` - Guarda tareas mixtas luz
   - `newtask.html → saveButton listener` - Guarda todas las tareas
   - `taskinfo.html → loadTaskData()` - Carga y pre-llena para edición
   - `taskinfo.html → loadTempSensors()` - Pre-selección de sensores ON/OFF

4. **Habitaciones:**
   - `rooms.html → loadRooms()` - Vista principal de habitaciones

5. **Automatizaciones:**
   - `automatize.html → loadAutomatizations()` - Vista principal

6. **Cámaras:**
   - `security.html → loadCameras()` - Vista principal de seguridad

7. **Navegación:**
   - `getParameterByName()` - Todas las páginas dependen de esto

### 🟡 FUNCIONES COMPLEJAS (Difíciles de entender/modificar)

1. **Backend:**
   - `espController.checkAndTriggerAutomations()` - Motor de reglas con múltiples casos
   - `deviceController.handleAggregatedData()` - Procesamiento complejo de datos

2. **Frontend:**
   - `newtask.html → saveButton listener` - Maneja TODOS los tipos de tareas
   - `taskinfo.html → loadTaskData()` - Carga y mapea todos los campos
   - `addtask.html / newtask.html → startFanClick()` - Lógica de tareas mixtas
   - `deviceinfo.html → renderUsageChart()` - Procesamiento de datos para gráficas

### 📊 ESTADÍSTICAS DEL PROYECTO

- **Backend:**
  - 7 controladores (~1800 líneas)
  - 7 modelos Mongoose
  - 2 middleware (auth + errorHandler)
  - ~50 funciones importantes

- **Frontend:**
  - 14 archivos HTML principales
  - 2 archivos JS de utilidades (auth.js + navbar.js)
  - ~60 funciones importantes
  - Uso intensivo de Bootstrap 5.3.8 y Chart.js 4.5.0

- **Total:** ~110 funciones importantes identificadas
- **Críticas:** ~25 funciones (sin ellas el sistema no funciona)

### 🎯 CAMPOS IMPORTANTES EN BASE DE DATOS

**Para tareas mixtas (automatizaciones):**

```javascript
// Encendido por temperatura:
trigger.sensor.dispositivo // ID del sensor que activa encendido
trigger.sensor.condicion.operador // "mayor" o "menor"
trigger.sensor.condicion.valor // Temperatura de encendido

// Apagado por temperatura:
accion.parametros.sensorTemperaturaApagar // ID del sensor para apagar
accion.parametros.temperaturaApagar // Temperatura de apagado

// Encendido/apagado por hora:
trigger.horario.hora // Hora de encendido
trigger.horario.horaFin // Hora de apagado (opcional)

// Para luz con sensor:
accion.parametros.sensorLuz // ID del sensor de luz
```

**Para dispositivos:**
```javascript
estado.encendido // Boolean - Si está encendido
estado.valor // Mixed - Valor actual (temperatura, etc)
pin // Number - Pin GPIO del ESP32
tipo // String - Tipo de dispositivo (7 opciones)
```

**Para habitaciones:**
```javascript
ip // String - IP del ESP32 para enviar comandos
```

### 🔍 PARA LA DOCUMENTADORA

**Prioridades al documentar:**

1. **ALTA PRIORIDAD (documentar primero):**
   - Flujo de autenticación (login/registro/JWT)
   - Flujo ESP32 (cómo se comunica con backend)
   - Motor de reglas (checkAndTriggerAutomations)
   - Tareas mixtas (cómo se guardan/cargan)
   - Sistema de gráficas (cómo se procesan datos)

2. **MEDIA PRIORIDAD:**
   - CRUD de habitaciones/dispositivos/cámaras
   - Sistema de vida útil de dispositivos
   - Navegación entre páginas

3. **BAJA PRIORIDAD:**
   - Funciones auxiliares de UI
   - Event listeners de Bootstrap
   - Funciones de formateo

**Archivos más complejos (necesitan más documentación):**
1. `espController.js` - Integración ESP32
2. `newtask.html` - Creación de tareas
3. `taskinfo.html` - Edición de tareas
4. `deviceinfo.html` - Analytics de dispositivos
5. `deviceController.js` - Control de dispositivos

---

## FIN DEL DOCUMENTO

**Fecha de creación:** 2025-12-03
**Proyecto:** KYROS - Sistema de gestión de hogar inteligente IoT
**Propósito:** Guía completa de funciones para equipo de documentación

Si tienes dudas sobre alguna función o necesitas más detalles, revisa el código fuente en las ubicaciones indicadas.
