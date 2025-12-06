const express = require('express');
const router = express.Router();

const {
    getCameras,
    getCamera,
    createCamera,
    updateCamera,
    deleteCamera,
    toggleCamera,
    toggleRecording,
    updateConnectionStatus,
    getStreamStatus
} = require('../controllers/cameraController');

const { protect } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales
router.route('/')
    .get(getCameras)
    .post(createCamera);

// Rutas específicas (antes de /:id para evitar conflictos)
router.get('/:id/stream-status', getStreamStatus);
router.put('/:id/toggle', toggleCamera);
router.put('/:id/recording', toggleRecording);
router.put('/:id/status', updateConnectionStatus);

// Rutas genéricas con :id
router.route('/:id')
    .get(getCamera)
    .put(updateCamera)
    .delete(deleteCamera);

module.exports = router;
