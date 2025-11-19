const express = require('express');
const router = express.Router();
const { getESPConfig, reportSensorData } = require('../controllers/espController');

// Ruta pública para ESP32
router.get('/esp-config/:habitacionId', getESPConfig);

router.post('/report-data/:habitacionId', reportSensorData);

module.exports = router;
