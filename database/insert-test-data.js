const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Room = require('./models/Room');
const Device = require('./models/Device');
const DeviceData = require('./models/DeviceData');

async function insertTestData() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // 1. Buscar o crear usuario de prueba
        let user = await User.findOne({ email: 'prueba@hotmail.com' });

        if (!user) {
            console.log('📝 Creando usuario de prueba...');
            user = await User.create({
                nombre: 'Usuario Prueba',
                email: 'prueba@hotmail.com',
                password: 'Password123'
            });
            console.log('✅ Usuario creado:', user.email);
        } else {
            console.log('✅ Usuario encontrado:', user.email);
        }

        // 2. Crear habitación de prueba si no existe
        let room = await Room.findOne({ usuario: user._id, nombre: 'Sala de Pruebas' });

        if (!room) {
            console.log('📝 Creando habitación de prueba...');
            room = await Room.create({
                nombre: 'Sala de Pruebas',
                icono: 'living-room',
                ip: '192.168.1.100',
                usuario: user._id
            });
            console.log('✅ Habitación creada:', room.nombre);
        } else {
            console.log('✅ Habitación encontrada:', room.nombre);
        }

        // 3. Crear dispositivos sensores si no existen
        const sensorTypes = [
            { tipo: 'temperatura', nombre: 'Sensor de Temperatura', pin: 4 },
            { tipo: 'humedad', nombre: 'Sensor de Humedad', pin: 5 },
            { tipo: 'gas', nombre: 'Sensor de Gas', pin: 6 },
            { tipo: 'actuador', nombre: 'Foco LED', pin: 7, subtipo: 'luz' }
        ];

        const devices = [];
        for (const sensorType of sensorTypes) {
            let device = await Device.findOne({
                usuario: user._id,
                habitacion: room._id,
                tipo: sensorType.tipo,
                nombre: sensorType.nombre
            });

            if (!device) {
                console.log(`📝 Creando dispositivo: ${sensorType.nombre}...`);
                device = await Device.create({
                    nombre: sensorType.nombre,
                    tipo: sensorType.tipo,
                    subtipo: sensorType.subtipo || null,
                    habitacion: room._id,
                    usuario: user._id,
                    pin: sensorType.pin,
                    estado: { encendido: false, valor: 0 }
                });
                console.log(`✅ Dispositivo creado: ${device.nombre}`);
            } else {
                console.log(`✅ Dispositivo encontrado: ${device.nombre}`);
            }
            devices.push(device);
        }

        // 4. Generar datos históricos para los últimos 30 días
        console.log('\n📊 Generando datos históricos...');

        const now = new Date();
        const dataToInsert = [];

        for (const device of devices) {
            console.log(`\n📈 Generando datos para: ${device.nombre} (${device.tipo})`);

            // Generar datos cada hora durante los últimos 30 días
            for (let day = 30; day >= 0; day--) {
                for (let hour = 0; hour < 24; hour++) {
                    const timestamp = new Date(now);
                    timestamp.setDate(timestamp.getDate() - day);
                    timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

                    let valor;

                    if (device.tipo === 'temperatura') {
                        // Temperatura: 18-30°C con variación diaria
                        const baseTemp = 24;
                        const dailyVariation = Math.sin(hour / 24 * Math.PI * 2) * 4;
                        const randomNoise = (Math.random() - 0.5) * 2;
                        valor = (baseTemp + dailyVariation + randomNoise).toFixed(1);
                    } else if (device.tipo === 'humedad') {
                        // Humedad: 40-80%
                        const baseHumidity = 60;
                        const dailyVariation = Math.cos(hour / 24 * Math.PI * 2) * 10;
                        const randomNoise = (Math.random() - 0.5) * 5;
                        valor = Math.max(40, Math.min(80, baseHumidity + dailyVariation + randomNoise)).toFixed(1);
                    } else if (device.tipo === 'gas') {
                        // Gas: 200-1000 ppm (normalmente bajo, ocasionalmente alto)
                        const isSpike = Math.random() < 0.05; // 5% de picos
                        valor = isSpike ? (800 + Math.random() * 200).toFixed(0) : (200 + Math.random() * 200).toFixed(0);
                    } else if (device.tipo === 'actuador' && device.subtipo === 'luz') {
                        // Foco: ON/OFF con patrón realista (encendido en la noche)
                        const isNight = hour >= 18 || hour <= 6;
                        const isOn = isNight && Math.random() > 0.3;
                        valor = isOn ? 'ON' : 'OFF';
                    } else {
                        valor = Math.random() * 100;
                    }

                    // Determinar el tipo correcto para DeviceData
                    let tipoData;
                    if (device.tipo === 'temperatura') tipoData = 'temperatura';
                    else if (device.tipo === 'humedad') tipoData = 'humedad';
                    else if (device.tipo === 'gas') tipoData = 'gas';
                    else if (device.tipo === 'actuador') tipoData = 'estado';
                    else tipoData = 'estado';

                    dataToInsert.push({
                        dispositivo: device._id,
                        tipo: tipoData,
                        valor: valor,
                        timestamp: timestamp,
                        metadata: {
                            origen: 'Script de prueba',
                            simulado: true
                        }
                    });
                }
            }

            console.log(`  ✅ ${(31 * 24)} registros preparados`);
        }

        // 5. Eliminar datos antiguos de prueba
        console.log('\n🗑️  Eliminando datos de prueba antiguos...');
        const deleteResult = await DeviceData.deleteMany({
            dispositivo: { $in: devices.map(d => d._id) },
            'metadata.simulado': true
        });
        console.log(`  ✅ ${deleteResult.deletedCount} registros antiguos eliminados`);

        // 6. Insertar todos los datos nuevos
        console.log('\n💾 Insertando nuevos datos...');
        const insertResult = await DeviceData.insertMany(dataToInsert);
        console.log(`  ✅ ${insertResult.length} registros insertados exitosamente`);

        // 7. Resumen
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE DATOS INSERTADOS:');
        console.log('='.repeat(50));
        console.log(`👤 Usuario: ${user.email}`);
        console.log(`🏠 Habitación: ${room.nombre}`);
        console.log(`📱 Dispositivos: ${devices.length}`);
        devices.forEach(d => {
            const count = dataToInsert.filter(data => data.dispositivo.equals(d._id)).length;
            console.log(`   - ${d.nombre} (${d.tipo}): ${count} registros`);
        });
        console.log(`📈 Total de registros: ${insertResult.length}`);
        console.log('='.repeat(50));
        console.log('✅ ¡Datos de prueba insertados correctamente!');
        console.log('\n🔑 Credenciales:');
        console.log('   Email: prueba@hotmail.com');
        console.log('   Password: Password123');
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
insertTestData();
