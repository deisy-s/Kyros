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
    // URLs de streaming
    streaming: {
        urlPrincipal: {
            type: String,
            required: [true, 'Se requiere la URL principal de streaming']
        },
        urlSecundaria: {
            type: String,
            default: ''
        },
        tipo: {
            type: String,
            enum: ['rtsp', 'http', 'mjpeg', 'hls'],
            default: 'rtsp'
        }
    },
    // Estado de la cámara
    estado: {
        activa: {
            type: Boolean,
            default: false
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
