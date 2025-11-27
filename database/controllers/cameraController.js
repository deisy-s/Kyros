const Camera = require('../models/Camera');
const Room = require('../models/Room');

// @desc    Obtener todas las cámaras del usuario
// @route   GET /api/cameras
// @access  Private
exports.getCameras = async (req, res, next) => {
    try {
        let query = { usuario: req.user.id };

        // Filtrar por habitación si se proporciona
        if (req.query.habitacion) {
            query.habitacion = req.query.habitacion;
        }

        const cameras = await Camera.find(query)
            .populate('habitacion', 'nombre')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: cameras.length,
            data: cameras
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener cámaras',
            error: error.message
        });
    }
};

// @desc    Obtener una cámara específica
// @route   GET /api/cameras/:id
// @access  Private
exports.getCamera = async (req, res, next) => {
    try {
        const camera = await Camera.findById(req.params.id)
            .populate('habitacion', 'nombre');

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: `Cámara no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la cámara pertenezca al usuario
        if (camera.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para acceder a esta cámara'
            });
        }

        res.status(200).json({
            success: true,
            data: camera
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener cámara',
            error: error.message
        });
    }
};

// @desc    Crear nueva cámara
// @route   POST /api/cameras
// @access  Private
exports.createCamera = async (req, res, next) => {
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
            return res.status(401).json({
                success: false,
                message: 'No autorizado para agregar cámaras a esta habitación'
            });
        }

        // Agregar usuario a req.body
        req.body.usuario = req.user.id;

        // Forzar estado inicial de la cámara
        if (!req.body.estado) {
            req.body.estado = {};
        }
        req.body.estado.activa = true;      // Siempre iniciar activa
        req.body.estado.conectada = true;   // Siempre iniciar conectada

        const camera = await Camera.create(req.body);

        res.status(201).json({
            success: true,
            data: camera
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear cámara',
            error: error.message
        });
    }
};

// @desc    Actualizar cámara
// @route   PUT /api/cameras/:id
// @access  Private
exports.updateCamera = async (req, res, next) => {
    try {
        let camera = await Camera.findById(req.params.id);

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: `Cámara no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la cámara pertenezca al usuario
        if (camera.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para actualizar esta cámara'
            });
        }

        camera = await Camera.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: camera
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar cámara',
            error: error.message
        });
    }
};

// @desc    Eliminar cámara
// @route   DELETE /api/cameras/:id
// @access  Private
exports.deleteCamera = async (req, res, next) => {
    try {
        const camera = await Camera.findById(req.params.id);

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: `Cámara no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la cámara pertenezca al usuario
        if (camera.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para eliminar esta cámara'
            });
        }

        await camera.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar cámara',
            error: error.message
        });
    }
};

// @desc    Activar/desactivar cámara
// @route   PUT /api/cameras/:id/toggle
// @access  Private
exports.toggleCamera = async (req, res, next) => {
    try {
        let camera = await Camera.findById(req.params.id);

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: `Cámara no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la cámara pertenezca al usuario
        if (camera.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para controlar esta cámara'
            });
        }

        // Toggle estado activa
        camera.estado.activa = !camera.estado.activa;
        await camera.save();

        res.status(200).json({
            success: true,
            data: camera
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado de cámara',
            error: error.message
        });
    }
};

// @desc    Cambiar estado de grabación
// @route   PUT /api/cameras/:id/recording
// @access  Private
exports.toggleRecording = async (req, res, next) => {
    try {
        let camera = await Camera.findById(req.params.id);

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: `Cámara no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la cámara pertenezca al usuario
        if (camera.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para controlar esta cámara'
            });
        }

        // Toggle grabación
        camera.estado.grabando = !camera.estado.grabando;
        await camera.save();

        res.status(200).json({
            success: true,
            data: camera
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar grabación',
            error: error.message
        });
    }
};

// @desc    Actualizar estado de conexión
// @route   PUT /api/cameras/:id/status
// @access  Private
exports.updateConnectionStatus = async (req, res, next) => {
    try {
        let camera = await Camera.findById(req.params.id);

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: `Cámara no encontrada con id ${req.params.id}`
            });
        }

        // Verificar que la cámara pertenezca al usuario
        if (camera.usuario.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado para actualizar esta cámara'
            });
        }

        // Actualizar estado de conexión
        camera.estado.conectada = req.body.conectada;
        await camera.save();

        res.status(200).json({
            success: true,
            data: camera
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar estado de conexión',
            error: error.message
        });
    }
};
