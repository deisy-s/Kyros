const Room = require('../models/Room');
const Device = require('../models/Device');
const Automatize = require('../models/Automatize');
const DeviceData = require('../models/DeviceData');

// @desc    Obtener todas las habitaciones del usuario
// @route   GET /api/rooms
// @access  Private
exports.getRooms = async (req, res, next) => {
    try {
        const rooms = await Room.find({ usuario: req.user.id })
            .populate('totalDispositivos')
            .sort({ 'configuracion.orden': 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: rooms.length,
            data: rooms
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener una habitación por ID
// @route   GET /api/rooms/:id
// @access  Private
exports.getRoom = async (req, res, next) => {
    try {
        const room = await Room.findById(req.params.id)
            .populate({
                path: 'dispositivos',
                select: 'nombre tipo estado configuracion'
            });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Habitación no encontrada'
            });
        }

        // Verificar que la habitación pertenezca al usuario
        if (room.usuario.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado para acceder a esta habitación'
            });
        }

        res.status(200).json({
            success: true,
            data: room
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Crear nueva habitación
// @route   POST /api/rooms
// @access  Private
exports.createRoom = async (req, res, next) => {
    try {
        // Agregar usuario a req.body
        req.body.usuario = req.user.id;

        const room = await Room.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Habitación creada exitosamente',
            data: room
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar habitación
// @route   PUT /api/rooms/:id
// @access  Private
exports.updateRoom = async (req, res, next) => {
    try {
        let room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Habitación no encontrada'
            });
        }

        // Verificar propiedad
        if (room.usuario.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado para modificar esta habitación'
            });
        }

        room = await Room.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Habitación actualizada exitosamente',
            data: room
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Eliminar habitación
// @route   DELETE /api/rooms/:id
// @query   cascade=true para eliminar con todos los dispositivos y automatizaciones
// @access  Private
exports.deleteRoom = async (req, res, next) => {
    try {
        const room = await Room.findById(req.params.id);
        const { cascade } = req.query;

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Habitación no encontrada'
            });
        }

        // Verificar propiedad
        if (room.usuario.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado para eliminar esta habitación'
            });
        }

        // Obtener dispositivos de la habitación
        const devices = await Device.find({ habitacion: req.params.id });
        const deviceIds = devices.map(d => d._id);

        // Si hay dispositivos y NO se pidió cascade, retornar info para confirmación
        if (devices.length > 0 && cascade !== 'true') {
            // Buscar automatizaciones que usen estos dispositivos
            const automatizaciones = await Automatize.find({
                $or: [
                    { 'acciones.dispositivo': { $in: deviceIds } },
                    { 'trigger.sensor.dispositivo': { $in: deviceIds } },
                    { 'trigger.dispositivoEstado.dispositivo': { $in: deviceIds } },
                    { 'condiciones.dispositivo': { $in: deviceIds } }
                ]
            }).select('nombre');

            return res.status(409).json({
                success: false,
                requiresConfirmation: true,
                message: `Esta habitación tiene ${devices.length} dispositivo(s)`,
                data: {
                    dispositivos: devices.map(d => ({ _id: d._id, nombre: d.nombre, tipo: d.tipo })),
                    automatizaciones: automatizaciones.map(a => ({ _id: a._id, nombre: a.nombre }))
                }
            });
        }

        // Si cascade=true o no hay dispositivos, proceder con eliminación
        if (devices.length > 0) {
            // Eliminar automatizaciones que usen estos dispositivos
            await Automatize.deleteMany({
                $or: [
                    { 'acciones.dispositivo': { $in: deviceIds } },
                    { 'trigger.sensor.dispositivo': { $in: deviceIds } },
                    { 'trigger.dispositivoEstado.dispositivo': { $in: deviceIds } },
                    { 'condiciones.dispositivo': { $in: deviceIds } }
                ]
            });

            // Eliminar datos históricos de los dispositivos
            await DeviceData.deleteMany({ dispositivo: { $in: deviceIds } });

            // Eliminar los dispositivos
            await Device.deleteMany({ habitacion: req.params.id });
        }

        // Eliminar la habitación
        await room.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Habitación eliminada exitosamente',
            data: {
                dispositivosEliminados: devices.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener dispositivos de una habitación
// @route   GET /api/rooms/:id/devices
// @access  Private
exports.getRoomDevices = async (req, res, next) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Habitación no encontrada'
            });
        }

        // Verificar propiedad
        if (room.usuario.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No autorizado'
            });
        }

        const devices = await Device.find({ habitacion: req.params.id });

        res.status(200).json({
            success: true,
            count: devices.length,
            data: devices
        });
    } catch (error) {
        next(error);
    }
};
