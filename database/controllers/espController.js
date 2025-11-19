const Room = require('../models/Room');
const Device = require('../models/Device');
const Automatize = require('../models/Automatize');
const DeviceData = require('../models/DeviceData');
const fetch = require('node-fetch');

// @desc    Obtener configuración completa para ESP32
// @route   GET /api/esp-config/:habitacionId
// @access  Public (el ESP32 no tiene autenticación JWT)
exports.getESPConfig = async (req, res, next) => {
    try {
        const { habitacionId } = req.params;

        // Buscar la habitación
        const room = await Room.findById(habitacionId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Habitación no encontrada'
            });
        }

        // Obtener todos los dispositivos de esta habitación
        const devices = await Device.find({ habitacion: habitacionId })
            .select('_id nombre pin tipo estado')
            .lean();

        // Mapear dispositivos al formato requerido
        const dispositivosMapeados = devices.map(device => ({
            id: device._id.toString(),
            nombre: device.nombre,
            pin: device.pin,
            tipo: device.tipo
        }));

        // Obtener IDs de todos los dispositivos de esta habitación
        const deviceIds = devices.map(d => d._id);

        // Buscar automatizaciones activas que involucren dispositivos de esta habitación
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

        // Mapear automatizaciones al formato requerido
        const automatizacionesMapeadas = automatizaciones.map(auto => {
            const automatizacion = {
                id: auto._id.toString(),
                activa: auto.activa
            };

            // Determinar el tipo de automatización
            if (auto.trigger.tipo === 'sensor' && auto.trigger.sensor.dispositivo) {
                // Automatización basada en sensor
                const condicion = auto.trigger.sensor.condicion;
                let operador = condicion.operador;

                // Mapear operadores al formato del ESP32
                const operadorMap = {
                    'mayor': '>',
                    'menor': '<',
                    'mayor_igual': '>=',
                    'menor_igual': '<=',
                    'igual': '==',
                    'diferente': '!='
                };

                automatizacion.condicion = {
                    dispositivo_id: auto.trigger.sensor.dispositivo._id.toString(),
                    dispositivo_tipo: auto.trigger.sensor.dispositivo.tipo,
                    valor: condicion.valor,
                    operador: operadorMap[operador] || operador
                };

                // Mapear acciones
                if (auto.acciones && auto.acciones.length > 0) {
                    const primeraAccion = auto.acciones[0];
                    let comando = primeraAccion.accion === 'encender' ? 'ON' : 'OFF';
                    automatizacion.accion = {
                        dispositivo_id: primeraAccion.dispositivo._id ?
                                        primeraAccion.dispositivo._id.toString() :
                                        primeraAccion.dispositivo.toString(),
                        comando: comando
                    };
                }
            } else if (auto.trigger.tipo === 'horario') {
                // Automatización basada en horario
                automatizacion.tipo = 'horario';
                automatizacion.horario = {
                    hora: auto.trigger.horario.hora || '00:00',
                    dias: auto.trigger.horario.dias || []
                };

                // Mapear acciones
                if (auto.acciones && auto.acciones.length > 0) {
                    const primeraAccion = auto.acciones[0];
                    let comando = primeraAccion.accion === 'encender' ? 'ON' : 'OFF';
                    automatizacion.accion = {
                        dispositivo_id: primeraAccion.dispositivo._id ?
                                        primeraAccion.dispositivo._id.toString() :
                                        primeraAccion.dispositivo.toString(),
                        comando: comando
                    };
                }
            }

            return automatizacion;
        }).filter(auto => auto.condicion || auto.tipo === 'horario'); // Solo incluir automatizaciones válidas

        // Construir respuesta en el formato requerido
        const response = {
            id: room._id.toString(),
            nombre: room.nombre,
            ip: room.ip || '',
            dispositivos: dispositivosMapeados,
            automatizaciones: automatizacionesMapeadas
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error en getESPConfig:', error);
        next(error);
    }
};

// @desc    Recibe los datos de los sensores de un ESP32
// @route   POST /api/esp/report-data/:habitacionId
// @access  Público
const reportSensorData = async (req, res, next) => {
  const { habitacionId } = req.params;
  const datosSensores = req.body; 

  console.log(`\n--- NUEVO REPORTE de [${habitacionId}] ---`);
  console.log(`Datos RECIBIDOS:`, datosSensores);
  
  try {
    
    // --- INICIO DE: GUARDAR DATOS EN LA BD ---
    console.log(`[Paso 1] Buscando dispositivos en la BD para la habitación...`);
    const devicesInRoom = await Device.find({ habitacion: habitacionId }).select('_id tipo').lean();
    if (devicesInRoom.length === 0) {
        console.error(`[ERROR] No se encontró ningún dispositivo en la BD para la habitacionId: ${habitacionId}`);
        return res.status(404).json({ status: 'Habitación sin dispositivos' });
    }
    console.log(`[Paso 1] Encontrados ${devicesInRoom.length} dispositivos. (Tipos en BD: ${devicesInRoom.map(d => d.tipo).join(', ')})`);
    const datosParaGuardar = [];
    console.log(`[Paso 2] Mapeando datos recibidos...`);
    for (const [key, valor] of Object.entries(datosSensores)) {
        let tipoSensorBuscado;
        if (key === 'temp') tipoSensorBuscado = 'temperatura';
        else if (key === 'hum') tipoSensorBuscado = 'humedad';
        else if (key === 'ldr') tipoSensorBuscado = 'luz';
        else if (key === 'pir') tipoSensorBuscado = 'movimiento';
        else if (key === 'mq2') tipoSensorBuscado = 'otro';
        else tipoSensorBuscado = key;
        const device = devicesInRoom.find(d => d.tipo === tipoSensorBuscado);
        if (device) {
            console.log(`    > ¡ÉXITO! Encontrado dispositivo en BD (ID: ${device._id})`);
            datosParaGuardar.push({
                dispositivo: device._id,
                tipo: tipoSensorBuscado, 
                valor: valor.toString(), 
                unidad: (key === 'temp') ? '°C' : (key === 'hum') ? '%' : '',
            });
        } else {
            console.warn(`    > ¡FALLO! No se encontró ningún dispositivo en la BD con tipo: '${tipoSensorBuscado}'`);
        }
    }
    if (datosParaGuardar.length > 0) {
        console.log(`[Paso 3] Guardando ${datosParaGuardar.length} registros en devices_data...`);
        await DeviceData.insertMany(datosParaGuardar);
        console.log(`[Paso 3] ¡Éxito! Datos guardados.`);
    } else {
        console.warn("[Paso 3] No hay datos para guardar. El mapeo (Paso 2) falló.");
    }
    // --- FIN DE: GUARDAR DATOS EN LA BD ---


    // --- 2. ACTIVACIÓN DEL MOTOR DE REGLAS ---
    console.log(`[Paso 4] Ejecutando motor de reglas...`);
    await checkAndTriggerAutomations(habitacionId, datosSensores); 
    
    res.status(200).json({ status: 'recibido' });

  } catch (error) {
    console.error('Error FATAL en reportSensorData:', error);
    next(error);
  }
};


// --- INICIO DE FUNCIONES DEL MOTOR DE REGLAS ---
// (Estas funciones ahora están activas)

async function checkAndTriggerAutomations(habitacionId, datosSensores) {
  
  const devicesInRoom = await Device.find({ habitacion: habitacionId }).select('_id tipo').lean();
  const deviceIds = devicesInRoom.map(d => d._id);

  const automatizaciones = await Automatize.find({
    'activa': true,
    'trigger.tipo': 'sensor',
    'trigger.sensor.dispositivo': { $in: deviceIds }
  }).populate('acciones.dispositivo', 'habitacion') 
    .lean();
    
  if (automatizaciones.length > 0) {
    console.log(`[MotorReglas] Encontradas ${automatizaciones.length} reglas para ${habitacionId}`);
  }

  for (const regla of automatizaciones) {
    const sensorId = regla.trigger.sensor.dispositivo.toString();
    const sensorInfo = devicesInRoom.find(d => d._id.toString() === sensorId);
    if (!sensorInfo) continue; 
    
    const sensorTipo = sensorInfo.tipo;
    let valorSensor;
    
    if (sensorTipo === 'temperatura') valorSensor = datosSensores['temp'];
    else if (sensorTipo === 'humedad') valorSensor = datosSensores['hum'];
    else valorSensor = datosSensores[sensorTipo];

    if (valorSensor === undefined) continue; 

    const valorRegla = regla.trigger.sensor.condicion.valor;
    const operador = regla.trigger.sensor.condicion.operador; 

    let condicionCumplida = false;
    if (operador === 'mayor') condicionCumplida = valorSensor > valorRegla;
    else if (operador === 'menor') condicionCumplida = valorSensor < valorRegla;
    else if (operador === 'igual') condicionCumplida = valorSensor == valorRegla;
    else if (operador === 'mayor_igual') condicionCumplida = valorSensor >= valorRegla;
    else if (operador === 'menor_igual') condicionCumplida = valorSensor <= valorRegla;
    else if (operador === 'diferente') condicionCumplida = valorSensor != valorRegla;

    console.log(`[MotorReglas] Evaluando: ${sensorTipo} (${valorSensor}) ${operador} ${valorRegla} = ${condicionCumplida}`);

    if (condicionCumplida) {
      console.log("[MotorReglas] ¡CONDICIÓN CUMPLIDA!");
      for (const accion of regla.acciones) {
        const habitacionActuador = await Room.findById(accion.dispositivo.habitacion).select('ip').lean();
        if (!habitacionActuador || !habitacionActuador.ip) {
          console.error(`[MotorReglas] No se encontró IP para la habitación del actuador ${accion.dispositivo._id}`);
          continue;
        }
        const ip = habitacionActuador.ip;
        const dispositivoId = accion.dispositivo._id.toString();
        const comando = (accion.accion === 'encender') ? 'on' : 'off';
        
        await enviarComandoESP(ip, dispositivoId, comando);
      }
    }
  }
}

// --- FUNCIÓN DE AYUDA PARA ENVIAR COMANDOS ---
async function enviarComandoESP(ip, dispositivoId, comando) {
  const url = `http://${ip}/control?dispositivo=${dispositivoId}&comando=${comando}`;

  try {
    console.log(`[MotorReglas] Enviando comando a: ${url}`);
    const response = await fetch(url);
    if (response.ok) {
      console.log(`[MotorReglas] Comando [${comando}] para [${dispositivoId}] enviado con éxito.`);
      // const estado = comando === 'on' ? 'Encendido' : 'Apagado';
      // await Device.findByIdAndUpdate(dispositivoId, { 'estado.encendido': comando === 'on', 'estado.valor': estado });
    } else {
      console.warn(`[MotorReglas] El ESP32 en ${ip} respondió con un error.`);
    }
  } catch (err) {
    console.error(`[MotorReglas] Error al intentar contactar al ESP32 en ${ip}.`, err.message);
  }
}
// --- FIN DE FUNCIONES DEL MOTOR DE REGLAS ---


// --- EXPORTACIÓN FINAL ---
module.exports = {
  getESPConfig,
  reportSensorData
};