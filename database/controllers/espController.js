const Room = require('../models/Room');
const Device = require('../models/Device');
const Automatize = require('../models/Automatize');
const DeviceData = require('../models/DeviceData');
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

        // 1. Primero esperamos a que todas las promesas se resuelvan y obtenemos el array crudo
        const automatizacionesRaw = await Promise.all(automatizaciones.map(async (auto) => {
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
        }));

        // 2. AHORA SÍ filtramos el array ya resuelto
        // Esto evita el error "Promise.all(...).filter is not a function"
        const automatizacionesMapeadas = automatizacionesRaw.filter(auto => auto.condicion || (auto.tipo === 'horario' && auto.horario));

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
            console.log(`[Reglas] ¡HORARIO CUMPLIDO! ${regla.trigger.horario.hora}`);

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
      console.log(`[Reglas] ¡SENSOR CUMPLIDO! ${sensorTipo}: ${valorActual} ${operador} ${valorRegla}`);
      
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
    // Nota: Como los ESP32 ahora son CLIENTES HTTPS a Render, no escuchan HTTP directo.
    // Esta función solo sirve si el ESP32 está en la misma red local o tiene IP pública.
    // Si están en redes distintas, necesitarás WebSockets o polling.
    // Por ahora lo dejamos como está para no romper la lógica existente.
    const url = `http://${ip}/control?dispositivo=${dispositivoId}&comando=${comando}&duration=${duracion}`;
    try {
        const response = await fetch(url);
        if (response.ok) console.log(`[Comando] ${comando} -> ${dispositivoId} (Duración: ${duracion}s)`);
        else console.warn(`[Comando] Error del ESP: ${response.status}`);
    } catch (err) {
        console.error(`[Comando] Error conectando a ${ip}`);
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
            // await pushConfigToRoom(roomId); // Comentado si no tienes implementada esta función importada
        }
    } catch (error) {
        console.error('[Push] Error notificando:', error);
    }
};

module.exports = {
    getESPConfig,
    reportSensorData,
    notifyESP32ConfigUpdate
};