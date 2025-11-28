const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Room = require('./models/Room');
const Device = require('./models/Device');
const DeviceData = require('./models/DeviceData');

async function addMissingDevices() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar usuario de prueba
        const user = await User.findOne({ email: 'prueba@hotmail.com' });
        if (!user) {
            console.error('❌ Usuario de prueba no encontrado');
            process.exit(1);
        }

        // Buscar habitación
        const room = await Room.findOne({ usuario: user._id, nombre: 'Sala de Pruebas' });
        if (!room) {
            console.error('❌ Habitación no encontrada');
            process.exit(1);
        }

        console.log('✅ Usuario y habitación encontrados');

        // Dispositivos adicionales a crear
        const newDevices = [
            {
                tipo: 'actuador',
                subtipo: 'ventilador',
                nombre: 'Ventilador de Techo',
                pin: 8,
                dataType: 'estado' // Para generar ON/OFF
            },
            {
                tipo: 'movimiento',
                nombre: 'Sensor PIR',
                pin: 9,
                dataType: 'movimiento' // Para generar eventos
            }
        ];

        const createdDevices = [];

        for (const deviceConfig of newDevices) {
            // Verificar si ya existe
            let device = await Device.findOne({
                usuario: user._id,
                habitacion: room._id,
                tipo: deviceConfig.tipo,
                nombre: deviceConfig.nombre
            });

            if (!device) {
                console.log(`📝 Creando dispositivo: ${deviceConfig.nombre}...`);
                device = await Device.create({
                    nombre: deviceConfig.nombre,
                    tipo: deviceConfig.tipo,
                    subtipo: deviceConfig.subtipo || null,
                    habitacion: room._id,
                    usuario: user._id,
                    pin: deviceConfig.pin,
                    estado: { encendido: false, valor: 0 }
                });
                console.log(`✅ Dispositivo creado: ${device.nombre}`);
            } else {
                console.log(`✅ Dispositivo ya existe: ${device.nombre}`);
            }

            createdDevices.push({
                device,
                dataType: deviceConfig.dataType
            });
        }

        // Generar datos históricos
        console.log('\n📊 Generando datos históricos...\n');

        const now = new Date();
        const dataToInsert = [];

        for (const { device, dataType } of createdDevices) {
            console.log(`📈 Generando datos para: ${device.nombre} (${device.tipo})`);

            // Generar datos cada hora durante los últimos 30 días
            for (let day = 30; day >= 0; day--) {
                for (let hour = 0; hour < 24; hour++) {
                    const timestamp = new Date(now);
                    timestamp.setDate(timestamp.getDate() - day);
                    timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

                    let valor;
                    let tipo;

                    if (dataType === 'estado') {
                        // Ventilador: ON/OFF con patrón realista (encendido en horas calurosas)
                        const isHotHour = (hour >= 12 && hour <= 18); // Mediodía a tarde
                        const isOn = isHotHour && Math.random() > 0.4;
                        valor = isOn ? 'ON' : 'OFF';
                        tipo = 'estado';
                    } else if (dataType === 'movimiento') {
                        // Sensor PIR: detecta movimiento ocasionalmente
                        const isActiveHour = (hour >= 6 && hour <= 23); // Horario activo
                        const detectedMovement = isActiveHour && Math.random() > 0.7;
                        valor = detectedMovement ? 'ON' : 'OFF';
                        tipo = 'movimiento';
                    }

                    dataToInsert.push({
                        dispositivo: device._id,
                        tipo: tipo,
                        valor: valor,
                        timestamp: timestamp,
                        metadata: {
                            origen: 'Script de prueba (dispositivos adicionales)',
                            simulado: true
                        }
                    });
                }
            }

            console.log(`  ✅ ${(31 * 24)} registros preparados`);
        }

        // Eliminar datos antiguos de prueba para estos dispositivos
        console.log('\n🗑️  Eliminando datos antiguos de estos dispositivos...');
        const deviceIds = createdDevices.map(d => d.device._id);
        const deleteResult = await DeviceData.deleteMany({
            dispositivo: { $in: deviceIds },
            'metadata.simulado': true
        });
        console.log(`  ✅ ${deleteResult.deletedCount} registros antiguos eliminados`);

        // Insertar nuevos datos
        console.log('\n💾 Insertando nuevos datos...');
        const insertResult = await DeviceData.insertMany(dataToInsert);
        console.log(`  ✅ ${insertResult.length} registros insertados exitosamente`);

        // Resumen
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE DISPOSITIVOS ADICIONALES:');
        console.log('='.repeat(50));
        console.log(`👤 Usuario: ${user.email}`);
        console.log(`🏠 Habitación: ${room.nombre}`);
        console.log(`📱 Nuevos dispositivos: ${createdDevices.length}`);
        createdDevices.forEach(({ device }) => {
            const count = dataToInsert.filter(data => data.dispositivo.equals(device._id)).length;
            const subtipoStr = device.subtipo ? ` (subtipo: ${device.subtipo})` : '';
            console.log(`   - ${device.nombre} (${device.tipo}${subtipoStr}): ${count} registros`);
        });
        console.log(`📈 Total de registros nuevos: ${insertResult.length}`);
        console.log('='.repeat(50));
        console.log('✅ ¡Dispositivos adicionales creados!');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

// Ejecutar
addMissingDevices();
