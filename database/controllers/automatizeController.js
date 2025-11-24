const Automatize = require('../models/Automatize');
const Device = require('../models/Device');
const { notifyESP32ConfigUpdate } = require('./espController');

// @desc    Obtener todas las automatizaciones del usuario
// @route   GET /api/automatize
// @access  Private
exports.getAutomatizations = async (req, res, next) => {
    try {
        let query = { usuario: req.user.id };

        // Filtrar por activa/inactiva
        if (req.query.activa !== undefined) {
            query.activa = req.query.activa === 'true';
        }

        // Filtrar por tipo de trigger
        if (req.query.trigger) {
            query['trigger.tipo'] = req.query.trigger;
        }

        const automatizations = await Automatize.find(query)
            .populate('trigger.sensor.dispositivo', 'nombre tipo')
            .populate('trigger.dispositivoEstado.dispositivo', 'nombre tipo')
            .populate('acciones.dispositivo', 'nombre tipo habitacion')
            .populate('condiciones.dispositivo', 'nombre tipo')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: automatizations.length,
            data: automatizations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener automatizaciones',
            error: error.message
        });
    }
};

// @desc    Obtener una automatización específica
// @route   GET /api/automatize/:id
// @access  Private
exports.getAutomatization = async (req, res, next) => {
    try {
        const automatization = await Automatize.findById(req.params.id)
            .populate('trigger.sensor.dispositivo', 'nombre tipo')
            .populate('trigger.dispositivoEstado.dispositivo', 'nombre tipo')
            .populate('acciones.dispositivo', 'nombre tipo habitacion')
            .populate('condiciones.dispositivo', 'nombre tipo');

        if (!automatization) {
            return res.status(404).json({
                success: false,
                message: `Automatización no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la automatización pertenezca al usuario
        if (automatization.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para acceder a esta automatización'
            });
        }

        res.status(200).json({
            success: true,
            data: automatization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener automatización',
            error: error.message
        });
    }
};

// @desc    Crear nueva automatización
// @route   POST /api/automatize
// @access  Private
exports.createAutomatization = async (req, res, next) => {
    try {
        // Verificar que los dispositivos en acciones existan y pertenezcan al usuario
        if (req.body.acciones && req.body.acciones.length > 0) {
            for (const accion of req.body.acciones) {
                if (accion.dispositivo) {
                    const device = await Device.findById(accion.dispositivo);

                    if (!device) {
                        return res.status(404).json({
                            success: false,
                            message: `Dispositivo ${accion.dispositivo} no encontrado`
                        });
                    }

                    if (device.usuario.toString() !== req.user.id) {
                        return res.status(401).json({
                            success: false,
                            message: 'No autorizado para usar este dispositivo'
                        });
                    }
                }
            }
        }

        // Verificar dispositivos en trigger si aplica
        if (req.body.trigger) {
            if (req.body.trigger.sensor && req.body.trigger.sensor.dispositivo) {
                const device = await Device.findById(req.body.trigger.sensor.dispositivo);

                if (!device) {
                    return res.status(404).json({
                        success: false,
                        message: 'Dispositivo sensor no encontrado'
                    });
                }

                if (device.usuario.toString() !== req.user.id) {
                    return res.status(401).json({
                        success: false,
                        message: 'No autorizado para usar este sensor'
                    });
                }
            }

            if (req.body.trigger.dispositivoEstado && req.body.trigger.dispositivoEstado.dispositivo) {
                const device = await Device.findById(req.body.trigger.dispositivoEstado.dispositivo);

                if (!device) {
                    return res.status(404).json({
                        success: false,
                        message: 'Dispositivo de trigger no encontrado'
                    });
                }

                if (device.usuario.toString() !== req.user.id) {
                    return res.status(401).json({
                        success: false,
                        message: 'No autorizado para usar este dispositivo'
                    });
                }
            }
        }

        // Agregar usuario a req.body
        req.body.usuario = req.user.id;

        const automatization = await Automatize.create(req.body);

        // Notificar a ESP32s afectados (no bloqueante)
        notifyESP32ConfigUpdate(automatization).catch(err => {
            console.error('[AutoController] Error notificando ESP32:', err);
        });

        res.status(201).json({
            success: true,
            data: automatization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear automatización',
            error: error.message
        });
    }
};

// @desc    Actualizar automatización
// @route   PUT /api/automatize/:id
// @access  Private
exports.updateAutomatization = async (req, res, next) => {
    try {
        let automatization = await Automatize.findById(req.params.id);

        if (!automatization) {
            return res.status(404).json({
                success: false,
                message: `Automatización no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la automatización pertenezca al usuario
        if (automatization.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para actualizar esta automatización'
            });
        }

        automatization = await Automatize.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        // Notificar a ESP32s afectados (no bloqueante)
        notifyESP32ConfigUpdate(automatization).catch(err => {
            console.error('[AutoController] Error notificando ESP32:', err);
        });

        res.status(200).json({
            success: true,
            data: automatization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar automatización',
            error: error.message
        });
    }
};

// @desc    Eliminar automatización
// @route   DELETE /api/automatize/:id
// @access  Private
exports.deleteAutomatization = async (req, res, next) => {
    try {
        const automatization = await Automatize.findById(req.params.id);

        if (!automatization) {
            return res.status(404).json({
                success: false,
                message: `Automatización no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la automatización pertenezca al usuario
        if (automatization.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para eliminar esta automatización'
            });
        }

        await automatization.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar automatización',
            error: error.message
        });
    }
};

// @desc    Activar/desactivar automatización
// @route   PUT /api/automatize/:id/toggle
// @access  Private
exports.toggleAutomatization = async (req, res, next) => {
    try {
        let automatization = await Automatize.findById(req.params.id);

        if (!automatization) {
            return res.status(404).json({
                success: false,
                message: `Automatización no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la automatización pertenezca al usuario
        if (automatization.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para controlar esta automatización'
            });
        }

        // Toggle activa
        automatization.activa = !automatization.activa;
        await automatization.save();

        // Notificar a ESP32s afectados (no bloqueante)
        notifyESP32ConfigUpdate(automatization).catch(err => {
            console.error('[AutoController] Error notificando ESP32:', err);
        });

        res.status(200).json({
            success: true,
            data: automatization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado de automatización',
            error: error.message
        });
    }
};

// @desc    Ejecutar automatización manualmente
// @route   POST /api/automatize/:id/execute
// @access  Private
exports.executeAutomatization = async (req, res, next) => {
    try {
        const automatization = await Automatize.findById(req.params.id)
            .populate('acciones.dispositivo');

        if (!automatization) {
            return res.status(404).json({
                success: false,
                message: `Automatización no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la automatización pertenezca al usuario
        if (automatization.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para ejecutar esta automatización'
            });
        }

        // Aquí iría la lógica de ejecución real de la automatización
        // Por ahora solo actualizamos los contadores
        automatization.ultimaEjecucion = new Date();
        automatization.ultimaEjecucionExitosa = new Date();
        automatization.totalEjecuciones += 1;

        // Agregar al historial
        automatization.historial.push({
            fecha: new Date(),
            exitoso: true,
            mensaje: 'Ejecutada manualmente por el usuario'
        });

        await automatization.save();

        res.status(200).json({
            success: true,
            message: 'Automatización ejecutada exitosamente',
            data: automatization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al ejecutar automatización',
            error: error.message
        });
    }
};

// @desc    Obtener historial de ejecuciones
// @route   GET /api/automatize/:id/history
// @access  Private
exports.getHistory = async (req, res, next) => {
    try {
        const automatization = await Automatize.findById(req.params.id);

        if (!automatization) {
            return res.status(404).json({
                success: false,
                message: `Automatización no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la automatización pertenezca al usuario
        if (automatization.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para ver el historial'
            });
        }

        res.status(200).json({
            success: true,
            data: automatization.historial
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial',
            error: error.message
        });
    }
};
