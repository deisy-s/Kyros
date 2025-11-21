const mongoose = require('mongoose');

// Modelo para almacenar datos históricos/telemetría de dispositivos
const DeviceDataSchema = new mongoose.Schema({
    dispositivo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: [true, 'Los datos deben estar asociados a un dispositivo']
    },
    tipo: {
        type: String,
        required: true,
        enum: ['temperatura', 'humedad', 'movimiento', 'luz', 'energia', 'estado', 'gas']
    },
    valor: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    unidad: {
        type: String,
        default: ''
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    // Metadata adicional
    metadata: {
        ubicacion: {
            type: String,
            default: ''
        },
        notas: {
            type: String,
            default: ''
        }
    }
}, {
    timestamps: false // Usamos timestamp personalizado
});

// Índices para consultas eficientes
DeviceDataSchema.index({ dispositivo: 1, timestamp: -1 });
DeviceDataSchema.index({ tipo: 1, timestamp: -1 });

// TTL index - auto-eliminar datos después de 90 días (opcional)
// DeviceDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('DeviceData', DeviceDataSchema, 'devices_data');
