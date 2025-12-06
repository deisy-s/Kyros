const mongoose = require('mongoose');

const CameraSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'Por favor ingrese un nombre para la cámara'],
        trim: true
    },
    descripcion: {
        type: String,
        trim: true,
        default: ''
    },
    habitacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'La cámara debe estar asignada a una habitación']
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'La cámara debe pertenecer a un usuario']
    },
    // URLs de streaming (RTSP/MJPEG tradicional)
    streamingConfig: {
        urlPrincipal: {
            type: String,
            default: ''
        },
        urlSecundaria: {
            type: String,
            default: ''
        },
        tipo: {
            type: String,
            default: 'websocket' // websocket para ESP32-CAM, rtsp/mjpeg para cámaras tradicionales
        }
    },
    // Estado de la cámara
    estado: {
        activa: {
            type: Boolean,
            default: true  // ← Cambiado a true para que inicie activa
        },
        grabando: {
            type: Boolean,
            default: false
        },
        deteccionMovimiento: {
            type: Boolean,
            default: false
        },
        conectada: {
            type: Boolean,
            default: true
        }
    },
    // Configuración
    configuracion: {
        resolucion: {
            type: String,
            enum: ['720p', '1080p', '2k', '4k'],
            default: '1080p'
        },
        fps: {
            type: Number,
            default: 30
        },
        visionNocturna: {
            type: Boolean,
            default: false
        },
        audio: {
            type: Boolean,
            default: true
        },
        // Configuración de detección
        sensibilidadMovimiento: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },
        zonasDeteccion: [{
            nombre: String,
            coordenadas: mongoose.Schema.Types.Mixed
        }]
    },
    // Información del hardware
    hardware: {
        marca: {
            type: String,
            default: ''
        },
        modelo: {
            type: String,
            default: ''
        },
        mac: {
            type: String,
            default: ''
        },
        ip: {
            type: String,
            default: ''
        },
        firmware: {
            type: String,
            default: ''
        }
    },
    // WebSocket streaming (ESP32)
    streaming: {
        type: Boolean,
        default: false,
        description: 'Indica si la cámara está transmitiendo en vivo'
    },
    lastStreamUpdate: {
        type: Date,
        default: null,
        description: 'Última vez que se recibió un frame'
    },
    // Configuración WiFi para ESP32 (Opción 2: setup desde web)
    wifiConfig: {
        ssid: {
            type: String,
            default: '',
            description: 'Nombre de la red WiFi del hogar'
        },
        password: {
            type: String,
            default: '',
            description: 'Contraseña de la red WiFi (encriptada en producción)'
        },
        configured: {
            type: Boolean,
            default: false,
            description: 'Indica si el ESP32 ya descargó su configuración'
        },
        lastConfigDownload: {
            type: Date,
            default: null,
            description: 'Última vez que el ESP32 descargó configuración'
        }
    },
    // Vinculación por Serial/MAC (Opción B: QR Code)
    serialNumber: {
        type: String,
        default: '',
        sparse: true,
        description: 'MAC Address del ESP32 para vinculación'
    },
    linked: {
        type: Boolean,
        default: false,
        description: 'Indica si el ESP32 físico ya se vinculó con esta cámara'
    },
    // Código de activación para Captive Portal (Opción 1)
    activationCode: {
        type: String,
        unique: true,
        sparse: true,
        default: function() {
            // Generar código aleatorio de 6 caracteres (A-Z, 0-9)
            return Math.random().toString(36).substring(2, 8).toUpperCase();
        },
        description: 'Código de 6 caracteres para vincular ESP32 vía Captive Portal'
    },
    activationCodeUsed: {
        type: Boolean,
        default: false,
        description: 'Indica si el código de activación ya fue usado'
    },
    activationCodeExpiry: {
        type: Date,
        default: function() {
            // Código expira en 24 horas
            return new Date(Date.now() + 24 * 60 * 60 * 1000);
        },
        description: 'Fecha de expiración del código de activación'
    },
    // Almacenamiento de grabaciones
    almacenamiento: {
        tipo: {
            type: String,
            enum: ['local', 'nube', 'ambos'],
            default: 'local'
        },
        capacidadTotal: {
            type: Number,
            default: 0 // En GB
        },
        capacidadUsada: {
            type: Number,
            default: 0 // En GB
        },
        rutaAlmacenamiento: {
            type: String,
            default: ''
        }
    }
}, {
    timestamps: true
});

// Índices
CameraSchema.index({ usuario: 1, habitacion: 1 });

module.exports = mongoose.model('Camera', CameraSchema, 'cameras');
