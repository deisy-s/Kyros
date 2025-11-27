const Task = require('../models/Task');
const Device = require('../models/Device');

// @desc    Obtener todas las tareas del usuario
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
    try {
        let query = { usuario: req.user.id };

        // Filtrar por estado si se proporciona
        if (req.query.estado) {
            query.estado = req.query.estado;
        }

        // Filtrar por activa/inactiva
        if (req.query.activa !== undefined) {
            query.activa = req.query.activa === 'true';
        }

        // Filtrar por tipo
        if (req.query.tipo) {
            query.tipo = req.query.tipo;
        }

        const tasks = await Task.find(query)
            .populate('acciones.dispositivo', 'nombre tipo subtipo habitacion')
            .populate('condiciones.dispositivo', 'nombre tipo subtipo')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener tareas',
            error: error.message
        });
    }
};

// @desc    Obtener una tarea específica
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('acciones.dispositivo', 'nombre tipo subtipo habitacion')
            .populate('condiciones.dispositivo', 'nombre tipo subtipo');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: `Tarea no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la tarea pertenezca al usuario
        if (task.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para acceder a esta tarea'
            });
        }

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener tarea',
            error: error.message
        });
    }
};

// @desc    Crear nueva tarea
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
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

        // Agregar usuario a req.body
        req.body.usuario = req.user.id;

        const task = await Task.create(req.body);

        res.status(201).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear tarea',
            error: error.message
        });
    }
};

// @desc    Actualizar tarea
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: `Tarea no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la tarea pertenezca al usuario
        if (task.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para actualizar esta tarea'
            });
        }

        task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar tarea',
            error: error.message
        });
    }
};

// @desc    Eliminar tarea
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: `Tarea no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la tarea pertenezca al usuario
        if (task.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para eliminar esta tarea'
            });
        }

        await task.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar tarea',
            error: error.message
        });
    }
};

// @desc    Activar/desactivar tarea
// @route   PUT /api/tasks/:id/toggle
// @access  Private
exports.toggleTask = async (req, res, next) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: `Tarea no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la tarea pertenezca al usuario
        if (task.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para controlar esta tarea'
            });
        }

        // Toggle activa
        task.activa = !task.activa;
        await task.save();

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado de tarea',
            error: error.message
        });
    }
};

// @desc    Ejecutar tarea manualmente
// @route   POST /api/tasks/:id/execute
// @access  Private
exports.executeTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('acciones.dispositivo');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: `Tarea no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la tarea pertenezca al usuario
        if (task.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para ejecutar esta tarea'
            });
        }

        // Aquí iría la lógica de ejecución real de la tarea
        // Por ahora solo actualizamos los contadores
        task.ultimaEjecucion = new Date();
        task.totalEjecuciones += 1;
        task.estado = 'completada';

        await task.save();

        res.status(200).json({
            success: true,
            message: 'Tarea ejecutada exitosamente',
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al ejecutar tarea',
            error: error.message
        });
    }
};
