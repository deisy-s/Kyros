const mongoose = require('mongoose');

// Modelo para reglas de automatización
const AutomatizeSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'Por favor ingrese un nombre para la automatización'],
        trim: true
    },
    descripcion: {
        type: String,
        trim: true,
        default: ''
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: [true, 'La automatización debe pertenecer a un usuario']
    },
    activa: {
        type: Boolean,
        default: true
    },
    // Tipo de trigger
    trigger: {
        tipo: {
            type: String,
            required: true,
            enum: [
                'horario',          // Basado en tiempo
                'sensor',           // Basado en sensor
                'estado_dispositivo', // Cuando un dispositivo cambia de estado
                'ubicacion',        // Basado en ubicación
                'manual'            // Activación manual
            ]
        },
        // Para trigger de horario
        horario: {
            dias: [{
                type: Number,
                min: 0,
                max: 6
            }],
            hora: String, // HH:MM
            amanecer: Boolean,
            atardecer: Boolean,
            offset: Number // Minutos antes/después de amanecer/atardecer
        },
        // Para trigger de sensor
        sensor: {
            dispositivo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Device'
            },
            tipoSensor: {
                type: String,
                enum: ['temperatura', 'humedad', 'movimiento', 'luz', 'gas', 'puerta', 'ventana', 'otro']
            },
            condicion: {
                operador: {
                    type: String,
                    enum: ['igual', 'diferente', 'mayor', 'menor', 'mayor_igual', 'menor_igual', 'entre']
                },
                valor: mongoose.Schema.Types.Mixed,
                valorMax: mongoose.Schema.Types.Mixed // Para operador 'entre'
            }
        },
        // Para trigger de estado de dispositivo
        dispositivoEstado: {
            dispositivo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Device'
            },
            estadoEsperado: mongoose.Schema.Types.Mixed
        }
    },
    // Condiciones adicionales (AND)
    condiciones: [{
        tipo: {
            type: String,
            enum: ['horario', 'dia_semana', 'temperatura', 'estado_dispositivo', 'otro']
        },
        operador: String,
        valor: mongoose.Schema.Types.Mixed,
        dispositivo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Device'
        }
    }],
    // Acciones a ejecutar
    acciones: [{
        dispositivo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Device',
            required: true
        },
        accion: {
            type: String,
            required: true,
            enum: ['encender', 'apagar', 'toggle', 'ajustar_brillo', 'ajustar_temperatura', 'cambiar_color', 'personalizado']
        },
        parametros: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        retardo: {
            type: Number,
            default: 0 // Segundos de retardo antes de ejecutar esta acción
        },
        orden: {
            type: Number,
            default: 0
        }
    }],
    // Configuración avanzada
    configuracion: {
        // Cooldown para evitar ejecuciones repetidas
        cooldownMinutos: {
            type: Number,
            default: 0
        },
        // Ejecutar solo una vez al día
        unaVezPorDia: {
            type: Boolean,
            default: false
        },
        // Revertir acciones después de X minutos
        revertir: {
            activo: {
                type: Boolean,
                default: false
            },
            despuesDeMinutos: {
                type: Number,
                default: 60
            }
        }
    },
    // Estadísticas
    ultimaEjecucion: {
        type: Date
    },
    ultimaEjecucionExitosa: {
        type: Date
    },
    totalEjecuciones: {
        type: Number,
        default: 0
    },
    totalFallos: {
        type: Number,
        default: 0
    },
    // Logs de ejecución recientes
    historial: [{
        fecha: {
            type: Date,
            default: Date.now
        },
        exitoso: Boolean,
        mensaje: String,
        error: String
    }]
}, {
    timestamps: true
});

// Índices
AutomatizeSchema.index({ usuario: 1, activa: 1 });
AutomatizeSchema.index({ 'trigger.tipo': 1 });

// Limitar historial a últimas 50 ejecuciones
AutomatizeSchema.pre('save', function(next) {
    if (this.historial && this.historial.length > 50) {
        this.historial = this.historial.slice(-50);
    }
    next();
});

module.exports = mongoose.model('Automatize', AutomatizeSchema, 'automatize');
