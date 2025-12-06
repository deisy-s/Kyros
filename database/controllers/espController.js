const Room = require('../models/Room');
const Device = require('../models/Device');
const Automatize = require('../models/Automatize');
const DeviceData = require('../models/DeviceData');
const Camera = require('../models/Camera');
const fetch = require('node-fetch');

// --------------------------------------------------------------------------
// 1. OBTENER CONFIGURACIÓN (GET)
// --------------------------------------------------------------------------
const getESPConfig = async (req, res, next) => {
    try {
        const { habitacionId } = req.params;
        const room = await Room.findById(habitacionId);
        if (!room) return res.status(404).json({ success: false, message: 'Habitación no encontrada' });

        const devices = await Device.find({ habitacion: habitacionId }).select('_id nombre pin tipo estado').lean();
        const dispositivosMapeados = devices.map(d => ({
            id: d._id.toString(),
            nombre: d.nombre,
            pin: d.pin,
            tipo: d.tipo
        }));
        const deviceIds = devices.map(d => d._id);

        // Buscar automatizaciones activas
        const automatizaciones = await Automatize.find({
            activa: true,
            $or: [
                { 'trigger.sensor.dispositivo': { $in: deviceIds } },
                { 'acciones.dispositivo': { $in: deviceIds } }
            ]
        })
        .populate('trigger.sensor.dispositivo', '_id nombre tipo')
        .populate('acciones.dispositivo', '_id nombre habitacion')
        .lean();

        const automatizacionesMapeadas = await Promise.all(automatizaciones.map(async (auto) => {
            const automatizacion = { id: auto._id.toString(), activa: auto.activa };

            // CASO SENSOR
            if (auto.trigger.tipo === 'sensor' && auto.trigger.sensor.dispositivo) {
                const cond = auto.trigger.sensor.condicion;
                const opMap = { 'mayor': '>', 'menor': '<', 'mayor_igual': '>=', 'menor_igual': '<=', 'igual': '==', 'diferente': '!=' };
                automatizacion.condicion = {
                    dispositivo_id: auto.trigger.sensor.dispositivo._id.toString(),
                    dispositivo_tipo: auto.trigger.sensor.dispositivo.tipo,
                    valor: cond.valor,
                    operador: opMap[cond.operador] || cond.operador
                };

                // Manejar acciones para sensores
                if (auto.acciones && auto.acciones.length > 0) {
                    const acc = auto.acciones[0];
                    let cmd = acc.accion === 'encender' ? 'ON' : 'OFF';
                    automatizacion.accion = {
                        dispositivo_id: acc.dispositivo._id.toString(),
                        comando: cmd,
                        duracion: acc.parametros?.duracion || acc.duracion || 0
                    };

                    // ⭐ NUEVA FUNCIONALIDAD: Enviar condición de apagado por temperatura
                    if (acc.parametros?.sensorTemperaturaApagar && acc.parametros?.temperaturaApagar) {
                        // Buscar información del sensor de apagado
                        const sensorApagado = await Device.findById(acc.parametros.sensorTemperaturaApagar).select('_id tipo').lean();
                        if (sensorApagado) {
                            automatizacion.condicionApagado = {
                                dispositivo_id: sensorApagado._id.toString(),
                                dispositivo_tipo: sensorApagado.tipo,
                                valor: acc.parametros.temperaturaApagar,
                                operador: '<'  // Apagado cuando temperatura sea menor
                            };
                        }
                    }
                }
            }
            // CASO HORARIO
            else if (auto.trigger.tipo === 'horario') {
                automatizacion.tipo = 'horario';
                automatizacion.horario = {
                    hora: auto.trigger.horario.hora,
                    dias: auto.trigger.horario.dias || []
                };

                // --- NUEVA LÓGICA: Calcular Duración si existe horaFin ---
                let duracionCalculada = 0;
                
                if (auto.trigger.horario.hora && auto.trigger.horario.horaFin) {
                    const [h1, m1] = auto.trigger.horario.hora.split(':').map(Number);
                    const [h2, m2] = auto.trigger.horario.horaFin.split(':').map(Number);
                    
                    const inicioMin = h1 * 60 + m1;
                    let finMin = h2 * 60 + m2;
                    
                    // Ajuste por si cruza la medianoche
                    if (finMin < inicioMin) finMin += 24 * 60;
                    
                    duracionCalculada = (finMin - inicioMin) * 60; // Segundos
                }
                // -------------------------------------------------------

                if (auto.acciones && auto.acciones.length > 0) {
                    const acc = auto.acciones[0];
                    let cmd = acc.accion === 'encender' ? 'ON' : 'OFF';
                    automatizacion.accion = {
                        dispositivo_id: acc.dispositivo._id.toString(),
                        comando: cmd,
                        // Usamos la calculada o la manual
                        duracion: duracionCalculada || acc.parametros?.duracion || acc.duracion || 0 
                    };
                }
            }

            return automatizacion;
        })).filter(auto => auto.condicion || (auto.tipo === 'horario' && auto.horario));

        res.status(200).json({
            id: room._id.toString(),
            nombre: room.nombre,
            ip: room.ip || '',
            dispositivos: dispositivosMapeados,
            automatizaciones: automatizacionesMapeadas
        });

    } catch (error) {
        console.error('Error en getESPConfig:', error);
        next(error);
    }
};

// --------------------------------------------------------------------------
// 2. RECIBIR DATOS Y AUTOMATIZAR (POST)
// --------------------------------------------------------------------------
const reportSensorData = async (req, res, next) => {
  const { habitacionId } = req.params;
  const datosSensores = req.body; 
  
  // console.log(`\n--- REPORTE [${habitacionId}] ---`);
  try {
    const devicesInRoom = await Device.find({ habitacion: habitacionId }).select('_id tipo').lean();
    
    if (devicesInRoom.length === 0) {
        console.log(`[Aviso] Habitación ${habitacionId} sin dispositivos.`);
        return res.status(200).json({ status: 'ok_no_devices' });
    }

    const datosParaGuardar = [];
    for (const [key, valor] of Object.entries(datosSensores)) {
        let tipoSensorBuscado;
        if (key === 'temp') tipoSensorBuscado = 'temperatura';
        else if (key === 'hum') tipoSensorBuscado = 'humedad';
        else if (key === 'ldr') tipoSensorBuscado = 'luz';
        else if (key === 'pir') tipoSensorBuscado = 'movimiento';
        else if (key === 'mq2') tipoSensorBuscado = 'gas'; 
        else tipoSensorBuscado = key;

        const device = devicesInRoom.find(d => d.tipo === tipoSensorBuscado);
        if (device) {
            datosParaGuardar.push({
                dispositivo: device._id,
                tipo: tipoSensorBuscado, 
                valor: valor.toString(), 
                unidad: (key === 'temp') ? '°C' : (key === 'hum') ? '%' : '',
            });
        }
    }

    if (datosParaGuardar.length > 0) {
        await DeviceData.insertMany(datosParaGuardar);
    }

    // EJECUTAR MOTOR DE REGLAS
    await checkAndTriggerAutomations(habitacionId, datosSensores, devicesInRoom);
    
    res.status(200).json({ status: 'recibido' });

  } catch (error) {
    console.error('Error en reportSensorData:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

// --------------------------------------------------------------------------
// 3. MOTOR DE REGLAS 
// --------------------------------------------------------------------------
async function checkAndTriggerAutomations(habitacionId, datosSensores, devicesInRoom) {
  const deviceIds = devicesInRoom.map(d => d._id);
  
  // Hora actual para reglas de tiempo
  const now = new Date();
  const currentTimeVal = now.getHours() * 60 + now.getMinutes(); 

  // 1. CONSULTA CORREGIDA: Traer reglas de Sensor O de Horario
  const automatizaciones = await Automatize.find({
    'activa': true,
    $or: [
        { 'trigger.tipo': 'sensor', 'trigger.sensor.dispositivo': { $in: deviceIds } },
        { 'trigger.tipo': 'horario', 'acciones.dispositivo': { $in: deviceIds } }
    ]
  }).populate('acciones.dispositivo', 'habitacion').lean();
    
  for (const regla of automatizaciones) {
    
    // --- BLOQUE A: REGLAS DE HORARIO ---
    if (regla.trigger.tipo === 'horario') {
        if (!regla.trigger.horario?.hora) continue;

        const [hInicio, mInicio] = regla.trigger.horario.hora.split(':').map(Number);
        const tiempoInicio = hInicio * 60 + mInicio;

        // Si es el minuto exacto, enviamos la orden
        if (currentTimeVal === tiempoInicio) {
            console.log(`[Reglas] ⏰ ¡HORARIO CUMPLIDO! ${regla.trigger.horario.hora}`);

            // Calcular duración si existe horaFin
            let duracionCalculada = 0;
            if (regla.trigger.horario.hora && regla.trigger.horario.horaFin) {
                const [h1, m1] = regla.trigger.horario.hora.split(':').map(Number);
                const [h2, m2] = regla.trigger.horario.horaFin.split(':').map(Number);

                const inicioMin = h1 * 60 + m1;
                let finMin = h2 * 60 + m2;

                // Ajuste por si cruza la medianoche
                if (finMin < inicioMin) finMin += 24 * 60;

                duracionCalculada = (finMin - inicioMin) * 60; // Segundos
            }

            for (const accion of regla.acciones) {
                const habitacionActuador = await Room.findById(accion.dispositivo.habitacion).select('ip').lean();
                if (habitacionActuador && habitacionActuador.ip) {
                    const cmd = (accion.accion === 'encender') ? 'on' : 'off';
                    // Usar duración calculada o la manual
                    const duracion = duracionCalculada || accion.parametros?.duracion || accion.duracion || 0;
                    await enviarComandoESP(habitacionActuador.ip, accion.dispositivo._id.toString(), cmd, duracion);
                }
            }
        }
        continue; 
    }

    // --- BLOQUE B: REGLAS DE SENSOR ---
    const sensorId = regla.trigger.sensor.dispositivo.toString();
    const sensorInfo = devicesInRoom.find(d => d._id.toString() === sensorId);
    if (!sensorInfo) continue; 
    
    const sensorTipo = sensorInfo.tipo; 
    let valorSensor;
    
    if (sensorTipo === 'temperatura') valorSensor = datosSensores['temp'];
    else if (sensorTipo === 'humedad') valorSensor = datosSensores['hum'];
    else if (sensorTipo === 'luz') valorSensor = datosSensores['ldr'];
    else if (sensorTipo === 'gas') valorSensor = datosSensores['mq2'];
    else if (sensorTipo === 'movimiento') valorSensor = datosSensores['pir'];
    
    if (valorSensor === undefined) continue;

    const valorRegla = Number(regla.trigger.sensor.condicion.valor);
    const valorActual = Number(valorSensor);
    const operador = regla.trigger.sensor.condicion.operador;

    let cumple = false;
    if (operador === 'mayor') cumple = valorActual > valorRegla;
    else if (operador === 'menor') cumple = valorActual < valorRegla;
    else if (operador === 'igual') cumple = valorActual == valorRegla;
    else if (operador === 'diferente') cumple = valorActual != valorRegla;
    else if (operador === 'mayor_igual') cumple = valorActual >= valorRegla;
    else if (operador === 'menor_igual') cumple = valorActual <= valorRegla;

    if (cumple) {
      console.log(`[Reglas] 📡 ¡SENSOR CUMPLIDO! ${sensorTipo}: ${valorActual} ${operador} ${valorRegla}`);
      
      for (const accion of regla.acciones) {
        const habitacionActuador = await Room.findById(accion.dispositivo.habitacion).select('ip').lean();
        
        if (habitacionActuador && habitacionActuador.ip) {
            const cmd = (accion.accion === 'encender') ? 'on' : 'off';
            // Buscar duración en parámetros (si es alarma)
            const duracion = accion.parametros?.duracion || accion.duracion || 0; 
            await enviarComandoESP(habitacionActuador.ip, accion.dispositivo._id.toString(), cmd, duracion);
        }
      }
    }
  }
}

// --- FUNCIÓN DE ENVÍO (CORREGIDA) ---
async function enviarComandoESP(ip, dispositivoId, comando, duracion = 0) {
    const url = `http://${ip}/control?dispositivo=${dispositivoId}&comando=${comando}&duration=${duracion}`;
    try {
        const response = await fetch(url);
        if (response.ok) console.log(`[Comando] ✅ ${comando} -> ${dispositivoId} (Duración: ${duracion}s)`);
        else console.warn(`[Comando] ⚠️ Error del ESP: ${response.status}`);
    } catch (err) {
        console.error(`[Comando] ❌ Error conectando a ${ip}`);
    }
}

// @desc    Notificar cambios (PUSH)
const notifyESP32ConfigUpdate = async (automatizacion) => {
    try {
        const habitacionesSet = new Set();

        // Trigger
        if (automatizacion.trigger?.sensor?.dispositivo) {
            const dev = await Device.findById(automatizacion.trigger.sensor.dispositivo);
            if (dev) habitacionesSet.add(dev.habitacion.toString());
        }
        // Acciones
        if (automatizacion.acciones) {
            for (const acc of automatizacion.acciones) {
                const dev = await Device.findById(acc.dispositivo);
                if (dev) habitacionesSet.add(dev.habitacion.toString());
            }
        }

        // Enviar a todos los involucrados
        for (const roomId of habitacionesSet) {
            await pushConfigToRoom(roomId);
        }
    } catch (error) {
        console.error('[Push] Error notificando:', error);
    }
};

// --------------------------------------------------------------------------
// 4. ENDPOINT DE SETUP INICIAL PARA ESP32-CAM (Sin autenticación)
// --------------------------------------------------------------------------
const getCameraSetup = async (req, res, next) => {
    try {
        const { cameraId } = req.params;

        // Importar el modelo Camera
        const Camera = require('../models/Camera');

        // Buscar cámara por ID
        const camera = await Camera.findById(cameraId)
            .select('_id nombre wifiConfig')
            .lean();

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: 'Cámara no encontrada'
            });
        }

        // Verificar que tenga configuración WiFi
        if (!camera.wifiConfig || !camera.wifiConfig.ssid) {
            return res.status(400).json({
                success: false,
                message: 'Esta cámara no tiene configuración WiFi. Configure el WiFi en la interfaz web.'
            });
        }

        // Obtener IP del servidor (puede ser del header o configuración)
        const serverIP = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';

        // Marcar como configurada y actualizar timestamp
        await Camera.findByIdAndUpdate(cameraId, {
            'wifiConfig.configured': true,
            'wifiConfig.lastConfigDownload': new Date()
        });

        // Retornar configuración
        res.status(200).json({
            success: true,
            data: {
                cameraId: camera._id.toString(),
                cameraName: camera.nombre,
                wifi: {
                    ssid: camera.wifiConfig.ssid,
                    password: camera.wifiConfig.password
                },
                server: {
                    host: serverIP,
                    port: 3000,
                    wsPath: '/ws/camera'
                }
            }
        });

        console.log(`[Setup] ✅ ESP32-CAM "${camera.nombre}" descargó configuración`);

    } catch (error) {
        console.error('[Setup] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuración',
            error: error.message
        });
    }
};

// --------------------------------------------------------------------------
// 5. ENDPOINT DE VINCULACIÓN POR SERIAL/MAC (Opción B: QR Code)
// --------------------------------------------------------------------------
const linkCameraBySerial = async (req, res, next) => {
    try {
        const { cameraId, serialNumber, wifiSsid, wifiPassword } = req.body;

        // Validar campos requeridos
        if (!cameraId || !serialNumber || !wifiSsid || !wifiPassword) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren: cameraId, serialNumber, wifiSsid, wifiPassword'
            });
        }

        // Importar el modelo Camera
        const Camera = require('../models/Camera');

        // Buscar cámara por ID específico
        const camera = await Camera.findById(cameraId);

        if (!camera) {
            return res.status(404).json({
                success: false,
                message: 'Cámara no encontrada. Verifica el ID de cámara.'
            });
        }

        // Verificar si ya está vinculada
        if (camera.linked && camera.serialNumber !== serialNumber) {
            return res.status(400).json({
                success: false,
                message: 'Esta cámara ya está vinculada a otro ESP32.'
            });
        }

        // Vincular el ESP32 con la cámara
        camera.serialNumber = serialNumber;
        camera.linked = true;
        camera.wifiConfig.ssid = wifiSsid;
        camera.wifiConfig.password = wifiPassword;
        camera.wifiConfig.configured = true;
        camera.wifiConfig.lastConfigDownload = new Date();
        await camera.save();

        // Obtener IP del servidor
        const serverIP = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';

        // Retornar configuración completa
        res.status(200).json({
            success: true,
            message: `Vinculado exitosamente con cámara: ${camera.nombre}`,
            data: {
                cameraId: camera._id.toString(),
                cameraName: camera.nombre,
                server: {
                    host: serverIP,
                    port: 3000,
                    wsPath: '/ws/camera'
                }
            }
        });

        console.log(`[Link] ✅ ESP32 ${serialNumber} vinculado con cámara "${camera.nombre}" (${camera._id})`);
        console.log(`[Link] WiFi configurado: ${wifiSsid}`);

    } catch (error) {
        console.error('[Link] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al vincular dispositivo',
            error: error.message
        });
    }
};

// @desc    Validar código de activación (Captive Portal)
// @route   POST /api/esp/validate-activation-code
// @access  Public (ESP32 sin autenticar)
const validateActivationCode = async (req, res) => {
    try {
        const { activationCode, macAddress } = req.body;

        console.log(`[Activation] Validando código: ${activationCode} para MAC: ${macAddress}`);

        if (!activationCode || !macAddress) {
            return res.status(400).json({
                success: false,
                message: 'Código de activación y MAC address son requeridos'
            });
        }

        // Buscar cámara con este código de activación
        const camera = await Camera.findOne({
            activationCode: activationCode.toUpperCase(),
            activationCodeUsed: false
        }).populate('habitacion');

        if (!camera) {
            console.log(`[Activation] ❌ Código inválido o ya usado: ${activationCode}`);
            return res.status(404).json({
                success: false,
                message: 'Código de activación inválido o ya usado'
            });
        }

        // Verificar si el código expiró
        if (camera.activationCodeExpiry && camera.activationCodeExpiry < new Date()) {
            console.log(`[Activation] ⏰ Código expirado: ${activationCode}`);
            return res.status(400).json({
                success: false,
                message: 'El código de activación ha expirado'
            });
        }

        // Marcar código como usado y guardar MAC
        camera.activationCodeUsed = true;
        camera.linked = true;
        camera.serialNumber = macAddress;
        camera.hardware.mac = macAddress;
        await camera.save();

        // Obtener URL del servidor de forma inteligente
        // 1) Si hay SERVER_HOST en env, usarlo (Render)
        // 2) Si no, detectar del request header (funciona para localhost y Render)
        let serverHost = process.env.SERVER_HOST;
        let serverPort = process.env.PORT || 3000;

        if (!serverHost) {
            // Autodetección desde el request
            const hostHeader = req.headers.host;
            if (hostHeader) {
                const parts = hostHeader.split(':');
                serverHost = parts[0];
                if (parts[1]) {
                    serverPort = parts[1];
                }
            } else {
                // Fallback a IP local
                serverHost = req.socket.localAddress || 'localhost';
            }
        }

        console.log(`[Activation] ✅ Código validado. Cámara "${camera.nombre}" vinculada con ESP32 ${macAddress}`);
        console.log(`[Activation] 🌐 Servidor detectado: ${serverHost}:${serverPort}`);

        // Devolver configuración completa
        res.json({
            success: true,
            message: 'Código validado correctamente',
            config: {
                cameraId: camera._id,
                cameraName: camera.nombre,
                roomName: camera.habitacion?.nombre || 'Sin habitación',
                server: {
                    host: serverHost,
                    port: serverPort,
                    wsPath: '/ws/camera'
                }
            }
        });

    } catch (error) {
        console.error('[Activation] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al validar código',
            error: error.message
        });
    }
};

module.exports = {
    getESPConfig,
    reportSensorData,
    notifyESP32ConfigUpdate,
    getCameraSetup,
    linkCameraBySerial,
    validateActivationCode
};