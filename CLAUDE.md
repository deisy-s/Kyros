# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KYROS is a smart home IoT management web application built with a Node.js/Express backend and vanilla JavaScript frontend. The system manages rooms, IoT devices (lights, sensors, thermostats), security cameras, and task automation.

## Technology Stack

- **Frontend**: Static HTML + Bootstrap 5.3.8 + vanilla JavaScript
- **Backend**: Node.js with Express 5.1.0 + RESTful API
- **Database**: MongoDB Atlas with Mongoose 8.19.0 (database: `kyros`)
- **Authentication**: JWT + bcryptjs password hashing
- **IoT Integration**: ESP32 device support via `/api/esp` endpoints

## Development Commands

### Starting the Server

```bash
# Navigate to backend directory
cd database

# Install dependencies (first time only)
npm install

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs at `http://localhost:3000` and serves both the API (`/api/*`) and frontend static files.

### Environment Setup

Copy `database/.env.example` to `database/.env` and configure:
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT signing (change in production)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Project Structure

```
.
├── database/                    # Backend (Node.js + Express + MongoDB)
│   ├── config/database.js       # MongoDB connection setup
│   ├── controllers/             # Business logic (MVC pattern)
│   │   ├── authController.js    # Authentication (login, register, profile)
│   │   ├── roomController.js    # Room management
│   │   ├── deviceController.js  # IoT device control
│   │   ├── cameraController.js  # Security cameras
│   │   ├── taskController.js    # Scheduled tasks
│   │   ├── automatizeController.js # Automation rules
│   │   └── espController.js     # ESP32 integration
│   ├── middleware/
│   │   ├── auth.js              # JWT protection (protect, authorize)
│   │   └── errorHandler.js      # Centralized error handling
│   ├── models/                  # Mongoose schemas (7 collections)
│   │   ├── User.js              # Users with bcrypt hashing
│   │   ├── Room.js              # Rooms
│   │   ├── Device.js            # IoT devices
│   │   ├── DeviceData.js        # Telemetry/historical data
│   │   ├── Camera.js            # Security cameras
│   │   ├── Task.js              # Scheduled tasks
│   │   └── Automatize.js        # Automation rules
│   ├── routes/                  # API endpoints
│   │   ├── auth.js              # /api/auth/*
│   │   ├── rooms.js             # /api/rooms/*
│   │   ├── devices.js           # /api/devices/*
│   │   ├── cameras.js           # /api/cameras/*
│   │   ├── tasks.js             # /api/tasks/*
│   │   ├── automatize.js        # /api/automatize/*
│   │   └── esp.js               # /api/esp/* (public routes for ESP32)
│   ├── server.js                # Main server entry point
│   ├── connect.js               # Legacy server (obsolete)
│   └── package.json             # Backend dependencies
├── *.html                       # Frontend pages (served by Express)
├── style.css                    # Global styles
└── images/                      # Static assets
```

## Architecture

### Backend (MVC Pattern)

**Key Components**:
- **Models**: Mongoose schemas defining MongoDB collections
- **Controllers**: Business logic that processes requests
- **Routes**: Express route definitions that map URLs to controllers
- **Middleware**:
  - `protect` - Validates JWT tokens, adds `req.user` to requests
  - `authorize(...roles)` - Restricts access by user role (estudiante/admin)
  - `errorHandler` - Centralized error responses

**Static File Serving**:
- Express serves all HTML/CSS/images from parent directory (`..`)
- Frontend routes explicitly mapped in `server.js` (lines 70-91)
- Default route `/` serves `index.html`

**MongoDB Collections** (7 total):
1. `users` - User accounts with authentication
2. `rooms` - Smart home rooms (includes `ip` field for ESP32 connection)
3. `devices` - IoT devices (7 types: actuador, camara, gas, humedad, luz, movimiento, temperatura)
4. `devices_data` - Time-series telemetry data (includes `metadata.origen` for tracking source)
5. `cameras` - Security camera configurations
6. `tasks` - Scheduled automation tasks
7. `automatize` - Automation rules/conditions

### Frontend Architecture

**Page Types**:
- **Public**: `index.html`, `login.html`, `register.html`
- **Authenticated**: `rooms.html`, `devices.html`, `security.html`, `automatize.html`, etc.

**Current State**:
- Uses vanilla JavaScript (no framework)
- Bootstrap 5.3.8 for UI components
- Chart.js 4.5.0 for data visualization
- SweetAlert for modals/notifications

**Auth Utilities** (`js/auth.js`):
- `requireAuth()` - Protects pages, redirects to login if no session
- `fetchWithAuth(url, options)` - Makes requests with JWT token in header
- `getAuthToken()` / `setAuthToken()` - Token management in localStorage

### API Authentication

All protected endpoints require JWT token in header:
```http
Authorization: Bearer <token>
```

Tokens are issued on `/api/auth/login` and `/api/auth/register` with 7-day expiration (configurable via `JWT_EXPIRE`).

### ESP32 Integration

Public endpoints for IoT hardware (no JWT required):
- `GET /api/esp/esp-config/:habitacionId` - Get device configuration
- `POST /api/esp/report-data/:habitacionId` - Submit sensor data

These routes are defined in `database/routes/esp.js` and use `espController.js`.

## Important Notes

### Security
- Passwords hashed with bcrypt (10 salt rounds) in `User.js` pre-save hook
- MongoDB URI stored in `.env` (never commit `.env` file)
- JWT secret must be changed in production
- CORS enabled globally in development (`CORS_ORIGIN=*`) - restrict in production
- IP whitelisting required in MongoDB Atlas settings

### Code Conventions
- Spanish used throughout (comments, variable names, UI text)
- Schema fields mix Spanish (`nombre`, `habitacion`) and English (`email`, `password`)
- Error responses follow format: `{ success: false, message: "...", errors: [...] }`

### Current Integration Status
- ✅ JWT token storage implemented (`js/auth.js` with `localStorage`)
- ✅ `fetchWithAuth()` utility for authenticated API calls
- ✅ Authentication flow connected (login → JWT → protected pages)
- ✅ Device control wired to API (toggle, historical data)
- ✅ Task/automation forms connected to backend
- ⚠️ Some pages may still have mock data remnants

## API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login (returns JWT)
- `GET /me` - Get current user profile (protected)
- `PUT /updateprofile` - Update user profile (protected)
- `PUT /updatepassword` - Change password (protected)

### Rooms (`/api/rooms`) - All protected
- `GET /` - List user's rooms
- `POST /` - Create room
- `GET /:id` - Get room details
- `PUT /:id` - Update room
- `DELETE /:id` - Delete room
- `GET /:id/devices` - Get room's devices

### Devices (`/api/devices`) - All protected
- `GET /` - List devices (supports `?tipo=luz&habitacion=<id>` filters)
- `POST /` - Create device
- `GET /:id` - Get device details
- `PUT /:id` - Update device
- `DELETE /:id` - Delete device
- `PUT /:id/toggle` - Toggle device on/off
- `GET /:id/data` - Get historical telemetry (supports date/type filters)

### Cameras, Tasks, Automatize
- See `database/routes/` for full endpoint definitions
- All follow similar RESTful patterns with JWT protection

### Utility
- `GET /api/health` - Server health check

For detailed API documentation with request/response examples, see `database/README.md`.

## Development Workflow

### Adding New Features

1. **Define Model** in `database/models/` (Mongoose schema)
2. **Create Controller** in `database/controllers/` (business logic)
3. **Add Routes** in `database/routes/` (map endpoints to controller methods)
4. **Mount Routes** in `database/server.js` (e.g., `app.use('/api/feature', featureRoutes)`)
5. **Update Frontend** - Create/modify HTML pages and wire to API

### Working with Existing Code

- All database queries use Mongoose ODM
- Controllers use async/await pattern
- User authorization via `req.user` (populated by `protect` middleware)
- Resources scoped to user: `{ usuario: req.user._id }`

### Common Patterns

**Protected Route**:
```javascript
router.get('/resource', protect, controllerMethod);
```

**Role-Based Route**:
```javascript
router.delete('/admin-only', protect, authorize('admin'), controllerMethod);
```

**Controller Response**:
```javascript
res.status(200).json({
    success: true,
    data: result
});
```

**Error Handling**:
```javascript
next(error); // Caught by errorHandler middleware
```

## Recent Updates (Noviembre 2025)

### Visualización Avanzada de Dispositivos

Se implementó un sistema completo de visualización en `deviceinfo.html`:

**Gráficas con Chart.js 4.5.0**:
- Selector de rango temporal: 24H / Semana / Mes
- Gráfica de barras para actuadores/focos mostrando minutos de uso por hora/día
- Gráfica de líneas para sensores (temperatura, humedad)
- Historial de eventos para sensores de movimiento, alarmas, luz

**Vida Útil del Dispositivo**:
- Barra de progreso mostrando porcentaje de vida útil restante
- Cálculo basado en horas totales de uso (ej: focos = 15,000 hrs, ventiladores = 20,000 hrs)
- Colores dinámicos: verde (>50%), amarillo (10-50%), rojo (<10%)

**Archivos modificados**:
- `deviceinfo.html` - Lógica de renderizado de gráficas y cálculo de vida útil
- `database/controllers/deviceController.js` - Endpoint mejorado para datos históricos

### ESP32 Integration - Motor de Reglas

**Control bidireccional ESP32 ↔ Backend**:
- `toggleDevice()` en `deviceController.js` ahora envía comandos HTTP al ESP32 usando la IP de la habitación
- URL de comando: `http://{room.ip}/control?dispositivo={id}&comando={on|off}`

**ESP32 Controller mejorado** (`espController.js`):
- `GET /api/esp/esp-config/:habitacionId` - Envía configuración completa al ESP32 (dispositivos + reglas activas)
- `POST /api/esp/report-data/:habitacionId` - Recibe datos de sensores y ejecuta automatizaciones
- Mapeo de operadores para condiciones: `mayor` → `>`, `menor` → `<`, etc.
- Manejo seguro de habitaciones sin dispositivos configurados

**Estructura de configuración ESP32**:
```json
{
  "id": "room_id",
  "nombre": "Sala",
  "ip": "192.168.1.100",
  "dispositivos": [
    { "id": "...", "nombre": "Foco", "pin": 5, "tipo": "luz" }
  ],
  "automatizaciones": [
    {
      "id": "...",
      "condicion": { "dispositivo_id": "...", "operador": ">", "valor": 30 },
      "accion": { "dispositivo_id": "...", "comando": "ON" }
    }
  ]
}
```

### Task Automation - Formularios Completados

**Device Types Enum** (`database/models/Device.js`):
```javascript
enum: ['actuador', 'camara', 'gas', 'humedad', 'luz', 'movimiento', 'temperatura']
```

**Formularios por tipo de dispositivo**:

| Tipo | Campos | Validación |
|------|--------|------------|
| **Luz** | Hora encender/apagar, sensores de luz | Al menos hora O sensor |
| **Temperatura/Humedad** | Hora/temp encender, hora/temp apagar | Al menos hora O temp |
| **Movimiento/Gas** | Hora de activación (label: "Activar a la(s)") | Requerida |
| **Actuador** | Hora encender (req), hora apagar (opt) | Hora encender requerida |

**Páginas de tareas**:
- `addtask.html` - Crear tarea desde dispositivo específico
- `newtask.html` - Crear tarea desde automatización
- `taskinfo.html` - Editar tarea existente
- `cameraedit.html` - Editar/eliminar cámaras de seguridad (NUEVA)
