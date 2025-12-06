const express = require('express');
const router = express.Router();
const { getESPConfig, reportSensorData, getCameraSetup, linkCameraBySerial, validateActivationCode } = require('../controllers/espController');

// Rutas públicas para ESP32
router.get('/esp-config/:habitacionId', getESPConfig);
router.post('/report-data/:habitacionId', reportSensorData);

// Rutas para ESP32-CAM
router.get('/camera-setup/:cameraId', getCameraSetup);           // Opción 2: Por cameraId
router.post('/camera-link', linkCameraBySerial);                 // Opción B: Por serial/MAC (QR)
router.post('/validate-activation-code', validateActivationCode); // Opción 1: Captive Portal

module.exports = router;
