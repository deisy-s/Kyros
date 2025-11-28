const Device = require('../models/Device');
const Room = require('../models/Room');
const DeviceData = require('../models/DeviceData');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
// @desc    Obtener todos los dispositivos del usuario
// @route   GET /api/devices
// @access  Private
exports.getDevices = async (req, res, next) => {
    try {
        const { tipo, habitacion } = req.query;

        const query = { usuario: req.user.id };
        if (tipo) query.tipo = tipo;
        if (habitacion) query.habitacion = habitacion;

        const devices = await Device.find(query)
            .populate('habitacion', 'nombre icono')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: devices.length,
            data: devices
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener un dispositivo por ID
// @route   GET /api/devices/:id
// @access  Private
exports.getDevice = async (req, res, next) => {
    try {
        const device = await Device.findById(req.params.id)
            .populate('habitacion', 'nombre icono')
            .populate('usuario', 'nombre email');

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Dispositivo no encontrado'
            });
        }

        // Verificar propiedad
        if (device.usuario._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado'
            });
        }

        res.status(200).json({
            success: true,
            data: device
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear nuevo dispositivo
// @route   POST /api/devices
// @access  Private
exports.createDevice = async (req, res, next) => {
    try {
        // Verificar que la habitación existe y pertenece al usuario
        const room = await Room.findById(req.body.habitacion);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Habitación no encontrada'
            });
        }

        if (room.usuario.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado'
            });
        }

        // Agregar usuario
        req.body.usuario = req.user.id;

        const device = await Device.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Dispositivo creado exitosamente',
            data: device
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar dispositivo
// @route   PUT /api/devices/:id
// @access  Private
exports.updateDevice = async (req, res, next) => {
    try {
        let device = await Device.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Dispositivo no encontrado'
            });
        }

        // Verificar propiedad
        if (device.usuario.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado'
            });
        }

        device = await Device.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Dispositivo actualizado exitosamente',
            data: device
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Eliminar dispositivo
// @route   DELETE /api/devices/:id
// @access  Private
exports.deleteDevice = async (req, res, next) => {
    try {
        const device = await Device.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Dispositivo no encontrado'
            });
        }

        // Verificar propiedad
        if (device.usuario.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado'
            });
        }

        await device.deleteOne();

        // Opcionalmente eliminar datos históricos
        // await DeviceData.deleteMany({ dispositivo: req.params.id });

        res.status(200).json({
            success: true,
            message: 'Dispositivo eliminado exitosamente',
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cambiar estado de dispositivo (encender/apagar)
// @route   PUT /api/devices/:id/toggle
// @access  Private
exports.toggleDevice = async (req, res, next) => {
    try {
        let device = await Device.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                    success: false,
                    message: 'Dispositivo no encontrado'
                });
        }

        // 1. Cambiar el estado en la Base de Datos
        // Verificamos si 'estado' es un objeto o un booleano
        let estadoActual = false;

        if (typeof device.estado === 'object' && device.estado !== null) {
            estadoActual = device.estado.encendido || false;
        } else {
            estadoActual = !!device.estado; // Forzamos a booleano si era otra cosa
        }

        // Sobrescribimos con el objeto correcto que espera tu esquema
        device.estado = {
            encendido: !estadoActual,
            valor: !estadoActual ? 100 : 0 // Valor por defecto para dimmer/intensidad
        };

        // Marcamos el campo como modificado para forzar a Mongoose a guardarlo
        device.markModified('estado'); 
        await device.save();

        // 2. Guardar registro en el historial
        await DeviceData.create({
            dispositivo: device._id,
            tipo: 'estado',
            valor: device.estado ? 'Encendido' : 'Apagado',
            metadata: { origen: 'Manual (Web)' }
        });

        // --- 3. ENVIAR COMANDO AL ESP32 (NUEVO) ---
        try {
            // Buscar la habitación para obtener la IP
            const room = await Room.findById(device.habitacion);
            
            if (room && room.ip) {
                const comando = device.estado.encendido ? 'on' : 'off';
                const url = `http://${room.ip}/control?dispositivo=${device._id}&comando=${comando}`;
                
                console.log(`[DeviceController] Enviando a ESP32: ${url}`);
                
                // Enviamos el comando (con timeout corto para no bloquear)
                fetch(url, { timeout: 2000 })
                    .then(response => {
                        if (response.ok) console.log("[DeviceController] ESP32 respondió OK");
                        else console.warn("[DeviceController] ESP32 respondió error");
                    })
                    .catch(err => console.error(`[DeviceController] No se pudo conectar al ESP32 (${room.ip}):`, err.message));
            } else {
                console.warn("[DeviceController] No se puede controlar físico: La habitación no tiene IP.");
            }
        } catch (netError) {
            console.error("[DeviceController] Error de red al intentar controlar hardware:", netError);
            // No detenemos la respuesta, el cambio en BD ya se hizo
        }
        // -------------------------------------------

        res.status(200).json({
            success: true,
            data: device
        });

    }catch (error) {
        next(error);
    }
};

// @desc    Obtener datos históricos de dispositivo
// @route   GET /api/devices/:id/data
// @access  Private
exports.getDeviceData = async (req, res, next) => {
    try {
        const device = await Device.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Dispositivo no encontrado'
            });
        }

        // Verificar propiedad
        if (device.usuario.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado'
            });
        }

        const { tipo, limit = 100, desde, hasta, aggregate } = req.query;

        // Si se solicita agregación, usar pipeline de MongoDB
        if (aggregate) {
            return handleAggregatedData(req, res, next);
        }

        // Comportamiento normal (sin agregación)
        const query = { dispositivo: req.params.id };
        if (tipo) query.tipo = tipo;

        // Filtro de fechas
        if (desde || hasta) {
            query.timestamp = {};
            if (desde) query.timestamp.$gte = new Date(desde);
            if (hasta) query.timestamp.$lte = new Date(hasta);
        }

        const data = await DeviceData.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        next(error);
    }
};

// Función auxiliar para manejar datos agregados
async function handleAggregatedData(req, res, next) {
    try {
        const { aggregate, desde, hasta } = req.query;
        const deviceId = req.params.id;

        // Verificar el tipo de datos para este dispositivo
        const sampleData = await DeviceData.findOne({ dispositivo: deviceId }).sort({ timestamp: -1 });

        // Si es tipo 'estado' (ON/OFF) o 'movimiento' o 'luz' (eventos), consolidar en backend
        const tiposNoNumericos = ['estado', 'movimiento', 'luz'];
        if (sampleData && tiposNoNumericos.includes(sampleData.tipo)) {
            const now = new Date();
            let startDate = new Date();

            if (aggregate === '24h') startDate.setHours(now.getHours() - 24);
            else if (aggregate === '7d') startDate.setDate(now.getDate() - 7);
            else if (aggregate === '30d') startDate.setDate(now.getDate() - 30);

            if (desde) startDate = new Date(desde);
            const endDate = hasta ? new Date(hasta) : now;

            // Traer TODOS los eventos del rango (sin límite) para consolidar correctamente
            const allData = await DeviceData.find({
                dispositivo: deviceId,
                timestamp: { $gte: startDate, $lte: endDate }
            }).sort({ timestamp: 1 }).lean();  // 1 = Más antiguos primero, lean() para mejor performance

            // Consolidar eventos consecutivos del mismo estado en el backend
            const consolidated = [];
            let currentState = null;
            let rangeStart = null;
            let rangeEnd = null;
            let lastMetadata = null;

            allData.forEach((item, index) => {
                const valStr = String(item.valor).toUpperCase();
                const state = (valStr === 'ON' || valStr === 'ENCENDIDO' || valStr === '1' || valStr === 'TRUE' || valStr === 'ACTIVADA') ? 'ON' : 'OFF';

                if (currentState === null) {
                    // Primer evento
                    currentState = state;
                    rangeStart = item.timestamp;
                    rangeEnd = item.timestamp;
                    lastMetadata = item.metadata;
                } else if (state === currentState) {
                    // Mismo estado, extender el rango
                    rangeEnd = item.timestamp;
                } else {
                    // Cambió el estado, guardar el rango anterior
                    consolidated.push({
                        timestamp: rangeStart,  // Inicio del período
                        timestampEnd: rangeEnd, // Fin del período
                        valor: currentState,
                        metadata: lastMetadata
                    });

                    // Comenzar nuevo rango
                    currentState = state;
                    rangeStart = item.timestamp;
                    rangeEnd = item.timestamp;
                    lastMetadata = item.metadata;
                }

                // Si es el último elemento, cerrar el rango
                if (index === allData.length - 1) {
                    consolidated.push({
                        timestamp: rangeStart,
                        timestampEnd: rangeEnd,
                        valor: currentState,
                        metadata: lastMetadata
                    });
                }
            });

            // Invertir para mostrar más recientes primero
            consolidated.reverse();

            return res.status(200).json({
                success: true,
                aggregation: aggregate,
                count: consolidated.length,
                totalEvents: allData.length,
                range: { desde: startDate, hasta: endDate },
                data: consolidated
            });
        }

        // Calcular rango de fechas según el tipo de agregación
        const now = new Date();
        let startDate = new Date();
        let groupFormat = {};

        if (aggregate === '24h') {
            // Últimas 24 horas - agrupar por hora
            startDate.setHours(now.getHours() - 24);
            groupFormat = {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' },
                hour: { $hour: '$timestamp' }
            };
        } else if (aggregate === '7d') {
            // Última semana - agrupar por día
            startDate.setDate(now.getDate() - 7);
            groupFormat = {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' }
            };
        } else if (aggregate === '30d') {
            // Último mes - agrupar por día
            startDate.setDate(now.getDate() - 30);
            groupFormat = {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' }
            };
        } else {
            return res.status(400).json({
                success: false,
                message: 'Tipo de agregación no válido. Use: 24h, 7d, o 30d'
            });
        }

        // Usar fechas personalizadas si se proporcionan
        if (desde) startDate = new Date(desde);
        const endDate = hasta ? new Date(hasta) : now;

        // Pipeline de agregación de MongoDB
        const pipeline = [
            {
                $match: {
                    dispositivo: new mongoose.Types.ObjectId(deviceId),
                    timestamp: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: groupFormat,
                    avgValue: { $avg: { $toDouble: '$valor' } },
                    minValue: { $min: { $toDouble: '$valor' } },
                    maxValue: { $max: { $toDouble: '$valor' } },
                    count: { $sum: 1 },
                    firstTimestamp: { $first: '$timestamp' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
            },
            {
                $project: {
                    _id: 0,
                    period: '$_id',
                    timestamp: '$firstTimestamp',
                    valor: { $round: ['$avgValue', 2] },
                    avg: { $round: ['$avgValue', 2] },
                    min: { $round: ['$minValue', 2] },
                    max: { $round: ['$maxValue', 2] },
                    count: 1
                }
            }
        ];

        const data = await DeviceData.aggregate(pipeline);

        res.status(200).json({
            success: true,
            aggregation: aggregate,
            count: data.length,
            range: { desde: startDate, hasta: endDate },
            data
        });

    } catch (error) {
        next(error);
    }
}
