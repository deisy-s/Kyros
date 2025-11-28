const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Room = require('./models/Room');
const Device = require('./models/Device');
const DeviceData = require('./models/DeviceData');

async function regeneratePIRData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar usuario y habitación
        const user = await User.findOne({ email: 'prueba@hotmail.com' });
        if (!user) {
            console.error('❌ Usuario de prueba no encontrado');
            process.exit(1);
        }

        const room = await Room.findOne({ usuario: user._id, nombre: 'Sala de Pruebas' });
        if (!room) {
            console.error('❌ Habitación no encontrada');
            process.exit(1);
        }

        // Buscar el sensor PIR
        const pir = await Device.findOne({
            usuario: user._id,
            habitacion: room._id,
            nombre: 'Sensor PIR'
        });

        if (!pir) {
            console.error('❌ Sensor PIR no encontrado');
            process.exit(1);
        }

        console.log(`📱 Dispositivo encontrado: ${pir.nombre} (ID: ${pir._id})\n`);

        // Eliminar datos antiguos del PIR
        console.log('🗑️  Eliminando datos antiguos del PIR...');
        const deleteResult = await DeviceData.deleteMany({
            dispositivo: pir._id,
            'metadata.simulado': true
        });
        console.log(`  ✅ ${deleteResult.deletedCount} registros antiguos eliminados\n`);

        // Generar nuevos datos con patrón realista
        console.log('📊 Generando nuevos datos con patrón realista...\n');

        const now = new Date();
        const dataToInsert = [];

        // Patrón realista: períodos largos sin movimiento, ocasionales ráfagas de actividad
        let currentState = 'OFF'; // Empezar sin movimiento
        let stateChangeHour = 0; // Hora del próximo cambio

        for (let day = 30; day >= 0; day--) {
            for (let hour = 0; hour < 24; hour++) {
                const timestamp = new Date(now);
                timestamp.setDate(timestamp.getDate() - day);
                timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

                // Definir períodos de actividad típicos
                const isMorningRush = hour >= 7 && hour <= 9;    // Mañana activa
                const isEveningRush = hour >= 18 && hour <= 22;  // Tarde/noche activa
                const isNightTime = hour >= 23 || hour <= 5;     // Noche sin actividad

                // Decidir si cambiar de estado
                if (isNightTime) {
                    // Durante la noche, siempre OFF
                    currentState = 'OFF';
                } else if (isMorningRush || isEveningRush) {
                    // En horas de actividad, cambiar a ON si no lo está
                    if (currentState === 'OFF' && Math.random() > 0.3) {
                        currentState = 'ON';
                    }
                    // Permanecer ON durante el período activo
                    if (currentState === 'ON' && Math.random() > 0.2) {
                        currentState = 'ON'; // Mantener
                    } else if (currentState === 'ON') {
                        currentState = 'OFF'; // Ocasionalmente terminar
                    }
                } else {
                    // Horas tranquilas (10-17): mayormente OFF
                    if (currentState === 'ON' && Math.random() > 0.6) {
                        currentState = 'OFF'; // Terminar movimiento
                    } else if (currentState === 'OFF' && Math.random() > 0.9) {
                        currentState = 'ON'; // Ocasionalmente detectar movimiento
                    }
                }

                dataToInsert.push({
                    dispositivo: pir._id,
                    tipo: 'movimiento',
                    valor: currentState,
                    timestamp: timestamp,
                    metadata: {
                        origen: 'Script de prueba (regenerado)',
                        simulado: true,
                        patron: isNightTime ? 'noche' : (isMorningRush || isEveningRush ? 'activo' : 'tranquilo')
                    }
                });
            }
        }

        console.log(`  📈 ${dataToInsert.length} registros preparados`);

        // Contar eventos ON vs OFF
        const onCount = dataToInsert.filter(d => d.valor === 'ON').length;
        const offCount = dataToInsert.filter(d => d.valor === 'OFF').length;
        console.log(`  ✅ Eventos ON: ${onCount}`);
        console.log(`  ❌ Eventos OFF: ${offCount}`);
        console.log(`  📊 Ratio ON/OFF: ${(onCount / offCount).toFixed(2)}\n`);

        // Insertar nuevos datos
        console.log('💾 Insertando nuevos datos...');
        const insertResult = await DeviceData.insertMany(dataToInsert);
        console.log(`  ✅ ${insertResult.length} registros insertados exitosamente\n`);

        // Resumen
        console.log('='.repeat(50));
        console.log('✅ DATOS DEL PIR REGENERADOS EXITOSAMENTE');
        console.log('='.repeat(50));
        console.log(`📱 Dispositivo: ${pir.nombre}`);
        console.log(`📈 Total de registros: ${insertResult.length}`);
        console.log(`⏱️  Rango: Últimos 31 días (1 registro/hora)`);
        console.log(`🎯 Patrón: Realista (períodos largos sin movimiento + ráfagas)`);
        console.log('='.repeat(50));

        // Mostrar ejemplo de los últimos 10 eventos
        console.log('\n📋 Últimos 10 registros de ejemplo:');
        console.log('─'.repeat(60));
        const last10 = dataToInsert.slice(-10);
        last10.forEach((record, idx) => {
            const fecha = new Date(record.timestamp).toLocaleString('es-MX', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const emoji = record.valor === 'ON' ? '‼️' : '  ';
            console.log(`${emoji} ${idx + 1}. ${record.valor.padEnd(4)} - ${fecha} (${record.metadata.patron})`);
        });
        console.log('─'.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

regeneratePIRData();
