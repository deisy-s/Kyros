const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'Por favor ingrese un nombre para la habitación'],
        trim: true
    },
    descripcion: {
        type: String,
        trim: true,
        default: ''
    },
    icono: {
        type: String,
        default: 'Sofa--Streamline-Flex.png' // Icono por defecto
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'La habitación debe pertenecer a un usuario']
    },
    // IP del ESP32 que controla esta habitación
    ip: {
        type: String,
        trim: true,
        default: '',
        validate: {
            validator: function(v) {
                if (!v) return true; // Permitir vacío
                // Validar formato IP
                return /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
            },
            message: 'Por favor ingrese una dirección IP válida (ej. 192.168.0.28)'
        }
    },
    // Estadísticas y configuración
    configuracion: {
        mostrarEnDashboard: {
            type: Boolean,
            default: true
        },
        orden: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual para obtener dispositivos de esta habitación
RoomSchema.virtual('dispositivos', {
    ref: 'Device',
    localField: '_id',
    foreignField: 'habitacion',
    justOne: false
});

// Virtual para contar dispositivos
RoomSchema.virtual('totalDispositivos', {
    ref: 'Device',
    localField: '_id',
    foreignField: 'habitacion',
    count: true
});

module.exports = mongoose.model('Room', RoomSchema, 'rooms');
