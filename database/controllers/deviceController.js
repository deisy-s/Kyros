const Device = require('../models/Device');
const Room = require('../models/Room');
const DeviceData = require('../models/DeviceData');

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

        // Toggle estado (solo para luz y actuador)
        if (device.tipo === 'luz' || device.tipo === 'actuador') {
            device.estado.encendido = !device.estado.encendido;
        }

        await device.save();

        // Registrar en histórico
        await DeviceData.create({
            dispositivo: device._id,
            tipo: 'estado',
            valor: device.estado.encendido ? 'encendido' : 'apagado'
        });

        res.status(200).json({
            success: true,
            message: `Dispositivo ${device.estado.encendido ? 'encendido' : 'apagado'}`,
            data: device
        });
    } catch (error) {
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

        const { tipo, limit = 100, desde, hasta } = req.query;

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
