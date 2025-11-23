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

## 15. ACTUALIZACIÓN: FORMULARIOS DE TAREAS COMPLETADOS (Noviembre 2025)

### 15.1 Resumen de Cambios

Se completó la implementación de formularios de automatización de tareas para **TODOS** los tipos de dispositivos IoT soportados. Anteriormente algunos tipos no tenían formularios completos o tenían errores de validación.

### 15.2 Tipos de Dispositivos Soportados

El sistema ahora soporta completamente **7 tipos de dispositivos**:

| Tipo de Dispositivo | Código en Sistema | Descripción | Nuevo/Actualizado |
|---------------------|------------------|-------------|-------------------|
| **Luz** | `luz` | Bombillas inteligentes, focos LED | ✅ Actualizado |
| **Temperatura** | `temperatura` | Sensores de temperatura | ✅ Actualizado |
| **Humedad** | `humedad` | Sensores de humedad | ✅ Nuevo tipo |
| **Movimiento** | `movimiento` | Sensores de movimiento PIR | ✅ Nuevo tipo |
| **Gas** | `gas` | Detectores de gas/humo | ✅ Nuevo tipo |
| **Actuador** | `actuador` | Relés, switches, enchufes inteligentes | ✅ Actualizado |
| **Cámara** | `camara` | Cámaras de seguridad IP | ✅ Existente |

### 15.3 Cambios en el Backend

#### **database/models/Device.js** (Línea 9-13)

**Cambio realizado:**
```javascript
tipo: {
    type: String,
    required: [true, 'Por favor especifique el tipo de dispositivo'],
    enum: ['actuador', 'camara', 'gas', 'humedad', 'luz', 'movimiento', 'temperatura']
},
```

**Antes:** Solo tenía 4 tipos (actuador, camara, luz, temperatura)
**Ahora:** 7 tipos completos incluyendo gas, humedad y movimiento

**Impacto:** Permite crear dispositivos de todos los tipos sin errores de validación.

### 15.4 Páginas Modificadas en el Frontend

#### **1. addtask.html** - Crear Tarea desde Dispositivo

**Ubicación en navegador:**
- Habitaciones → [Seleccionar habitación] → [Seleccionar dispositivo] → Botón "Agregar tarea"

**Cambios realizados:**

1. **Nuevo formulario para actuadores** (Líneas 284-314)
   - Antes: Solo permitía agregar hora de encendido
   - Ahora: Permite agregar hora de encendido Y hora de apagado

2. **Nueva función `actuadorClick()`** (Líneas 683-695)
   - Valida los campos y muestra el botón de guardar

3. **Labels dinámicos** (Líneas 400-406)
   - Movimiento/Gas: Muestra "Activar a la(s)"
   - Alarmas: Muestra "Sonar a la(s)"

4. **Lógica de guardado mejorada** (Líneas 744-785)
   - Ahora usa `selectedDeviceType` en lugar de verificar visibilidad de formularios
   - Más robusto y menos propenso a errores

**Para documentación:**
- Captura de formulario de actuador con ambos campos (encender/apagar)
- Captura de formulario de movimiento mostrando "Activar a la(s)"

#### **2. newtask.html** - Crear Tarea desde Automatización

**Ubicación en navegador:**
- Automatización → Botón "Agregar tarea"

**Cambios realizados:**

1. **Nuevo formulario de actuador** (Líneas 308-338)
   - Campos: Hora encender (requerido) + Hora apagar (opcional)

2. **Botones "Continuar" agregados**
   - Alarma: Línea 300 con función `alarmClick()`
   - Actuador: Línea 332 con función `actuadorClick()`

3. **Funciones de validación** (Líneas 649-675)
   - `alarmClick()`: Valida hora para movimiento/gas
   - `actuadorClick()`: Valida hora de encendido para actuadores

4. **Labels dinámicos** (Líneas 585-590)
   - Se ajustan según el tipo de dispositivo seleccionado

**Para documentación:**
- Captura del dropdown de dispositivos
- Captura de cada tipo de formulario (luz, temperatura, movimiento, actuador)

#### **3. taskinfo.html** - Editar Tarea Existente

**Ubicación en navegador:**
- Automatización → Click en una tarea existente

**Cambios realizados:**

1. **Carga de datos para actuador** (Líneas 416-430)
   - Carga hora de encendido desde trigger
   - Carga hora de apagado desde parámetros

2. **Carga para movimiento/gas** (Líneas 431-437)
   - Carga hora de activación correctamente

3. **Labels dinámicos** (Líneas 291-297)
   - Ajusta texto según tipo de dispositivo

**Para documentación:**
- Captura de tarea de actuador mostrando ambos horarios
- Captura de tarea de movimiento con label "Activar"

#### **4. cameraedit.html** - NUEVA PÁGINA

**Ubicación en navegador:**
- Seguridad → Click en ícono de lápiz (editar) junto a una cámara

**Archivo nuevo completo** (184 líneas)

**Funcionalidad:**
- Editar nombre de cámara
- Editar URL de streaming (RTSP/HTTP)
- Botón "Guardar" para actualizar cambios
- Botón "Eliminar" para borrar la cámara

**Campos del formulario:**
```html
- Tipo de dispositivo: "Cámara" (deshabilitado/solo lectura)
- Nombre de cámara: Input de texto
- URL de conexión (Streaming): Input de texto para URL RTSP
```

**Para documentación:**
- Captura de la página completa
- Captura del proceso de edición
- Captura de la confirmación de eliminación

#### **5. security.html** - Página de Seguridad

**Cambios realizados:**

1. **Botones de editar/eliminar** (Líneas 156-158)
   ```html
   <img src="images/Edit.png" onclick="editCam(...)">
   <img src="images/Close.png" onclick="deleteCam(...)">
   ```

2. **Función `editCam()`** (Líneas 233-236)
   - Redirige a cameraedit.html con el ID de la cámara

3. **Función `deleteCam()`** (Líneas 238-268)
   - Muestra diálogo de confirmación
   - Llama al API para eliminar
   - Recarga la lista de cámaras

**Para documentación:**
- Captura de los iconos de editar/eliminar
- Captura del diálogo de confirmación de eliminación

#### **6. style.css** - Estilos Globales

**Cambio realizado:** (Línea 560)
```css
#user-input, #password, #deviceNameInput, #pinInput, #connectionInput, #cameraNameInput {
    /* Estilos de inputs */
}
```

**Motivo:** Asegurar que el input de nombre de cámara tenga el mismo estilo que otros inputs del sistema.

### 15.5 Tabla Completa de Formularios por Tipo de Dispositivo

| Tipo | Formulario Visual | Campos Disponibles | Validación | Capturas Necesarias |
|------|------------------|-------------------|------------|---------------------|
| **Luz** | start-light + stop-light | • Hora encender<br>• Hora apagar<br>• Sensor "cuando no hay luz"<br>• Sensor "cuando hay luz" | Al menos 1 campo requerido | ✓ Vista del formulario<br>✓ Opciones de sensores |
| **Temperatura** | start-fan + stop-fan | • Hora encender<br>• Temperatura encender<br>• Hora apagar<br>• Temperatura apagar | Al menos hora O temp | ✓ Formulario con temperatura<br>✓ Dropdown de opciones |
| **Humedad** | start-fan + stop-fan | • Hora encender<br>• Temperatura encender<br>• Hora apagar<br>• Temperatura apagar | Al menos hora O temp | (Igual que temperatura) |
| **Movimiento** | alarm | • Hora de activación<br>• Label: "Activar a la(s)" | Hora requerida | ✓ Label "Activar"<br>✓ Formulario simple |
| **Gas** | alarm | • Hora de activación<br>• Label: "Activar a la(s)" | Hora requerida | (Igual que movimiento) |
| **Actuador** | actuador | • Hora encender (requerido)<br>• Hora apagar (opcional) | Hora encender requerida | ✓ Ambos campos visibles<br>✓ Creación y edición |

### 15.6 Flujos de Usuario Actualizados

#### **Crear Tarea para Actuador**

**Opción A: Desde Dispositivo**
1. Ir a "Habitaciones"
2. Seleccionar una habitación
3. Click en dispositivo tipo "Actuador"
4. Click en botón "Agregar tarea"
5. Ingresar nombre de la tarea
6. Click "Continuar"
7. **NUEVO:** Ingresar hora de encendido (requerido)
8. **NUEVO:** Ingresar hora de apagado (opcional)
9. Click "Continuar"
10. Click "Guardar"

**Opción B: Desde Automatización**
1. Ir a "Automatización"
2. Click en "Agregar tarea"
3. Ingresar nombre
4. Click "Continuar"
5. Seleccionar dispositivo tipo "Actuador"
6. Click "Continuar"
7. **NUEVO:** Ingresar hora de encendido
8. **NUEVO:** Ingresar hora de apagado
9. Click "Continuar"
10. Click "Guardar"

#### **Crear Tarea para Sensor de Movimiento**

1. Seguir pasos iniciales (igual que actuador)
2. Seleccionar dispositivo tipo "Movimiento"
3. **NUEVO:** Ver label "Activar a la(s)" (no "Sonar")
4. Ingresar hora de activación
5. Guardar

#### **Editar Cámara de Seguridad**

1. Ir a "Seguridad"
2. **NUEVO:** Click en ícono de lápiz junto a la cámara
3. **NUEVO:** Se abre página cameraedit.html
4. Modificar nombre de cámara
5. Modificar URL de streaming (RTSP)
6. Click "Guardar" → Vuelve a página de seguridad
7. **Opcional:** Click "Eliminar" → Confirmar → Cámara eliminada

### 15.7 Estructura de Datos en MongoDB

#### **Colección: devices**

**Actualización del campo `tipo`:**
```javascript
{
  _id: ObjectId,
  nombre: "Sensor Puerta Principal",
  tipo: "movimiento",  // ← Ahora acepta: actuador, camara, gas, humedad, luz, movimiento, temperatura
  habitacion: ObjectId,
  usuario: ObjectId,
  estado: true/false,
  // ... otros campos
}
```

#### **Colección: automatize (Tareas)**

**Estructura de tarea para Actuador:**
```javascript
{
  nombre: "Encender riego automático",
  activa: true,
  trigger: {
    tipo: "horario",
    horario: {
      dias: [0,1,2,3,4,5,6],
      hora: "06:00"  // Hora de encendido
    }
  },
  acciones: [{
    dispositivo: ObjectId("..."),
    accion: "encender",
    parametros: {
      horaApagar: "06:30"  // ← NUEVO: Hora de apagado
    }
  }]
}
```

**Estructura de tarea para Movimiento/Gas:**
```javascript
{
  nombre: "Activar sensor de movimiento",
  trigger: {
    tipo: "horario",
    horario: {
      dias: [0,1,2,3,4,5,6],
      hora: "20:00"  // Hora de activación
    }
  },
  acciones: [{
    dispositivo: ObjectId("..."),
    accion: "encender",
    parametros: {}  // Sin parámetros adicionales
  }]
}
```

### 15.8 Errores Corregidos

| Error Original | Causa | Solución | Archivo Afectado |
|---------------|-------|----------|------------------|
| Error 400 al crear sensor de movimiento | Tipo "movimiento" no estaba en enum | Agregado al enum de Device.js | `database/models/Device.js` |
| Actuador solo permitía hora de encendido | Faltaba campo de hora de apagado | Agregado formulario completo | `addtask.html`, `newtask.html` |
| Labels decían "Sonar" en movimiento/gas | No había lógica dinámica de labels | Implementado cambio dinámico | `addtask.html`, `newtask.html`, `taskinfo.html` |
| No se podía editar cámara | No existía página de edición | Creada cameraedit.html | `cameraedit.html` (nuevo) |
| Botón Guardar no aparecía en newtask.html | Faltaban funciones de Continuar | Agregadas funciones alarmClick y actuadorClick | `newtask.html` |
| Datos de tarea no se guardaban correctamente | Se verificaba visibilidad de divs | Cambiado a usar selectedDeviceType | `addtask.html` |

### 15.9 Para el Manual de Usuario

#### **Sección: Tipos de Dispositivos**

Agregar al manual:

**Dispositivos de Control:**
- **Actuador/Relé:** Dispositivo que activa/desactiva otros equipos (ej: riego automático, enchufes inteligentes)
  - Se programa con hora de encendido y hora de apagado
  - Útil para horarios fijos (ej: regar jardín de 6:00 AM a 6:30 AM)

**Sensores:**
- **Sensor de Movimiento:** Detecta movimiento en un área
  - Se programa con hora de activación
  - Útil para seguridad (ej: activar a las 8:00 PM cuando todos duermen)

- **Sensor de Gas/Humo:** Detecta fugas de gas o humo
  - Se programa con hora de activación
  - Importante: Usar label "Activar" no "Sonar"

- **Sensor de Temperatura:** Mide temperatura ambiente
  - Puede activar dispositivos por hora O por temperatura
  - Ej: "Encender ventilador si temperatura > 25°C"

- **Sensor de Humedad:** Mide humedad relativa
  - Funciona igual que sensor de temperatura
  - Ej: "Encender humidificador si humedad < 40%"

#### **Sección: Cámaras de Seguridad**

**Agregar subsección: Editar Cámara**

1. En la página de "Seguridad", ubique la cámara que desea modificar
2. Haga clic en el ícono de lápiz (✏️) junto al nombre de la cámara
3. Se abrirá la página de edición con los siguientes campos:
   - **Nombre de cámara:** Puede cambiar el nombre descriptivo
   - **URL de conexión (Streaming):** URL RTSP de la cámara (ej: rtsp://192.168.1.100/stream)
4. Realice los cambios necesarios
5. Haga clic en "Guardar" para aplicar los cambios
6. **Para eliminar la cámara:** Haga clic en el botón rojo "Eliminar" y confirme la acción

⚠️ **Nota:** Al eliminar una cámara, también se eliminan sus grabaciones y tareas asociadas.

### 15.10 Capturas de Pantalla Adicionales Necesarias

Para complementar el manual, se necesitan capturas de:

**Formularios de Tareas:**
- [ ] addtask.html - Formulario de actuador (ambos horarios visibles)
- [ ] addtask.html - Formulario de movimiento (label "Activar")
- [ ] newtask.html - Selección de dispositivo actuador
- [ ] newtask.html - Formulario completo de actuador
- [ ] taskinfo.html - Edición de tarea de actuador (cargando datos)

**Cámaras:**
- [ ] security.html - Iconos de editar y eliminar
- [ ] cameraedit.html - Página completa de edición
- [ ] cameraedit.html - Diálogo de confirmación de eliminación

**Errores corregidos:**
- [ ] Antes: Actuador solo con hora de encendido
- [ ] Después: Actuador con ambos horarios
- [ ] Antes: Movimiento con "Sonar a la(s)"
- [ ] Después: Movimiento con "Activar a la(s)"

### 15.11 Código de Referencia para Ejemplos

#### **Ejemplo: Crear tarea de riego automático (Actuador)**

**JavaScript del formulario:**
```javascript
const taskData = {
    nombre: "Riego automático jardín",
    activa: true,
    trigger: {
        tipo: 'horario',
        horario: {
            dias: [0,1,2,3,4,5,6],  // Todos los días
            hora: "06:00"            // Encender a las 6 AM
        }
    },
    acciones: [{
        dispositivo: "673abc123...",  // ID del actuador
        accion: 'encender',
        parametros: {
            horaApagar: "06:30"      // Apagar a las 6:30 AM
        }
    }]
};
```

#### **Ejemplo: Crear tarea de sensor de movimiento**

```javascript
const taskData = {
    nombre: "Activar sensor entrada",
    activa: true,
    trigger: {
        tipo: 'horario',
        horario: {
            dias: [0,1,2,3,4,5,6],
            hora: "20:00"  // Activar a las 8 PM
        }
    },
    acciones: [{
        dispositivo: "673def456...",
        accion: 'encender',
        parametros: {}  // Sin parámetros adicionales
    }]
};
```

---

## 16. ACTUALIZACIÓN: MEJORAS DE UI Y ALMACENAMIENTO (Noviembre 2025)

### 16.1 Selector de Dispositivos en Automatización

**Cambio realizado en `newtask.html`:**

El dropdown de selección de dispositivos ahora muestra información más completa para facilitar la identificación del dispositivo.

**Formato anterior:**
```
Foco 1 (luz)
```

**Formato nuevo:**
```
Foco 1 (luz, Sala)
```

**Estructura:** `[Nombre del dispositivo] ([tipo], [nombre de la habitación])`

**Código modificado (líneas 417-418):**
```javascript
const habitacionNombre = device.habitacion?.nombre || 'Sin habitación';
a.textContent = `${device.nombre} (${device.tipo}, ${habitacionNombre})`;
```

**Para documentación:**
- Captura del dropdown mostrando dispositivos con habitación
- Explicar que esto ayuda a identificar dispositivos cuando hay varios del mismo tipo

---

### 16.2 Almacenamiento de IP en Habitaciones

**Problema anterior:**
La IP del ESP32 se guardaba únicamente en el campo `descripcion` con formato "IP: 192.168.1.100"

**Solución implementada:**
Ahora la IP se guarda en **dos campos**:
- `ip`: Solo la dirección IP (para uso del ESP32)
- `descripcion`: Con formato "IP: x.x.x.x" (para mostrar en la UI)

**Archivos modificados:**

**1. `addroom.html` - Crear habitación:**
```javascript
body: JSON.stringify({
    nombre: roomName,
    ip: ipESP32 || '',
    descripcion: ipESP32 ? `IP: ${ipESP32}` : ''
})
```

**2. `roomedit.html` - Editar habitación:**
```javascript
// Guardar
body: JSON.stringify({
    nombre: roomName,
    ip: ipESP32 || '',
    descripcion: ipESP32 ? `IP: ${ipESP32}` : ''
})

// Cargar (ahora lee del campo ip directamente)
ipInput.value = room.ip || '';
```

**Impacto en la base de datos:**

| Campo | Valor guardado | Uso |
|-------|---------------|-----|
| `ip` | `192.168.1.100` | Integración ESP32, envío de comandos |
| `descripcion` | `IP: 192.168.1.100` | Mostrar en lista de habitaciones |

**Para documentación:**
- Explicar que el campo IP es opcional
- Si se proporciona, se usa para comunicación con dispositivos ESP32

---

### 16.3 Gráficas con Placeholder y Overlay "Esperando datos"

**Cambio realizado en `deviceinfo.html`:**

Cuando un dispositivo no tiene datos históricos, ahora se muestra una gráfica placeholder de fondo con un overlay semitransparente que indica "Esperando datos...".

**Comportamiento anterior:**
- Gráfica vacía con título "Esperando datos..."

**Comportamiento nuevo:**
1. Se muestra una gráfica placeholder con datos de ejemplo (en color gris)
2. Overlay semitransparente sobre la gráfica
3. Spinner de carga + texto "Esperando datos..."
4. Cuando llegan datos reales, se oculta el overlay y se muestra la gráfica con colores reales

**HTML del overlay (líneas 84-90):**
```html
<div id="chart-container" style="position: relative;">
    <canvas id="myChart" style="width:100%;max-width:700px"></canvas>
    <div id="chart-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.85); justify-content: center; align-items: center; flex-direction: column;">
        <div class="spinner-border text-primary mb-2" role="status"></div>
        <span class="text-muted">Esperando datos...</span>
    </div>
</div>
```

**Gráficas afectadas:**

| Tipo de gráfica | Dispositivos | Datos placeholder |
|-----------------|--------------|-------------------|
| **Líneas** | Sensores (temperatura, humedad, gas) | Curva suave con valores 22-28 |
| **Barras** | Actuadores, focos, ventiladores | Barras con valores 10-45 minutos |

**Para documentación:**
- Captura de gráfica con overlay "Esperando datos..."
- Captura de gráfica con datos reales cargados
- Explicar que los datos se generan cuando el ESP32 reporta información

---

### 16.4 Resumen de Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `newtask.html` | Selector de dispositivos muestra (tipo, habitación) |
| `addroom.html` | Guarda IP en campos `ip` y `descripcion` |
| `roomedit.html` | Guarda/carga IP correctamente |
| `deviceinfo.html` | Gráficas placeholder con overlay |

---

## NOTAS FINALES

- Este documento está actualizado a la fecha del último commit
- La arquitectura puede cambiar en futuras versiones
- Consultar el README.md del proyecto para detalles técnicos adicionales
- Los archivos de prueba (.md) en la raíz contienen ejemplos de uso del API

---

**Fecha de creación:** Noviembre 2025
**Versión del sistema:** 2.0
**Última actualización:** Mejoras de UI (selector con habitación, gráficas placeholder) y corrección de almacenamiento de IP
