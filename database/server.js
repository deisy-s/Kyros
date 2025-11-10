require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar configuración de DB
const connectDB = require('./config/database');

// Importar middleware
const errorHandler = require('./middleware/errorHandler');

// Importar rutas
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const deviceRoutes = require('./routes/devices');
const cameraRoutes = require('./routes/cameras');
const taskRoutes = require('./routes/tasks');
const automatizeRoutes = require('./routes/automatize');
const espRoutes = require('./routes/esp');

const app = express();

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging en desarrollo
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Montar rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/automatize', automatizeRoutes);
app.use('/api', espRoutes); // Ruta pública para ESP32

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Servir archivos estáticos del frontend
const frontendDir = path.join(__dirname, '..');
app.use(express.static(frontendDir));

// Ruta principal - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
});

// Manejar rutas HTML del frontend
const htmlRoutes = [
    '/login.html',
    '/register.html',
    '/rooms.html',
    '/devices.html',
    '/deviceinfo.html',
    '/adddevice.html',
    '/addroom.html',
    '/security.html',
    '/automatize.html',
    '/addtask.html',
    '/newtask.html',
    '/taskdata.html',
    '/taskinfo.html',
    '/helpcenter.html'
];

htmlRoutes.forEach(route => {
    app.get(route, (req, res) => {
        res.sendFile(path.join(frontendDir, route));
    });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Manejar rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`[KYROS] Servidor iniciado en modo ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Express] Escuchando en http://localhost:${PORT}`);
    console.log(`[API] Disponible en http://localhost:${PORT}/api`);
    console.log('='.repeat(50));
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
    console.error('ERROR NO MANEJADO:', err);
    if (process.env.NODE_ENV === 'production') {
        server.close(() => process.exit(1));
    }
});

module.exports = app;
