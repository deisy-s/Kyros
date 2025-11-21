const Room = require('../models/Room');
const Device = require('../models/Device');
const Automatize = require('../models/Automatize');
const DeviceData = require('../models/DeviceData');
const fetch = require('node-fetch');

// @desc    Obtener configuración completa para ESP32
// @route   GET /api/esp-config/:habitacionId
const getESPConfig = async (req, res, next) => {
    try {
        const { habitacionId } = req.params;
        const room = await Room.findById(habitacionId);

        if (!room) return res.status(404).json({ success: false, message: 'Habitación no encontrada' });

        const devices = await Device.find({ habitacion: habitacionId }).select('_id nombre pin tipo estado').lean();

        const dispositivosMapeados = devices.map(device => ({
            id: device._id.toString(),
            nombre: device.nombre,
            pin: device.pin,
            tipo: device.tipo
        }));

        const deviceIds = devices.map(d => d._id);

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

        const automatizacionesMapeadas = automatizaciones.map(auto => {
            const automatizacion = { id: auto._id.toString(), activa: auto.activa };

            if (auto.trigger.tipo === 'sensor' && auto.trigger.sensor.dispositivo) {
                const condicion = auto.trigger.sensor.condicion;
                
                // Mapeo de operadores para el ESP32
                const operadorMap = {
                    'mayor': '>', 'menor': '<', 'mayor_igual': '>=',
                    'menor_igual': '<=', 'igual': '==', 'diferente': '!='
                };

                automatizacion.condicion = {
                    dispositivo_id: auto.trigger.sensor.dispositivo._id.toString(),
                    dispositivo_tipo: auto.trigger.sensor.dispositivo.tipo,
                    valor: condicion.valor,
                    operador: operadorMap[condicion.operador] || condicion.operador
                };

                if (auto.acciones && auto.acciones.length > 0) {
                    const acc = auto.acciones[0];
                    let cmd = acc.accion === 'encender' ? 'ON' : (acc.accion === 'apagar' ? 'OFF' : acc.accion.toUpperCase());
                    
                    automatizacion.accion = {
                        dispositivo_id: acc.dispositivo._id.toString(),
                        comando: cmd
                    };
                }
            }
            return automatizacion;
        }).filter(auto => auto.condicion);

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

// @desc    Recibe datos y ejecuta reglas
// @route   POST /api/esp/report-data/:habitacionId
const reportSensorData = async (req, res, next) => {
  const { habitacionId } = req.params;
  const datosSensores = req.body; 

  // console.log(`\n--- REPORTE [${habitacionId}] ---`);
  
  try {
    // 1. Buscar dispositivos en BD
    const devicesInRoom = await Device.find({ habitacion: habitacionId }).select('_id tipo').lean();
    
    // --- MODIFICACIÓN DE SEGURIDAD: MANEJO DE HABITACIÓN VACÍA ---
    if (devicesInRoom.length === 0) {
        // Esto evita que el ESP32 marque error en su monitor serial.
        console.log(`[Aviso] La habitación ${habitacionId} no tiene dispositivos configurados. Ignorando datos.`);
        return res.status(200).json({ status: 'ok_sin_configuracion' });
    }
    // -------------------------------------------------------------

    console.log(`[Paso 1] Procesando datos para ${devicesInRoom.length} dispositivos...`);

    const datosParaGuardar = [];
    
    // 2. Mapear datos recibidos a tipos de BD
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

    // 3. Guardar en Historial
    if (datosParaGuardar.length > 0) {
        await DeviceData.insertMany(datosParaGuardar);
        console.log(`[BD] Guardados ${datosParaGuardar.length} registros.`);
    }

    // 4. Ejecutar Motor de Reglas
    // (Solo si hay dispositivos, para evitar errores)
    if (devicesInRoom.length > 0) {
        await checkAndTriggerAutomations(habitacionId, datosSensores, devicesInRoom);
    }
    
    res.status(200).json({ status: 'recibido' });

  } catch (error) {
    // Incluso si hay un error fatal, intentamos no tirar el servidor
    console.error('Error controlado en reportSensorData:', error.message);
    // Respondemos con error 500 al ESP32 pero el servidor sigue vivo
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// --- MOTOR DE REGLAS ---
async function checkAndTriggerAutomations(habitacionId, datosSensores, devicesInRoom) {
  const deviceIds = devicesInRoom.map(d => d._id);

  // Buscar reglas activas
  const automatizaciones = await Automatize.find({
    'activa': true,
    'trigger.tipo': 'sensor',
    'trigger.sensor.dispositivo': { $in: deviceIds }
  }).populate('acciones.dispositivo', 'habitacion').lean();
    
  for (const regla of automatizaciones) {
    const sensorId = regla.trigger.sensor.dispositivo.toString();
    const sensorInfo = devicesInRoom.find(d => d._id.toString() === sensorId);
    if (!sensorInfo) continue; 
    
    // Obtener el valor actual del sensor
    const sensorTipo = sensorInfo.tipo; 
    let valorSensor;
    
    if (sensorTipo === 'temperatura') valorSensor = datosSensores['temp'];
    else if (sensorTipo === 'humedad') valorSensor = datosSensores['hum'];
    else if (sensorTipo === 'luz') valorSensor = datosSensores['ldr']; // Valor será 0 o 4095
    else if (sensorTipo === 'gas') valorSensor = datosSensores['mq2'];
    else if (sensorTipo === 'movimiento') valorSensor = datosSensores['pir'];
    
    if (valorSensor === undefined) continue;

    const valorRegla = Number(regla.trigger.sensor.condicion.valor);
    const valorActual = Number(valorSensor);
    const operador = regla.trigger.sensor.condicion.operador;

    // Evaluación Lógica
    let cumple = false;
    if (operador === 'mayor') cumple = valorActual > valorRegla;
    else if (operador === 'menor') cumple = valorActual < valorRegla;
    else if (operador === 'igual') cumple = valorActual == valorRegla;
    else if (operador === 'diferente') cumple = valorActual != valorRegla;

    if (cumple) {
      console.log(`[Reglas] ¡CUMPLIDA! ${sensorTipo}: ${valorActual} ${operador} ${valorRegla}`);
      
      for (const accion of regla.acciones) {
        const habitacionActuador = await Room.findById(accion.dispositivo.habitacion).select('ip').lean();
        
        if (habitacionActuador && habitacionActuador.ip) {
            const cmd = (accion.accion === 'encender') ? 'on' : 'off';
            await enviarComandoESP(habitacionActuador.ip, accion.dispositivo._id.toString(), cmd);
        }
      }
    }
  }
}

async function enviarComandoESP(ip, dispositivoId, comando) {
    const url = `http://${ip}/control?dispositivo=${dispositivoId}&comando=${comando}`;
    try {
        const response = await fetch(url);
        if (response.ok) console.log(`[Comando] ${comando} -> ${dispositivoId} (Éxito)`);
        else console.warn(`[Comando] ${comando} -> ${dispositivoId} (Error del ESP)`);
    } catch (err) {
        console.error(`[Comando] Error conectando a ${ip}`);
    }
}

module.exports = { getESPConfig, reportSensorData };