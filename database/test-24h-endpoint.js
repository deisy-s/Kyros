const mongoose = require('mongoose');
require('dotenv').config();

const DeviceData = require('./models/DeviceData');

async function test24hEndpoint() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Probar con sensor de luz del usuario lacs
        const deviceId = '6913f367812d3438d49c53c0'; // Ldr

        console.log('🧪 SIMULANDO ENDPOINT: GET /api/devices/:id/data?aggregate=24h');
        console.log('='.repeat(70));

        // Verificar tipo de datos
        const sampleData = await DeviceData.findOne({ dispositivo: new mongoose.Types.ObjectId(deviceId) })
            .sort({ timestamp: -1 });

        console.log(`Dispositivo: ${deviceId}`);
        console.log(`Tipo de dato: ${sampleData.tipo}`);

        const tiposNoNumericos = ['estado', 'movimiento', 'luz'];
        const esNoNumerico = tiposNoNumericos.includes(sampleData.tipo);

        console.log(`Es no numérico: ${esNoNumerico}\n`);

        if (esNoNumerico) {
            // Ruta para eventos (consolidación)
            console.log('📋 RUTA: Consolidación de eventos\n');

            const now = new Date();
            const startDate = new Date();
            startDate.setHours(now.getHours() - 24);

            console.log(`Rango: ${startDate.toLocaleString('es-MX')} -> ${now.toLocaleString('es-MX')}`);

            const allData = await DeviceData.find({
                dispositivo: new mongoose.Types.ObjectId(deviceId),
                timestamp: { $gte: startDate, $lte: now }
            }).sort({ timestamp: 1 }).lean();

            console.log(`Total eventos obtenidos: ${allData.length}`);

            // Consolidar
            const consolidated = [];
            let currentState = null;
            let rangeStart = null;
            let rangeEnd = null;
            let lastMetadata = null;

            allData.forEach((item, index) => {
                const valStr = String(item.valor).toUpperCase();
                const state = (valStr === 'ON' || valStr === 'ENCENDIDO' || valStr === '1' || valStr === 'TRUE' || valStr === 'ACTIVADA') ? 'ON' : 'OFF';

                if (currentState === null) {
                    currentState = state;
                    rangeStart = item.timestamp;
                    rangeEnd = item.timestamp;
                    lastMetadata = item.metadata;
                } else if (state === currentState) {
                    rangeEnd = item.timestamp;
                } else {
                    consolidated.push({
                        timestamp: rangeStart,
                        timestampEnd: rangeEnd,
                        valor: currentState,
                        metadata: lastMetadata
                    });

                    currentState = state;
                    rangeStart = item.timestamp;
                    rangeEnd = item.timestamp;
                    lastMetadata = item.metadata;
                }

                if (index === allData.length - 1) {
                    consolidated.push({
                        timestamp: rangeStart,
                        timestampEnd: rangeEnd,
                        valor: currentState,
                        metadata: lastMetadata
                    });
                }
            });

            consolidated.reverse();

            console.log(`\n✅ Eventos consolidados: ${consolidated.length}`);
            console.log('\nPrimeros 5 rangos consolidados:');
            consolidated.slice(0, 5).forEach((r, idx) => {
                const start = new Date(r.timestamp).toLocaleTimeString('es-MX');
                const end = new Date(r.timestampEnd).toLocaleTimeString('es-MX');
                console.log(`${idx + 1}. ${r.valor} | ${start} - ${end}`);
            });

            console.log('\n📤 RESPUESTA QUE RECIBIRÍA EL FRONTEND:');
            console.log(JSON.stringify({
                success: true,
                aggregation: '24h',
                count: consolidated.length,
                totalEvents: allData.length,
                range: { desde: startDate, hasta: now },
                data: consolidated.slice(0, 3) // Primeros 3
            }, null, 2));

        } else {
            console.log('📊 RUTA: Agregación numérica (no debería llegar aquí para luz)');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

test24hEndpoint();
