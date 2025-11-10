const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Automatize = require('../models/Automatize');
const Device = require('../models/Device');
const Room = require('../models/Room');

const createTestAutomation = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME || 'kyros'
        });
        console.log('✅ Conectado a MongoDB\n');

        // Buscar la habitación Prueba2 y su dispositivo actuador
        const room = await Room.findOne({ nombre: 'Prueba2' });
        if (!room) {
            console.log('❌ No se encontró la habitación Prueba2');
            process.exit(1);
        }

        const actuador = await Device.findOne({
            habitacion: room._id,
            tipo: 'actuador'
        });

        if (!actuador) {
            console.log('❌ No se encontró el dispositivo actuador');
            process.exit(1);
        }

        // Buscar sensor de temperatura (si existe)
        const sensorTemp = await Device.findOne({
            tipo: 'temperatura'
        });

        console.log(`📋 Dispositivos encontrados:`);
        console.log(`   🌀 Actuador: ${actuador.nombre} (Pin ${actuador.pin})`);
        if (sensorTemp) {
            console.log(`   🌡️ Sensor: ${sensorTemp.nombre} (Pin ${sensorTemp.pin || 'N/A'})`);
        }

        // Crear automatización basada en horario para el actuador
        const automationHorario = new Automatize({
            nombre: 'Encender Abanico a las 14:00',
            descripcion: 'Encender abanico automáticamente todos los días a las 2 PM',
            usuario: room.usuario,
            activa: true,
            trigger: {
                tipo: 'horario',
                horario: {
                    dias: [0, 1, 2, 3, 4, 5, 6], // Todos los días
                    hora: '14:00'
                }
            },
            acciones: [{
                dispositivo: actuador._id,
                accion: 'encender',
                parametros: {},
                orden: 0
            }]
        });

        await automationHorario.save();
        console.log(`\n✅ Automatización creada: ${automationHorario.nombre}`);

        // Si hay sensor de temperatura, crear automatización basada en sensor
        if (sensorTemp) {
            const automationSensor = new Automatize({
                nombre: 'Abanico automático por temperatura',
                descripcion: 'Encender abanico cuando temperatura supera 30°C',
                usuario: room.usuario,
                activa: true,
                trigger: {
                    tipo: 'sensor',
                    sensor: {
                        dispositivo: sensorTemp._id,
                        tipoSensor: 'temperatura',
                        condicion: {
                            operador: 'mayor',
                            valor: 30
                        }
                    }
                },
                acciones: [{
                    dispositivo: actuador._id,
                    accion: 'encender',
                    parametros: {},
                    orden: 0
                }]
            });

            await automationSensor.save();
            console.log(`✅ Automatización creada: ${automationSensor.nombre}`);
        }

        console.log(`\n🔗 Prueba el endpoint ahora:`);
        console.log(`   http://localhost:3000/api/esp-config/${room._id}\n`);

        await mongoose.connection.close();
        console.log('✅ Conexión cerrada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createTestAutomation();
