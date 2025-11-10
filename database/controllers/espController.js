const Room = require('../models/Room');
const Device = require('../models/Device');
const Automatize = require('../models/Automatize');

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
        .populate('trigger.sensor.dispositivo', '_id nombre')
        .populate('acciones.dispositivo', '_id nombre')
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
                    valor: condicion.valor,
                    operador: operadorMap[operador] || operador
                };

                // Mapear acciones
                if (auto.acciones && auto.acciones.length > 0) {
                    const primeraAccion = auto.acciones[0];
                    let comando = primeraAccion.accion === 'encender' ? 'ON' :
                                 primeraAccion.accion === 'apagar' ? 'OFF' :
                                 primeraAccion.accion.toUpperCase();

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
                    let comando = primeraAccion.accion === 'encender' ? 'ON' :
                                 primeraAccion.accion === 'apagar' ? 'OFF' :
                                 primeraAccion.accion.toUpperCase();

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
