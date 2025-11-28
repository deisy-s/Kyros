const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Room = require('./models/Room');
const Device = require('./models/Device');
const DeviceData = require('./models/DeviceData');

async function cleanAndRegeneratePIR() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar usuario y habitación
        const user = await User.findOne({ email: 'prueba@hotmail.com' });
        const room = await Room.findOne({ usuario: user._id, nombre: 'Sala de Pruebas' });
        const pir = await Device.findOne({
            usuario: user._id,
            habitacion: room._id,
            nombre: 'Sensor PIR'
        });

        console.log(`📱 Dispositivo: ${pir.nombre} (ID: ${pir._id})\n`);

        // ELIMINAR TODOS los datos del PIR (sin filtro de metadata)
        console.log('🗑️  Eliminando TODOS los datos antiguos del PIR...');
        const deleteResult = await DeviceData.deleteMany({
            dispositivo: pir._id
        });
        console.log(`  ✅ ${deleteResult.deletedCount} registros eliminados\n`);

        // Generar nuevos datos con patrón realista
        console.log('📊 Generando datos con patrón realista...\n');

        const now = new Date();
        const dataToInsert = [];
        let currentState = 'OFF';

        for (let day = 30; day >= 0; day--) {
            for (let hour = 0; hour < 24; hour++) {
                const timestamp = new Date(now);
                timestamp.setDate(timestamp.getDate() - day);
                timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

                const isMorningRush = hour >= 7 && hour <= 9;
                const isEveningRush = hour >= 18 && hour <= 22;
                const isNightTime = hour >= 23 || hour <= 5;

                if (isNightTime) {
                    currentState = 'OFF';
                } else if (isMorningRush || isEveningRush) {
                    if (currentState === 'OFF' && Math.random() > 0.3) {
                        currentState = 'ON';
                    }
                    if (currentState === 'ON' && Math.random() > 0.2) {
                        currentState = 'ON';
                    } else if (currentState === 'ON') {
                        currentState = 'OFF';
                    }
                } else {
                    if (currentState === 'ON' && Math.random() > 0.6) {
                        currentState = 'OFF';
                    } else if (currentState === 'OFF' && Math.random() > 0.9) {
                        currentState = 'ON';
                    }
                }

                dataToInsert.push({
                    dispositivo: pir._id,
                    tipo: 'movimiento',
                    valor: currentState,
                    timestamp: timestamp,
                    metadata: {
                        origen: 'Script de prueba (regenerado)',
                        simulado: true
                    }
                });
            }
        }

        const onCount = dataToInsert.filter(d => d.valor === 'ON').length;
        const offCount = dataToInsert.filter(d => d.valor === 'OFF').length;

        console.log(`  📈 ${dataToInsert.length} registros preparados`);
        console.log(`  ✅ ON: ${onCount} | ❌ OFF: ${offCount}`);
        console.log(`  📊 Ratio: ${((onCount / dataToInsert.length) * 100).toFixed(1)}% activo\n`);

        // Insertar
        console.log('💾 Insertando...');
        await DeviceData.insertMany(dataToInsert);
        console.log('  ✅ Completado\n');

        console.log('='.repeat(50));
        console.log('✅ PIR REGENERADO EXITOSAMENTE');
        console.log('='.repeat(50));
        console.log('Recarga la página del PIR para ver los nuevos datos');
        console.log('Deberías ver períodos largos consolidados ahora');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

cleanAndRegeneratePIR();
