const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'Por favor ingrese un nombre para el dispositivo'],
        trim: true
    },
    tipo: {
        type: String,
        required: [true, 'Por favor especifique el tipo de dispositivo'],
        enum: ['luz', 'temperatura', 'actuador']
    },
    habitacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'El dispositivo debe estar asignado a una habitación']
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'El dispositivo debe pertenecer a un usuario']
    },
    // Pin del ESP32
    pin: {
        type: Number,
        required: [true, 'Por favor especifique el pin del dispositivo']
    },
    // Estado simplificado del dispositivo
    estado: {
        encendido: {
            type: Boolean,
            default: false
        },
        valor: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Índices para búsquedas rápidas
DeviceSchema.index({ usuario: 1, habitacion: 1 });
DeviceSchema.index({ tipo: 1 });
DeviceSchema.index({ pin: 1 });

module.exports = mongoose.model('Device', DeviceSchema, 'devices');
