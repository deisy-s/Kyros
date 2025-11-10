const express = require('express');
const router = express.Router();
const { getESPConfig } = require('../controllers/espController');

// Ruta pública para ESP32
router.get('/esp-config/:habitacionId', getESPConfig);

module.exports = router;
