# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KYROS is a smart home IoT management web application that allows users to monitor, control, and automate IoT devices in their homes. The system includes room management, device control, security monitoring, and task automation features.

## Technology Stack

- **Frontend**: Static HTML pages with Bootstrap 5.3.8 for responsive design
- **Backend**: Node.js with Express 5.1.0 + RESTful API
- **Database**: MongoDB Atlas with Mongoose 8.19.0 ODM
- **Authentication**: JWT (JSON Web Tokens) + bcryptjs for password hashing
- **Security**: CORS, dotenv for environment variables, protected routes middleware

## Project Structure

```
.
├── database/                    # Backend API (Node.js + Express + MongoDB)
│   ├── config/
│   │   └── database.js         # Configuración de MongoDB
│   ├── controllers/            # Lógica de negocio
│   │   ├── authController.js   # Autenticación (login, register, profile)
│   │   ├── roomController.js   # Gestión de habitaciones
│   │   └── deviceController.js # Gestión de dispositivos IoT
│   ├── middleware/
│   │   ├── auth.js             # Protección JWT de rutas
│   │   └── errorHandler.js     # Manejo centralizado de errores
│   ├── models/                 # Esquemas de Mongoose
│   │   ├── User.js             # Usuarios con bcrypt
│   │   ├── Room.js             # Habitaciones
│   │   ├── Device.js           # Dispositivos IoT
│   │   ├── DeviceData.js       # Telemetría/datos históricos
│   │   ├── Camera.js           # Cámaras de seguridad
│   │   ├── Task.js             # Tareas programadas
│   │   └── Automatize.js       # Reglas de automatización
│   ├── routes/                 # Endpoints del API
│   │   ├── auth.js             # /api/auth/*
│   │   ├── rooms.js            # /api/rooms/*
│   │   └── devices.js          # /api/devices/*
│   ├── .env                    # Variables de entorno (NO COMMITEAR)
│   ├── .env.example            # Plantilla de configuración
│   ├── server.js               # Servidor principal (NUEVO)
│   ├── connect.js              # Servidor legacy (obsoleto)
│   ├── README.md               # Documentación completa del API
│   └── package.json            # Dependencias backend
├── images/                     # Assets estáticos e iconos
├── *.html                      # Páginas frontend (login, rooms, devices, etc.)
├── style.css                   # Estilos globales
└── package.json                # Config root (Chart.js/Parcel)
```

## Development Commands

### Backend Server (NUEVO - Versión 2.0)

```bash
# Navigate to database directory
cd database

# Install dependencies
npm install

# Desarrollo con auto-reload
npm run dev

# Producción
npm start

# Legacy (obsoleto, usar solo para referencia)
npm run legacy
```

El servidor corre en `http://localhost:3000` y proporciona:
- Conexión a MongoDB Atlas (base de datos: Kyros)
- API REST completa con autenticación JWT
- Servicio de archivos estáticos del frontend
- 7 colecciones: users, rooms, devices, devices_data, cameras, tasks, automatize

### Frontend Development

The frontend uses static HTML files. To develop:

1. Start the backend server first (see above)
2. Open `http://localhost:3000` in a browser
3. The server serves static HTML files from the root directory

Note: The root `package.json` references Parcel bundler for potential Chart.js integration, but the current implementation uses static HTML files.

## Architecture

### Backend (database/server.js)

**MVC Pattern**:
- `models/` - Mongoose schemas for MongoDB collections
- `controllers/` - Business logic for each resource
- `routes/` - Express route definitions
- `middleware/` - Auth protection and error handling
- `config/` - Database connection setup

**MongoDB Connection**:
- Uses MongoDB Atlas cluster via `config/database.js`
- Database: `kyros` with 7 collections
- Connection string managed via `.env` file (MONGODB_URI)

**Static File Serving**:
- Serves all HTML, CSS, and image files from parent directory (`..`)
- Default route `/` serves `index.html`
- All frontend pages explicitly mapped in server.js (lines 68-89)

### Frontend Pages

**Public Pages**:
- `index.html` - Landing page with features overview
- `login.html` - User login with password visibility toggle
- `register.html` - User registration

**Authenticated Pages**:
- `rooms.html` - Room management interface
- `roomedit.html` - Edit room details
- `addroom.html` - Create new rooms
- `devices.html` - Device listing and control
- `deviceinfo.html` - Detailed device information
- `deviceedit.html` - Edit device details
- `adddevice.html` - Add new IoT devices
- `security.html` - Security monitoring and alerts
- `automatize.html` - Task automation rules
- `addtask.html`, `newtask.html`, `taskdata.html`, `taskinfo.html` - Task management
- `helpcenter.html` - Support documentation

**Common UI Elements**:
- Bootstrap navbar with offcanvas mobile menu
- Footer with logo, support links, and contact info
- Copyright: Instituto Tecnológico Superior de Guasave

## Important Notes

**Security Considerations** (✅ RESUELTO EN VERSIÓN 2.0):
- ✅ Passwords ahora se hashean con bcrypt (ver `models/User.js`)
- ✅ MongoDB connection string se maneja con variables de entorno (`.env`)
- ✅ JWT implementado para autenticación (token expira en 7 días)
- ⚠️ CORS habilitado globalmente en desarrollo (configurar en producción)

**Database Connection**:
- The server expects IP whitelisting in MongoDB Atlas
- Connection errors will log: "Asegúrate de que la IP de tu red esté permitida en MongoDB Atlas"

**Client-Side JavaScript**:
- Forms use inline JavaScript or Bootstrap components
- No frontend framework (React, Vue, etc.) - uses vanilla JS
- Authentication currently NOT integrated with JWT backend (needs migration)
- Most data is currently hardcoded or mock data (needs API integration)

**Naming Conventions**:
- Spanish is used throughout (comments, variable names, UI text)
- Schema fields mix Spanish (nombre, estudiante) and English (email, password, searchHistory)

## Backend API v2.0 - Características Implementadas

### Arquitectura RESTful
- **Patrón MVC**: Models, Controllers, Routes separados
- **Middleware centralizado**: Autenticación, manejo de errores
- **Configuración modular**: Database config, environment variables

### Autenticación y Seguridad
- JWT (JSON Web Tokens) para sesiones stateless
- Bcrypt para hash de contraseñas (10 salt rounds)
- Middleware `protect` para rutas privadas
- Middleware `authorize` para control de roles

### Endpoints Disponibles

**Autenticación** (`/api/auth`):
- `POST /register` - Registro de usuarios
- `POST /login` - Iniciar sesión
- `GET /me` - Perfil del usuario autenticado
- `PUT /updateprofile` - Actualizar datos de perfil
- `PUT /updatepassword` - Cambiar contraseña

**Habitaciones** (`/api/rooms`):
- `GET /` - Listar habitaciones del usuario
- `POST /` - Crear habitación
- `GET /:id` - Obtener habitación específica
- `PUT /:id` - Actualizar habitación
- `DELETE /:id` - Eliminar habitación
- `GET /:id/devices` - Dispositivos de la habitación

**Dispositivos** (`/api/devices`):
- `GET /` - Listar dispositivos (filtros: tipo, habitación)
- `POST /` - Crear dispositivo
- `GET /:id` - Obtener dispositivo
- `PUT /:id` - Actualizar dispositivo
- `DELETE /:id` - Eliminar dispositivo
- `PUT /:id/toggle` - Encender/apagar dispositivo
- `GET /:id/data` - Obtener datos históricos/telemetría

**Cámaras** (`/api/cameras`):
- Ver `database/routes/cameras.js` para endpoints disponibles

**Tareas** (`/api/tasks`):
- Ver `database/routes/tasks.js` para endpoints disponibles

**Automatización** (`/api/automatize`):
- Ver `database/routes/automatize.js` para endpoints disponibles

### Modelos de Datos Completos

**7 Colecciones MongoDB**:
1. `users` - Usuarios con autenticación
2. `rooms` - Habitaciones del hogar
3. `devices` - Dispositivos IoT (luces, sensores, etc.)
4. `devices_data` - Telemetría e históricos
5. `cameras` - Cámaras de seguridad
6. `tasks` - Tareas programadas
7. `automatize` - Reglas de automatización

### Documentación
- `database/README.md` - Documentación completa del API
- `.env.example` - Plantilla de configuración
- Todos los endpoints documentados con ejemplos

## Estado Actual del Proyecto

### Backend Completado
- ✅ Controladores para `Auth`, `Room`, `Device`, `Camera`, `Task`, `Automatize`
- ✅ Rutas para todos los módulos principales
- ✅ Autenticación JWT implementada
- ✅ Manejo de errores centralizado

### Próximos Pasos

**Integración Frontend**:
- Actualizar páginas HTML para usar el nuevo API REST
- Implementar manejo de tokens JWT en el cliente (almacenamiento, envío en headers)
- Migrar de hardcoded data a llamadas fetch() a los endpoints

**Mejoras Adicionales**:
- Websockets para actualizaciones en tiempo real de dispositivos
- Paginación en endpoints GET de listados
- Rate limiting para seguridad (express-rate-limit)
- Logging estructurado con Winston o Morgan
- Tests unitarios e integración (Jest/Mocha)
- Documentación interactiva con Swagger/OpenAPI
- Configurar CORS específico para producción
