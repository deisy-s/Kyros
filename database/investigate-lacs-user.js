const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Device = require('./models/Device');
const DeviceData = require('./models/DeviceData');

async function investigateLacsUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar usuario
        const user = await User.findOne({ email: 'lacscastro1612@gmail.com' });

        if (!user) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        console.log('👤 Usuario encontrado:', user.nombre);
        console.log('📧 Email:', user.email);
        console.log('🆔 ID:', user._id);

        // Buscar dispositivos
        const devices = await Device.find({ usuario: user._id });
        console.log(`\n📱 Total dispositivos: ${devices.length}\n`);

        // Buscar sensores de luz específicamente
        const sensorLuz = devices.filter(d => d.tipo === 'luz');

        console.log('='.repeat(70));
        console.log('💡 SENSORES DE LUZ (PROBLEMA REPORTADO):');
        console.log('='.repeat(70));

        for (const sensor of sensorLuz) {
            console.log(`\n📍 Sensor: ${sensor.nombre} (ID: ${sensor._id})`);

            // Analizar datos de este sensor
            const totalRecords = await DeviceData.countDocuments({ dispositivo: sensor._id });
            console.log(`   Total registros: ${totalRecords}`);

            // Últimos 10 registros
            const last10 = await DeviceData.find({ dispositivo: sensor._id })
                .sort({ timestamp: -1 })
                .limit(10);

            console.log('\n   Últimos 10 registros:');
            last10.forEach((r, idx) => {
                console.log(`   ${idx + 1}. ${r.timestamp.toLocaleString('es-MX')} | tipo: "${r.tipo}" | valor: "${r.valor}"`);
            });

            // Probar agregación 24h
            console.log('\n   🧪 PRUEBA AGREGACIÓN 24H:');
            const now = new Date();
            const startDate24h = new Date();
            startDate24h.setHours(now.getHours() - 24);

            console.log(`   Rango: ${startDate24h.toLocaleString('es-MX')} -> ${now.toLocaleString('es-MX')}`);

            const count24h = await DeviceData.countDocuments({
                dispositivo: sensor._id,
                timestamp: { $gte: startDate24h, $lte: now }
            });

            console.log(`   Registros en últimas 24h: ${count24h}`);

            if (count24h > 0) {
                // Intentar consolidación
                const events24h = await DeviceData.find({
                    dispositivo: sensor._id,
                    timestamp: { $gte: startDate24h, $lte: now }
                }).sort({ timestamp: 1 }).lean();

                console.log(`   Consolidando ${events24h.length} eventos...`);

                // Contar cambios de estado
                let changes = 0;
                let lastState = null;
                events24h.forEach(e => {
                    const valStr = String(e.valor).toUpperCase();
                    const state = (valStr === 'ON' || valStr === '1' || valStr === 'ENCENDIDO') ? 'ON' : 'OFF';
                    if (lastState !== null && lastState !== state) {
                        changes++;
                    }
                    lastState = state;
                });

                console.log(`   Cambios de estado: ${changes}`);

                // Mostrar primeros 5 eventos
                console.log('\n   Primeros 5 eventos en 24h:');
                events24h.slice(0, 5).forEach((e, idx) => {
                    console.log(`   ${idx + 1}. ${new Date(e.timestamp).toLocaleString('es-MX')} | "${e.valor}"`);
                });
            } else {
                console.log('   ⚠️  NO HAY DATOS en las últimas 24 horas');

                // Verificar cuándo fue el último registro
                const lastRecord = await DeviceData.findOne({ dispositivo: sensor._id })
                    .sort({ timestamp: -1 });

                if (lastRecord) {
                    const horasDiff = (now - lastRecord.timestamp) / (1000 * 60 * 60);
                    console.log(`   Último registro hace: ${horasDiff.toFixed(1)} horas`);
                }
            }
        }

        // Probar TODOS los sensores para ver cuáles tienen datos en 24h
        console.log('\n' + '='.repeat(70));
        console.log('🔍 ANÁLISIS 24H DE TODOS LOS DISPOSITIVOS:');
        console.log('='.repeat(70));

        const now = new Date();
        const startDate24h = new Date();
        startDate24h.setHours(now.getHours() - 24);

        for (const device of devices) {
            const count24h = await DeviceData.countDocuments({
                dispositivo: device._id,
                timestamp: { $gte: startDate24h, $lte: now }
            });

            const icon = count24h > 0 ? '✅' : '❌';
            console.log(`${icon} ${device.nombre.padEnd(20)} (${device.tipo.padEnd(12)}) -> ${count24h} registros en 24h`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

investigateLacsUser();
