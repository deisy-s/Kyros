# Notas para la Documentadora - Sistema KYROS

Este documento contiene información técnica del sistema KYROS para facilitar la creación del manual de usuario y documentación técnica.

---

## 1. DESCRIPCIÓN GENERAL DEL SISTEMA

**KYROS** es una aplicación web de gestión de dispositivos IoT (Internet de las Cosas) para hogares inteligentes que permite:
- Gestionar habitaciones de una casa
- Controlar dispositivos inteligentes (luces, sensores, ventiladores, cámaras)
- Programar tareas automáticas
- Monitorear seguridad mediante cámaras
- Visualizar datos históricos de dispositivos

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Tecnologías Utilizadas

| Componente | Tecnología | Versión | Propósito |
|------------|-----------|---------|-----------|
| **Frontend** | HTML5 + JavaScript + Bootstrap | 5.3.8 | Interfaz de usuario |
| **Backend** | Node.js + Express | 5.1.0 | Servidor y API REST |
| **Base de datos** | MongoDB Atlas | - | Almacenamiento en la nube |
| **Autenticación** | JWT (JSON Web Tokens) | - | Sesiones seguras |
| **Encriptación** | bcryptjs | - | Protección de contraseñas |

### 2.2 Estructura de Carpetas del Backend

```
database/                           # Carpeta principal del backend
├── config/                         # Configuraciones
│   └── database.js                 # Conexión a MongoDB Atlas
│
├── controllers/                    # Lógica de negocio
│   ├── authController.js           # Registro, login, perfil
│   ├── roomController.js           # CRUD de habitaciones
│   ├── deviceController.js         # CRUD de dispositivos IoT
│   ├── cameraController.js         # Gestión de cámaras
│   ├── taskController.js           # Tareas programadas
│   └── automatizeController.js     # Reglas de automatización
│
├── middleware/                     # Funciones intermedias
│   ├── auth.js                     # Protección de rutas (JWT)
│   └── errorHandler.js             # Manejo centralizado de errores
│
├── models/                         # Esquemas de base de datos
│   ├── User.js                     # Usuarios del sistema
│   ├── Room.js                     # Habitaciones
│   ├── Device.js                   # Dispositivos IoT
│   ├── DeviceData.js               # Datos históricos/telemetría
│   ├── Camera.js                   # Cámaras de seguridad
│   ├── Task.js                     # Tareas programadas
│   └── Automatize.js               # Reglas de automatización
│
├── routes/                         # Definición de endpoints
│   ├── auth.js                     # Rutas de autenticación
│   ├── rooms.js                    # Rutas de habitaciones
│   ├── devices.js                  # Rutas de dispositivos
│   ├── cameras.js                  # Rutas de cámaras
│   ├── tasks.js                    # Rutas de tareas
│   └── automatize.js               # Rutas de automatización
│
├── .env                            # Variables de entorno (SECRETO)
├── .env.example                    # Plantilla de configuración
├── server.js                       # Archivo principal del servidor
├── package.json                    # Dependencias del proyecto
└── README.md                       # Documentación técnica
```

---

## 3. FUNCIÓN DE CADA COMPONENTE

### 3.1 Controllers (Controladores)

Los controladores contienen la **lógica de negocio** - es decir, qué hace el sistema cuando el usuario realiza una acción.

#### **authController.js** - Control de Usuarios
- **Registro (`register`)**: Crea una nueva cuenta de usuario
  - Verifica que el email no esté duplicado
  - Encripta la contraseña con bcrypt
  - Genera un token JWT para la sesión

- **Login (`login`)**: Inicia sesión
  - Verifica email y contraseña
  - Compara contraseña encriptada
  - Devuelve token JWT válido por 7 días

- **Perfil (`getMe`)**: Obtiene datos del usuario actual
  - Requiere autenticación
  - Devuelve nombre, email, tipo de usuario

- **Actualizar perfil (`updateProfile`)**: Modifica datos personales
- **Cambiar contraseña (`updatePassword`)**: Cambia la contraseña

#### **roomController.js** - Gestión de Habitaciones
- **Listar habitaciones (`getRooms`)**: Muestra todas las habitaciones del usuario
- **Obtener habitación (`getRoom`)**: Detalles de una habitación específica
- **Crear habitación (`createRoom`)**: Agrega una nueva habitación
- **Actualizar habitación (`updateRoom`)**: Modifica nombre o descripción
- **Eliminar habitación (`deleteRoom`)**: Borra una habitación
- **Dispositivos de habitación (`getRoomDevices`)**: Lista dispositivos en esa habitación

#### **deviceController.js** - Control de Dispositivos
- **Listar dispositivos (`getDevices`)**: Muestra todos los dispositivos del usuario
  - Puede filtrar por tipo (luz, sensor, etc.)
  - Puede filtrar por habitación

- **Obtener dispositivo (`getDevice`)**: Detalles de un dispositivo
- **Crear dispositivo (`createDevice`)**: Agrega un nuevo dispositivo
- **Actualizar dispositivo (`updateDevice`)**: Modifica configuración
- **Eliminar dispositivo (`deleteDevice`)**: Borra un dispositivo
- **Encender/Apagar (`toggleDevice`)**: Cambia el estado del dispositivo
- **Obtener datos (`getDeviceData`)**: Histórico de telemetría

#### **cameraController.js** - Cámaras de Seguridad
- Control de cámaras de vigilancia
- Grabación y detección de movimiento
- URLs de streaming en vivo
- Grabaciones históricas

#### **taskController.js** - Tareas Programadas
- **Crear tarea**: Programa una acción automática
  - Ej: "Encender luz de sala a las 6:00 PM"
- **Tipos de tareas**:
  - **Manual**: Se ejecuta bajo demanda
  - **Programada**: Se ejecuta en horario específico
  - **Evento**: Se activa por una condición (temperatura, movimiento, etc.)

#### **automatizeController.js** - Automatización Avanzada
- Reglas complejas con múltiples condiciones
- Ej: "Si temperatura > 25°C Y hora > 2:00 PM, entonces encender ventilador"

### 3.2 Middleware (Funciones Intermedias)

#### **auth.js** - Protección de Rutas
```javascript
protect() // Verifica que el usuario tenga un token JWT válido
authorize('admin', 'usuario') // Verifica permisos por rol
```

**Cómo funciona:**
1. Usuario envía petición con token en el header
2. Middleware verifica que el token sea válido
3. Si es válido, permite el acceso
4. Si no, devuelve error 401 (No autorizado)

#### **errorHandler.js** - Manejo de Errores
Captura todos los errores y los formatea de manera consistente:
```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "Detalles técnicos"
}
```

### 3.3 Models (Modelos de Datos)

Los modelos definen **la estructura de los datos** en la base de datos.

#### **User.js** - Usuario
```javascript
{
  nombre: String,           // Nombre completo
  email: String,            // Correo (único)
  password: String,         // Contraseña encriptada
  rol: String,              // 'usuario' o 'admin'
  activo: Boolean,          // ¿Cuenta activa?
  createdAt: Date           // Fecha de registro
}
```

#### **Room.js** - Habitación
```javascript
{
  nombre: String,           // "Sala", "Cocina", etc.
  descripcion: String,      // Descripción opcional
  usuario: ObjectId,        // Dueño de la habitación
  icono: String,            // Nombre del icono
  dispositivos: [ObjectId]  // Lista de dispositivos
}
```

#### **Device.js** - Dispositivo IoT
```javascript
{
  nombre: String,           // "Foco 1", "Sensor de temperatura"
  tipo: String,             // 'luz', 'sensor', 'ventilador'
  habitacion: ObjectId,     // Habitación donde está
  usuario: ObjectId,        // Dueño
  estado: Boolean,          // true = encendido, false = apagado
  conexion: String,         // IP o identificador de conexión
  configuracion: Object,    // Parámetros específicos
  ultimaActividad: Date     // Última vez que se usó
}
```

#### **DeviceData.js** - Datos del Dispositivo
```javascript
{
  dispositivo: ObjectId,    // Dispositivo que generó el dato
  tipo: String,             // 'temperatura', 'humedad', 'estado'
  valor: Number,            // Valor numérico
  unidad: String,           // '°C', '%', etc.
  timestamp: Date           // Cuándo se registró
}
```

#### **Camera.js** - Cámara
```javascript
{
  nombre: String,
  habitacion: ObjectId,
  usuario: ObjectId,
  streaming: {
    urlPrincipal: String,   // URL de video en vivo
    tipo: String            // 'rtsp', 'http', etc.
  },
  estado: {
    activa: Boolean,        // ¿Cámara activa?
    grabando: Boolean,      // ¿Grabando ahora?
    deteccionMovimiento: Boolean
  },
  grabaciones: [Object]     // Historial de grabaciones
}
```

#### **Task.js** - Tarea Programada
```javascript
{
  nombre: String,
  usuario: ObjectId,
  tipo: String,             // 'manual', 'programada', 'evento'
  estado: String,           // 'pendiente', 'completada', 'fallida'
  activa: Boolean,
  programacion: {
    tipo: String,           // 'una_vez', 'diaria', 'semanal'
    hora: String,           // "18:00"
    diasSemana: [Number]    // [0,1,2,3,4,5,6]
  },
  acciones: [{
    dispositivo: ObjectId,
    accion: String,         // 'encender', 'apagar', 'ajustar'
    parametros: Object      // Valores específicos
  }],
  ultimaEjecucion: Date,
  proximaEjecucion: Date
}
```

#### **Automatize.js** - Regla de Automatización
```javascript
{
  nombre: String,
  usuario: ObjectId,
  activa: Boolean,
  condiciones: [{
    tipo: String,           // 'temperatura', 'movimiento', 'hora'
    operador: String,       // 'mayor', 'menor', 'igual'
    valor: Mixed,           // Valor a comparar
    dispositivo: ObjectId
  }],
  acciones: [{
    dispositivo: ObjectId,
    accion: String
  }],
  modo: String              // 'and' (todas) u 'or' (cualquiera)
}
```

---

## 4. SEGURIDAD DEL SISTEMA

### 4.1 Autenticación JWT (JSON Web Tokens)

**¿Qué es JWT?**
- Es como un "pase de entrada" digital
- Se genera al iniciar sesión
- Cada petición al servidor debe incluirlo
- Es válido por 7 días

**Proceso de autenticación:**
1. Usuario ingresa email y contraseña
2. Servidor verifica credenciales
3. Si son correctas, genera un token JWT
4. Usuario guarda el token en `localStorage`
5. En cada petición, envía el token en el header
6. Servidor verifica el token antes de responder

### 4.2 Encriptación de Contraseñas

**Tecnología:** bcryptjs con 10 salt rounds

**¿Qué significa?**
- Las contraseñas NUNCA se guardan en texto plano
- Se convierten en un hash irreversible
- Ej: "mipassword123" → "$2a$10$rEjK..."
- Aunque alguien vea la base de datos, no puede leer las contraseñas

### 4.3 Variables de Entorno (.env)

**Archivo crítico que NO debe compartirse:**
```
MONGO_URI=mongodb+srv://usuario:contraseña@cluster...
JWT_SECRET=clave_secreta_super_larga_y_aleatoria
JWT_EXPIRE=7d
NODE_ENV=development
PORT=3000
```

**IMPORTANTE para la documentación:**
- Explicar que cada instalación necesita su propio archivo .env
- Usar .env.example como plantilla
- NUNCA publicar .env en repositorios públicos

### 4.4 Protección de Rutas

**Rutas públicas** (no requieren autenticación):
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Iniciar sesión

**Rutas protegidas** (requieren JWT):
- Todas las demás rutas del sistema
- Si no hay token válido, responde con error 401

### 4.5 CORS (Cross-Origin Resource Sharing)

**Estado actual:** Habilitado para todos los orígenes (`*`)
- **En desarrollo:** OK
- **En producción:** Debe configurarse solo para el dominio específico

---

## 5. CÓMO INICIAR EL SISTEMA

### 5.1 Requisitos Previos

**Software necesario:**
1. **Node.js** (versión 14 o superior)
   - Descargar de: https://nodejs.org
   - Verificar instalación: `node --version`

2. **npm** (se instala con Node.js)
   - Verificar: `npm --version`

3. **Cuenta de MongoDB Atlas** (base de datos en la nube)
   - Registrarse en: https://www.mongodb.com/cloud/atlas

### 5.2 Configuración Inicial

#### Paso 1: Clonar o descargar el proyecto
```bash
# Si se usa git
git clone [url-del-repositorio]
cd Kyros2.0
```

#### Paso 2: Instalar dependencias del backend
```bash
cd database
npm install
```

**¿Qué hace esto?**
- Lee el archivo `package.json`
- Descarga todas las librerías necesarias (express, mongoose, bcrypt, etc.)
- Las guarda en la carpeta `node_modules/`

#### Paso 3: Configurar variables de entorno
```bash
# Copiar la plantilla
cp .env.example .env

# Editar el archivo .env con un editor de texto
nano .env  # o usar cualquier editor
```

**Contenido del .env:**
```
MONGO_URI=mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/kyros
JWT_SECRET=tu_clave_secreta_muy_larga_y_dificil_de_adivinar
JWT_EXPIRE=7d
NODE_ENV=development
PORT=3000
```

**Obtener MONGO_URI:**
1. Ir a MongoDB Atlas (cloud.mongodb.com)
2. Crear un cluster (o usar uno existente)
3. Click en "Connect" → "Connect your application"
4. Copiar la cadena de conexión
5. Reemplazar `<password>` con la contraseña real

### 5.3 Iniciar el Servidor

#### Modo Desarrollo (con auto-reload)
```bash
npm run dev
```
**Explicación:**
- Usa `nodemon` que reinicia el servidor al detectar cambios
- Ideal para desarrollo

#### Modo Producción
```bash
npm start
```
**Explicación:**
- Inicia el servidor sin auto-reload
- Más eficiente para producción

#### Verificar que funciona
```
✓ Mensaje en consola:
  "Servidor corriendo en http://localhost:3000"
  "Base de datos conectada"
```

### 5.4 Acceder a la Aplicación

1. Abrir navegador web
2. Ir a: `http://localhost:3000`
3. Verás la página de inicio de KYROS
4. Registrarte o iniciar sesión

---

## 6. ENDPOINTS DEL API (Para Referencia)

### 6.1 Autenticación

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Crear nueva cuenta | No |
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/me` | Obtener perfil | Sí |
| PUT | `/api/auth/updateprofile` | Actualizar perfil | Sí |
| PUT | `/api/auth/updatepassword` | Cambiar contraseña | Sí |

### 6.2 Habitaciones

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/api/rooms` | Listar habitaciones | Sí |
| POST | `/api/rooms` | Crear habitación | Sí |
| GET | `/api/rooms/:id` | Ver habitación | Sí |
| PUT | `/api/rooms/:id` | Actualizar habitación | Sí |
| DELETE | `/api/rooms/:id` | Eliminar habitación | Sí |
| GET | `/api/rooms/:id/devices` | Dispositivos de habitación | Sí |

### 6.3 Dispositivos

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/api/devices` | Listar dispositivos | Sí |
| POST | `/api/devices` | Crear dispositivo | Sí |
| GET | `/api/devices/:id` | Ver dispositivo | Sí |
| PUT | `/api/devices/:id` | Actualizar dispositivo | Sí |
| DELETE | `/api/devices/:id` | Eliminar dispositivo | Sí |
| PUT | `/api/devices/:id/toggle` | Encender/Apagar | Sí |
| GET | `/api/devices/:id/data` | Datos históricos | Sí |

### 6.4 Cámaras

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/api/cameras` | Listar cámaras | Sí |
| POST | `/api/cameras` | Crear cámara | Sí |
| GET | `/api/cameras/:id` | Ver cámara | Sí |
| PUT | `/api/cameras/:id` | Actualizar cámara | Sí |
| DELETE | `/api/cameras/:id` | Eliminar cámara | Sí |
| PUT | `/api/cameras/:id/toggle` | Activar/Desactivar | Sí |

### 6.5 Tareas

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/api/tasks` | Listar tareas | Sí |
| POST | `/api/tasks` | Crear tarea | Sí |
| GET | `/api/tasks/:id` | Ver tarea | Sí |
| PUT | `/api/tasks/:id` | Actualizar tarea | Sí |
| DELETE | `/api/tasks/:id` | Eliminar tarea | Sí |
| POST | `/api/tasks/:id/execute` | Ejecutar tarea | Sí |

### 6.6 Automatización

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/api/automatize` | Listar reglas | Sí |
| POST | `/api/automatize` | Crear regla | Sí |
| GET | `/api/automatize/:id` | Ver regla | Sí |
| PUT | `/api/automatize/:id` | Actualizar regla | Sí |
| DELETE | `/api/automatize/:id` | Eliminar regla | Sí |
| PUT | `/api/automatize/:id/toggle` | Activar/Desactivar | Sí |

---

## 7. FLUJOS DE USUARIO (Para Manual)

### 7.1 Registro e Inicio de Sesión

**Flujo de Registro:**
1. Usuario hace clic en "Registrarse"
2. Completa formulario: nombre, email, contraseña
3. Sistema verifica que el email no exista
4. Crea cuenta y automáticamente inicia sesión
5. Genera token JWT válido por 7 días
6. Redirige a página de habitaciones

**Flujo de Login:**
1. Usuario ingresa email y contraseña
2. Sistema verifica credenciales
3. Si son correctas, genera token JWT
4. Guarda token en el navegador
5. Redirige a página principal

### 7.2 Gestión de Habitaciones

**Crear Habitación:**
1. Clic en "Agregar habitación"
2. Ingresar nombre (ej: "Sala", "Cocina")
3. Opcional: Ingresar IP del ESP32
4. Clic en "Guardar"
5. Habitación aparece en la lista

**Editar Habitación:**
1. Clic en el ícono de lápiz junto a la habitación
2. Modificar nombre o IP
3. Clic en "Guardar"
4. Cambios se reflejan inmediatamente

**Eliminar Habitación:**
1. Clic en el ícono de lápiz
2. Clic en "Eliminar"
3. Confirmar eliminación
4. Habitación y dispositivos asociados se eliminan

### 7.3 Gestión de Dispositivos

**Agregar Dispositivo:**
1. Entrar a una habitación
2. Clic en "Agregar dispositivo"
3. Seleccionar tipo (Foco, Sensor, etc.)
4. Ingresar nombre
5. Opcional: Configuración de conexión
6. Clic en "Guardar"

**Controlar Dispositivo:**
1. Entrar a la habitación
2. Clic en el dispositivo
3. Ver estado actual (encendido/apagado)
4. Usar el switch para cambiar estado
5. Ver gráfica de datos históricos

**Editar Dispositivo:**
1. En la lista de dispositivos, clic en ícono de lápiz
2. Modificar nombre, tipo o conexión
3. Clic en "Guardar"

**Eliminar Dispositivo:**
1. Clic en ícono de lápiz
2. Clic en "Eliminar"
3. Confirmar eliminación

### 7.4 Programación de Tareas

**Crear Tarea:**
1. Ir a "Automatización"
2. Clic en "Agregar tarea"
3. Ingresar nombre de la tarea
4. Seleccionar dispositivo
5. Configurar horario o condiciones
6. Clic en "Guardar"

**Tipos de Tareas:**

**A) Tarea de Luz:**
- Encender a cierta hora
- Apagar a cierta hora
- Encender cuando no hay luz (sensor)
- Apagar cuando hay luz

**B) Tarea de Ventilador:**
- Encender a cierta hora
- Encender cuando temperatura > X°C
- Apagar a cierta hora
- Apagar cuando temperatura < X°C

**C) Tarea de Alarma:**
- Sonar a cierta hora específica

---

## 8. MENSAJES DE ERROR COMUNES

### 8.1 Errores de Servidor

| Error | Significado | Solución |
|-------|-------------|----------|
| `Cannot connect to MongoDB` | No se puede conectar a la base de datos | Verificar MONGO_URI en .env |
| `JWT malformed` | Token inválido | Cerrar sesión e iniciar de nuevo |
| `User not found` | Usuario no existe | Verificar email o registrarse |
| `Invalid credentials` | Contraseña incorrecta | Verificar contraseña |
| `Port 3000 already in use` | Puerto ocupado | Cerrar otra instancia del servidor |

### 8.2 Errores de Cliente

| Error | Significado | Solución |
|-------|-------------|----------|
| `Error al cargar habitaciones` | No se pudo conectar al servidor | Verificar que el servidor esté corriendo |
| `No autorizado` | Token expirado o inválido | Iniciar sesión nuevamente |
| `Error al crear dispositivo` | Falta información requerida | Completar todos los campos |

---

## 9. ESTRUCTURA DE RESPUESTAS DEL API

### 9.1 Respuesta Exitosa

```json
{
  "success": true,
  "count": 5,
  "data": {
    // Datos solicitados
  },
  "message": "Operación exitosa"
}
```

### 9.2 Respuesta con Error

```json
{
  "success": false,
  "error": "Descripción del error",
  "message": "Mensaje amigable para el usuario"
}
```

---

## 10. FUNCIONES DEL FRONTEND

### 10.1 Utilidades de Autenticación (js/auth.js)

```javascript
// Funciones principales:

requireAuth()              // Protege páginas, redirige al login si no hay sesión
setAuthToken(token)        // Guarda token en localStorage
getAuthToken()             // Recupera token guardado
removeAuthToken()          // Elimina token (cerrar sesión)
fetchWithAuth(url, options) // Hace peticiones con autenticación automática
```

### 10.2 Funciones de Navegación

```javascript
// Pasar parámetros entre páginas:
window.location.href = `devices.html?roomId=${id}&roomname=${name}`

// Leer parámetros:
getParameterByName('roomId')  // Extrae valores de la URL
```

---

## 11. BASE DE DATOS (MongoDB)

### 11.1 Colecciones

La base de datos "kyros" contiene 7 colecciones:

1. **users** - Cuentas de usuario
2. **rooms** - Habitaciones
3. **devices** - Dispositivos IoT
4. **devices_data** - Telemetría y datos históricos
5. **cameras** - Cámaras de seguridad
6. **tasks** - Tareas programadas
7. **automatize** - Reglas de automatización

### 11.2 Relaciones entre Colecciones

```
Usuario (User)
    └── Habitaciones (Room)
            └── Dispositivos (Device)
                    └── Datos (DeviceData)

    └── Cámaras (Camera)

    └── Tareas (Task)
            └── Acciones → Dispositivos

    └── Reglas (Automatize)
            └── Condiciones → Dispositivos
            └── Acciones → Dispositivos
```

---

## 12. PALABRAS CLAVE PARA GLOSARIO

| Término | Definición |
|---------|------------|
| **API REST** | Interfaz de programación que permite comunicación entre frontend y backend |
| **JWT** | Token de autenticación que identifica al usuario |
| **Middleware** | Funciones que procesan peticiones antes de llegar al controlador |
| **Endpoint** | URL específica del API que realiza una función |
| **CRUD** | Create, Read, Update, Delete - Operaciones básicas de datos |
| **Hash** | Transformación irreversible de texto (usado en contraseñas) |
| **Token** | Clave temporal de autenticación |
| **IoT** | Internet of Things - Dispositivos conectados a internet |
| **Schema** | Estructura de datos definida en un modelo |
| **Telemetría** | Datos enviados automáticamente por dispositivos |

---

## 13. RECOMENDACIONES PARA EL MANUAL

### 13.1 Secciones Sugeridas

1. **Introducción**
   - ¿Qué es KYROS?
   - Beneficios del sistema
   - Requisitos mínimos

2. **Instalación**
   - Paso a paso (usar sección 5 de este documento)
   - Capturas de pantalla
   - Solución de problemas comunes

3. **Primeros Pasos**
   - Crear cuenta
   - Agregar primera habitación
   - Agregar primer dispositivo

4. **Uso del Sistema**
   - Gestión de habitaciones (con capturas)
   - Control de dispositivos
   - Programación de tareas
   - Monitoreo de cámaras
   - Reglas de automatización

5. **Referencia Rápida**
   - Glosario de términos
   - Preguntas frecuentes
   - Tabla de iconos

6. **Solución de Problemas**
   - Errores comunes (usar sección 8)
   - Contacto de soporte

### 13.2 Capturas de Pantalla Necesarias

- [ ] Página de inicio
- [ ] Formulario de registro
- [ ] Formulario de login
- [ ] Lista de habitaciones
- [ ] Formulario agregar habitación
- [ ] Lista de dispositivos
- [ ] Formulario agregar dispositivo
- [ ] Página de información del dispositivo
- [ ] Gráfica de datos históricos
- [ ] Formulario de tarea
- [ ] Lista de tareas
- [ ] Página de seguridad (cámaras)

### 13.3 Diagramas Recomendados

1. **Diagrama de arquitectura**
   - Frontend → Backend → Base de datos

2. **Flujo de autenticación**
   - Login → Token → Peticiones protegidas

3. **Flujo de control de dispositivos**
   - Usuario → Interfaz → API → Dispositivo físico

---

## 14. CONTACTO Y SOPORTE

**Desarrolladores:**
- Instituto Tecnológico Superior de Guasave
- Contacto: 687-123-4567
- Email: test@outlook.com

**Repositorio de código:**
- GitHub: https://github.com/Johlus/Kyros2.0

---

## NOTAS FINALES

- Este documento está actualizado a la fecha del último commit
- La arquitectura puede cambiar en futuras versiones
- Consultar el README.md del proyecto para detalles técnicos adicionales
- Los archivos de prueba (.md) en la raíz contienen ejemplos de uso del API

---

## 15. SIMPLIFICACIÓN DEL MODELO DE DISPOSITIVOS Y CARGA DINÁMICA

### 15.1 Simplificación del Modelo Device.js

#### **Problema Anterior:**
El modelo `Device.js` tenía muchos campos que no se utilizaban en la aplicación, lo que hacía el código más complejo y difícil de mantener.

#### **Cambios Realizados:**
Se **eliminaron campos innecesarios** y se simplificó a solo los campos esenciales:

**Antes (modelo complejo):**
```javascript
{
  nombre: String,
  tipo: String,
  habitacion: ObjectId,
  usuario: ObjectId,
  estado: Boolean,
  conexion: String,           // ❌ Eliminado
  estado_bateria: Number,     // ❌ Eliminado
  configuracion: Object,      // ❌ Eliminado
  ultimaActividad: Date,      // ❌ Eliminado
  // ... muchos otros campos
}
```

**Después (modelo simplificado):**
```javascript
{
  nombre: String,             // Nombre del dispositivo
  tipo: String,               // 'luz', 'temperatura', 'actuador', 'camara'
  habitacion: ObjectId,       // Referencia a la habitación
  usuario: ObjectId,          // Dueño del dispositivo
  pin: Number,                // Pin GPIO del ESP32 (nuevo campo)
  estado: Boolean             // true = encendido, false = apagado
}
```

#### **Nuevos Tipos de Dispositivos Estandarizados:**
- `luz` - Focos, lámparas
- `temperatura` - Sensores de temperatura/humedad
- `actuador` - Ventiladores, motores, relés
- `camara` - Cámaras de seguridad (se manejan en colección separada)

#### **Campo Nuevo: `pin`**
- Número del pin GPIO en el ESP32 (ej: 17, 23, 25)
- Esencial para que el ESP32 sepa qué pin controlar
- Requerido para dispositivos físicos (no para cámaras)

### 15.2 Simplificación del Modelo Room.js

#### **Campo Nuevo: `ip`**
Se agregó el campo `ip` para almacenar la dirección IP del ESP32 asignado a cada habitación:

```javascript
{
  nombre: String,
  descripcion: String,
  usuario: ObjectId,
  icono: String,
  ip: String                  // IP del ESP32 (ej: "192.168.0.28")
}
```

**Uso:**
- Permite identificar qué ESP32 controla cada habitación
- Se usa en el endpoint `/api/esp-config/:habitacionId` para dispositivos IoT

### 15.3 Carga Dinámica de Dispositivos

#### **Archivos Modificados:**
- `deviceedit.html` - Editar dispositivo
- `adddevice.html` - Agregar dispositivo

#### **Cambios en la Interfaz:**

**Antes:**
- Dropdown con tipos hardcodeados: "Alarma", "Cámara", "Foco", "Sensor de humo", etc.
- Campos: Nombre, Conexión (sin uso real)

**Después:**
- Dropdown simplificado con tipos estándar: "Luz", "Temperatura", "Actuador", "Cámara"
- Campos: Nombre, **Pin del dispositivo** (número)
- Validación: Solo cámaras usan "URL de conexión", el resto usa "Pin"

**Código del dropdown (adddevice.html):**
```html
<ul class="dropdown-menu w-100" id="tableMenu">
    <li><a class="dropdown-item" href="#" data-type="luz">Luz</a></li>
    <li><a class="dropdown-item" href="#" data-type="temperatura">Temperatura</a></li>
    <li><a class="dropdown-item" href="#" data-type="actuador">Actuador</a></li>
    <li><a class="dropdown-item" href="#" data-type="camara">Cámara</a></li>
</ul>
```

**JavaScript - Cambio de campos según tipo:**
```javascript
if (selectedDeviceType === 'camara') {
    // Mostrar campo de URL de conexión
    pinInput.style.display = 'none';
    connectionInput.style.display = 'block';
} else {
    // Mostrar campo de Pin
    pinInput.style.display = 'block';
    connectionInput.style.display = 'none';
}
```

#### **Funciones de Carga y Guardado:**

**deviceedit.html - Cargar datos (línea 216):**
```javascript
async function loadDeviceData() {
    const response = await fetchWithAuth(`${API_URL}/devices/${deviceId}`);
    const device = data.data;

    // Cargar en los campos
    deviceNameInput.value = device.nombre;
    pinInput.value = device.pin || '';
    selectedDeviceType = device.tipo;

    // Mostrar en dropdown
    const displayType = typeDisplayMap[device.tipo] || device.tipo;
    document.getElementById('dropdownMenuButton').textContent = displayType;
}
```

**deviceedit.html - Guardar cambios (línea 250):**
```javascript
// PUT a /api/devices/:id
await fetchWithAuth(`${API_URL}/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({
        nombre: deviceName,
        tipo: selectedDeviceType,
        pin: parseInt(pinValue),
        habitacion: device.habitacion
    })
});
```

### 15.4 Carga Dinámica de Tareas/Automatizaciones

#### **Archivos Modificados:**
- `automatize.html` - Lista de automatizaciones
- `taskinfo.html` - Editar automatización
- `addtask.html` - Crear automatización

#### **automatize.html - Carga Dinámica (línea 122):**

**Antes:**
- HTML estático con una tarea hardcodeada
- No se actualizaba con datos reales

**Después:**
- Carga todas las automatizaciones desde `/api/automatize`
- Renderiza dinámicamente cada automatización
- Switch funcional para activar/desactivar

**Código de carga:**
```javascript
async function loadAutomatizations() {
    const response = await fetchWithAuth(`${API_URL}/automatize`);
    const data = await response.json();

    if (data.success && data.data.length > 0) {
        data.data.forEach((auto, index) => {
            // Obtener descripción de la acción
            let descripcion = 'Sin acción';
            if (auto.acciones && auto.acciones.length > 0) {
                const accion = auto.acciones[0];
                const dispositivo = accion.dispositivo?.nombre || 'Dispositivo';
                const accionText = accion.accion === 'encender' ? 'Encender' :
                                 accion.accion === 'apagar' ? 'Apagar' :
                                 accion.accion;
                descripcion = `${accionText} ${dispositivo}`;

                // Agregar horario si existe
                if (auto.trigger?.horario?.hora) {
                    descripcion += ` a las ${auto.trigger.horario.hora}`;
                }
            }

            // Crear elemento HTML
            const taskSection = document.createElement('div');
            taskSection.innerHTML = `
                <div class="col-lg-10 col-sm-10" onclick="...">
                    <img src="images/Bag-Suitcase-4--Streamline-Flex.png">
                    <h2>${auto.nombre}</h2>
                    <p>${descripcion}</p>
                </div>
                <div class="col-lg-2 col-sm-2">
                    <label class="switch">
                        <input type="checkbox" ${auto.activa ? 'checked' : ''}
                               onchange="toggleAutomation('${auto._id}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                </div>
            `;

            // Insertar en el DOM
            container.insertBefore(taskSection, addButton);
        });
    }
}
```

**Función de toggle (activar/desactivar):**
```javascript
async function toggleAutomation(automationId, isActive) {
    await fetchWithAuth(`${API_URL}/automatize/${automationId}`, {
        method: 'PUT',
        body: JSON.stringify({ activa: isActive })
    });
}
```

#### **taskinfo.html - Edición de Automatizaciones:**

**Cambios importantes:**
1. **Dropdown de dispositivos dinámico** (antes era input de solo lectura)
2. **Carga de datos de la automatización** desde API
3. **Formularios específicos por tipo de dispositivo** (luz, temperatura, actuador)

**Función showFormForDeviceType (línea 251):**
```javascript
function showFormForDeviceType(tipo) {
    // Ocultar todos los formularios
    lightDiv.style.display = 'none';
    fanDiv.style.display = 'none';
    alarmDiv.style.display = 'none';
    actuadorDiv.style.display = 'none';

    // Mostrar el formulario correcto
    if (tipo === 'luz') {
        lightDiv.style.display = 'block';
    } else if (tipo === 'temperatura') {
        fanDiv.style.display = 'block';
    } else if (tipo === 'actuador') {
        actuadorDiv.style.display = 'block';
    }
}
```

**Carga de dispositivos disponibles (línea 251):**
```javascript
async function loadDevices(currentDeviceType) {
    const response = await fetchWithAuth(`${API_URL}/devices`);
    const data = await response.json();

    if (data.success) {
        const dropdown = document.getElementById('tableMenu');

        // Filtrar solo dispositivos del mismo tipo
        const filteredDevices = currentDeviceType
            ? data.data.filter(d => d.tipo === currentDeviceType)
            : data.data;

        // Agregar al dropdown
        filteredDevices.forEach(device => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = `${device.nombre} (${device.tipo})`;
            a.onclick = () => {
                selectedDeviceId = device._id;
                selectedDeviceType = device.tipo;
                showFormForDeviceType(device.tipo);
            };
            li.appendChild(a);
            dropdown.appendChild(li);
        });
    }
}
```

**Carga de datos de la automatización:**
```javascript
async function loadAutomatizationData() {
    const response = await fetchWithAuth(`${API_URL}/automatize/${taskId}`);
    const auto = await response.json();

    if (auto.success) {
        // Cargar nombre
        taskNameInput.value = auto.data.nombre;

        // Cargar dispositivo y mostrar formulario correcto
        if (auto.data.acciones && auto.data.acciones.length > 0) {
            const dispositivo = auto.data.acciones[0].dispositivo;
            selectedDeviceId = dispositivo._id;
            selectedDeviceType = dispositivo.tipo;
            showFormForDeviceType(dispositivo.tipo);

            // Cargar horarios según el tipo
            if (auto.data.trigger?.horario?.hora) {
                document.getElementById('turnOnTimeActuador').value =
                    auto.data.trigger.horario.hora;
            }
            // ... etc
        }
    }
}
```

#### **addtask.html - Creación de Tareas:**

**Mejoras implementadas:**
1. **Detección automática del tipo de dispositivo**
2. **Formularios dinámicos** según tipo (luz/temperatura/actuador)
3. **Guardado con estructura correcta** para el modelo Automatize

**Código de guardado (línea 416):**
```javascript
const taskData = {
    nombre: taskName,
    descripcion: '',
    activa: true,
    trigger: {
        tipo: 'horario'
    },
    acciones: []
};

// Configurar según tipo de dispositivo
if (selectedDeviceType === 'actuador') {
    const turnOnTime = document.getElementById('turnOnTimeActuador').value;
    const turnOffTime = document.getElementById('turnOffTimeActuador').value;

    taskData.trigger.horario = {
        dias: [0, 1, 2, 3, 4, 5, 6],
        hora: turnOnTime
    };

    taskData.acciones = [{
        dispositivo: selectedDeviceId,
        accion: 'encender',
        parametros: {
            horaApagar: turnOffTime
        }
    }];
} else if (selectedDeviceType === 'luz') {
    // Lógica para luces
    // ...
} // etc...

// POST a /api/automatize
await fetchWithAuth(`${API_URL}/automatize`, {
    method: 'POST',
    body: JSON.stringify(taskData)
});
```

### 15.5 Beneficios de estos Cambios

#### **Para el Desarrollo:**
1. ✅ **Código más limpio** - Menos campos innecesarios
2. ✅ **Más fácil de mantener** - Estructura clara y consistente
3. ✅ **Mejor organización** - Tipos estandarizados
4. ✅ **Menos bugs** - Validación más simple

#### **Para el Usuario:**
1. ✅ **Interfaz más clara** - Menos opciones confusas
2. ✅ **Más rápido** - Carga dinámica de datos reales
3. ✅ **Actualización en tiempo real** - Los cambios se reflejan inmediatamente
4. ✅ **Menos errores** - Validación mejorada

#### **Para el ESP32:**
1. ✅ **Campo `pin` directo** - Sabe exactamente qué GPIO usar
2. ✅ **Endpoint optimizado** - `/api/esp-config/:habitacionId` devuelve solo lo necesario
3. ✅ **Tipos estándar** - Lógica simplificada (luz/temperatura/actuador)

### 15.6 Migración de Datos

**IMPORTANTE:** Si ya existen dispositivos en la base de datos sin el campo `pin`:

**Script de migración (ejemplo):**
```javascript
// Agregar pin a dispositivos existentes
db.devices.updateMany(
    { pin: { $exists: false }, tipo: { $ne: 'camara' } },
    { $set: { pin: 0 } }
);
```

**Recomendación:**
- Dispositivos antiguos deben editarse manualmente para agregar el pin correcto
- O eliminar y volver a crear con la nueva estructura

### 15.7 Documentación para Usuario Final

#### **Sección Sugerida para el Manual:**

**"Gestión de Dispositivos - Configuración de Pin"**

1. **¿Qué es el Pin del dispositivo?**
   - Es el número del pin GPIO en el ESP32 donde está conectado el dispositivo
   - Ejemplo: Si conectaste un foco al pin 17 del ESP32, debes ingresar "17"

2. **¿Cómo saber qué pin usar?**
   - Consulta el diagrama de tu ESP32
   - Verifica la conexión física del dispositivo
   - Pregunta al técnico que instaló el sistema

3. **Tipos de dispositivos:**
   - **Luz**: Focos, lámparas, tiras LED
   - **Temperatura**: Sensores DHT11, DHT22, DS18B20
   - **Actuador**: Ventiladores, motores, relés genéricos
   - **Cámara**: Cámaras de vigilancia (no usa pin, usa URL)

---

## 16. AUTENTICACIÓN CON GOOGLE OAUTH 2.0

### 16.1 ¿Qué es Google OAuth?

**OAuth 2.0** es un protocolo de autorización que permite a los usuarios iniciar sesión usando sus cuentas de Google, sin necesidad de crear una contraseña específica para KYROS.

**Ventajas para el usuario:**
- No necesita recordar otra contraseña
- Inicio de sesión más rápido (un solo clic)
- Mayor seguridad (usa la autenticación de Google)
- Si ya tiene sesión en Google, es automático

### 16.2 Tecnologías Utilizadas

| Librería | Versión | Propósito |
|----------|---------|-----------|
| **passport** | ^0.7.0 | Framework de autenticación para Node.js |
| **passport-google-oauth20** | ^2.0.0 | Estrategia de Google OAuth 2.0 |
| **express-session** | ^1.18.0 | Manejo de sesiones en Express |

### 16.3 Archivos Modificados/Creados

#### **Nuevos Archivos:**
```
database/config/passport.js    # Configuración de Passport.js con Google OAuth
```

#### **Archivos Modificados:**
```
database/models/User.js        # Agregado: googleId, authProvider
database/server.js             # Inicialización de Passport y sesiones
database/routes/auth.js        # Rutas /google y /google/callback
database/.env                  # Variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
login.html                     # Botón de Google + manejo de callback
register.html                  # Botón de Google + manejo de callback
```

### 16.4 Configuración del Backend

#### **A) Modelo de Usuario Actualizado (User.js)**

Se agregaron dos campos nuevos:

```javascript
googleId: {
    type: String,
    unique: true,
    sparse: true          // Permite null, solo usuarios de Google lo tienen
},
authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'      // 'local' = email/password, 'google' = Google OAuth
}
```

**Cambio importante en el campo password:**
```javascript
password: {
    type: String,
    required: function() {
        // Solo requerido si es usuario local (no Google)
        return this.authProvider === 'local';
    },
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
}
```

#### **B) Configuración de Passport (config/passport.js)**

**Estrategia de Google:**
```javascript
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}))
```

**Funcionalidades implementadas:**
1. **Buscar usuario existente por googleId**
   - Si existe, inicia sesión automáticamente

2. **Vincular cuenta existente**
   - Si un usuario ya se registró con email/password y luego usa Google
   - Sistema detecta el email duplicado y vincula ambas cuentas

3. **Crear nuevo usuario**
   - Si es la primera vez que usa Google
   - Crea cuenta automáticamente con datos de Google

#### **C) Nuevas Rutas de Autenticación (routes/auth.js)**

**Ruta 1: Iniciar OAuth**
```javascript
GET /api/auth/google
```
- Redirige al usuario a la página de login de Google
- Solicita permisos: profile, email

**Ruta 2: Callback de Google**
```javascript
GET /api/auth/google/callback
```
- Google redirige aquí después de la autenticación
- Si exitoso: Genera JWT y redirige a login.html con token
- Si falla: Redirige a login.html con mensaje de error

#### **D) Variables de Entorno (.env)**

**Nuevas variables agregadas:**
```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Session Configuration
SESSION_SECRET=clave-secreta-para-sesiones
```

### 16.5 Configuración de Google Cloud Console

#### **Paso 1: Crear Proyecto**
1. Ir a: https://console.cloud.google.com
2. Crear nuevo proyecto: "Kyros Smart Home"
3. Esperar a que se cree

#### **Paso 2: Configurar Pantalla de Consentimiento**
1. APIs y servicios → Pantalla de consentimiento de OAuth
2. Tipo: **Externo**
3. Datos requeridos:
   - Nombre de la aplicación: "Kyros Smart Home"
   - Correo de asistencia: (correo del desarrollador)
   - Correo del desarrollador: (correo del desarrollador)
4. Guardar y continuar

#### **Paso 3: Crear Credenciales OAuth 2.0**
1. APIs y servicios → Credenciales
2. Crear credenciales → ID de cliente de OAuth
3. Tipo: **Aplicación web**
4. Nombre: "Kyros Web Client"
5. **URIs de redireccionamiento autorizados:**
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   (En producción, cambiar a la URL real)
6. Crear y copiar:
   - Client ID
   - Client Secret

#### **Paso 4: Agregar a .env**
```bash
GOOGLE_CLIENT_ID=el-client-id-copiado
GOOGLE_CLIENT_SECRET=el-client-secret-copiado
```

### 16.6 Cambios en el Frontend

#### **A) Botón de Google (login.html y register.html)**

**HTML del botón:**
```html
<div class="login-icon">
    <a href="/api/auth/google">
        <svg viewBox="0 0 24 24" fill="none">
            <!-- SVG de la G de Google -->
        </svg>
    </a>
</div>
```

**Características:**
- Mantiene el diseño original (botón cuadrado con SVG)
- Al hacer clic, redirige a `/api/auth/google`
- No requiere JavaScript adicional para iniciar el flujo

#### **B) Manejo del Callback (JavaScript)**

**Script agregado en login.html y register.html:**
```javascript
// Verificar si viene de Google OAuth
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const googleAuth = urlParams.get('googleAuth');
const error = urlParams.get('error');

if (token && googleAuth === 'success') {
    // Guardar token en localStorage
    saveToken(token);

    // Limpiar URL
    window.history.replaceState({}, document.title, "/login.html");

    // Redirigir a rooms
    window.location.href = '/rooms.html';
}
```

### 16.7 Flujo Completo de Autenticación con Google

#### **Diagrama del Flujo:**

```
1. Usuario hace clic en botón de Google
   ↓
2. Frontend redirige a: /api/auth/google
   ↓
3. Backend (Passport) redirige a Google
   ↓
4. Usuario inicia sesión en Google
   ↓
5. Usuario acepta permisos (profile, email)
   ↓
6. Google redirige a: /api/auth/google/callback
   ↓
7. Backend verifica con Google que el usuario es válido
   ↓
8. Backend busca o crea usuario en MongoDB
   ↓
9. Backend genera token JWT
   ↓
10. Backend redirige a: /login.html?token=XXX&googleAuth=success
   ↓
11. Frontend detecta token en URL
   ↓
12. Frontend guarda token en localStorage
   ↓
13. Frontend redirige a /rooms.html
   ↓
14. Usuario está autenticado
```

#### **Casos Especiales:**

**Caso 1: Usuario nuevo con Google**
- Google devuelve: nombre, email, googleId
- Sistema crea usuario con authProvider='google'
- No requiere contraseña

**Caso 2: Usuario existente (email/password) usa Google**
- Sistema detecta email duplicado
- Vincula cuenta agregando googleId al usuario existente
- Ahora puede usar ambos métodos de login

**Caso 3: Usuario con Google quiere usar email/password**
- No puede, debe usar Google para iniciar sesión
- authProvider='google' no permite login tradicional

### 16.8 Seguridad

#### **Protecciones Implementadas:**

1. **Validación de Google**
   - Solo Google puede completar el callback
   - Passport verifica la autenticidad del token de Google

2. **Sesiones Seguras**
   - `express-session` con secret aleatorio
   - Cookies con configuración segura en producción

3. **Vinculación de Cuentas**
   - Si email ya existe, vincula en lugar de duplicar
   - Previene múltiples cuentas con el mismo email

4. **Tokens JWT**
   - Mismo sistema de tokens que autenticación local
   - Válidos por 7 días
   - Almacenados en localStorage del navegador

### 16.9 Diferencias entre Usuarios Locales y Google

| Característica | Usuario Local | Usuario Google |
|----------------|---------------|----------------|
| **authProvider** | 'local' | 'google' |
| **password** | Requerido (hash bcrypt) | No tiene |
| **googleId** | null | ID de Google |
| **email** | Ingresado manualmente | De cuenta Google |
| **nombre** | Ingresado manualmente | De perfil Google |
| **Login** | Email + contraseña | Botón de Google |

### 16.10 Mensajes de Error

| Error | Cuándo Ocurre | Solución |
|-------|---------------|----------|
| `google_auth_failed` | Google rechaza autenticación | Usuario canceló o cuenta no válida |
| `token_generation_failed` | Error al crear JWT | Error del servidor, contactar soporte |
| `Invalid credentials` | No aplica a Google | Solo para login tradicional |

### 16.11 Consideraciones para Producción

#### **Cambios Necesarios:**

1. **URL de Callback en Google Cloud Console:**
   ```
   Desarrollo: http://localhost:3000/api/auth/google/callback
   Producción: https://tudominio.com/api/auth/google/callback
   ```

2. **Variable GOOGLE_CALLBACK_URL (.env):**
   ```bash
   # Producción
   GOOGLE_CALLBACK_URL=https://tudominio.com/api/auth/google/callback
   ```

3. **Configuración de Sesión Segura (server.js):**
   ```javascript
   cookie: {
       secure: true,    // Requiere HTTPS
       httpOnly: true,
       sameSite: 'strict'
   }
   ```

4. **Verificación de Dominio en Google:**
   - Agregar dominio de producción en Google Cloud Console
   - Publicar la aplicación OAuth (sacarla de modo desarrollo)

### 16.12 Pruebas de Funcionalidad

#### **Checklist de Pruebas:**

- [ ] Usuario puede hacer clic en botón de Google
- [ ] Redirige correctamente a página de Google
- [ ] Después de autenticación, vuelve a la aplicación
- [ ] Token se guarda en localStorage
- [ ] Usuario puede acceder a páginas protegidas
- [ ] Si cierra sesión y vuelve a usar Google, funciona
- [ ] Si usuario ya existe con email/password, vincula correctamente
- [ ] Errores se manejan correctamente (sin crashes)

### 16.13 Documentación para Usuario Final

#### **Sección Sugerida para el Manual:**

**"Inicio de Sesión con Google"**

1. **¿Qué es?**
   - Forma rápida de acceder a KYROS usando tu cuenta de Google
   - No necesitas crear una contraseña adicional

2. **¿Cómo usarlo?**
   - En la página de login, haz clic en el botón con la "G" de Google
   - Inicia sesión en Google (si no lo has hecho)
   - Acepta los permisos solicitados
   - Serás redirigido automáticamente a KYROS

3. **¿Es seguro?**
   - Sí, usamos el sistema de autenticación oficial de Google
   - KYROS no tiene acceso a tu contraseña de Google
   - Solo recibimos tu nombre y correo electrónico

4. **¿Puedo usar mi email de Google con contraseña también?**
   - Si ya te registraste con email/password y luego usas Google, ambas cuentas se vincularán automáticamente
   - Podrás usar cualquiera de los dos métodos para iniciar sesión

---

**Fecha de creación:** Noviembre 2025
**Versión del sistema:** 2.0
**Última actualización:** Implementación de Google OAuth 2.0
