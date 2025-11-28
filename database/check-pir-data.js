const mongoose = require('mongoose');
require('dotenv').config();

const Device = require('./models/Device');
const DeviceData = require('./models/DeviceData');

async function checkPIRData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar el sensor PIR
        const pir = await Device.findOne({ nombre: 'Sensor PIR' });
        if (!pir) {
            console.error('❌ Sensor PIR no encontrado');
            process.exit(1);
        }

        console.log('📱 Dispositivo:', pir.nombre);
        console.log('🆔 ID:', pir._id);
        console.log('📌 Tipo:', pir.tipo);
        console.log('');

        // Contar registros totales
        const totalCount = await DeviceData.countDocuments({ dispositivo: pir._id });
        console.log('📊 Total de registros:', totalCount);

        // Obtener rango de fechas
        const oldestData = await DeviceData.findOne({ dispositivo: pir._id }).sort({ timestamp: 1 });
        const newestData = await DeviceData.findOne({ dispositivo: pir._id }).sort({ timestamp: -1 });

        if (oldestData && newestData) {
            console.log('📅 Registro más antiguo:', oldestData.timestamp.toLocaleString('es-MX'));
            console.log('📅 Registro más reciente:', newestData.timestamp.toLocaleString('es-MX'));
            console.log('');

            // Calcular días de diferencia
            const diffMs = newestData.timestamp - oldestData.timestamp;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            console.log('⏱️  Diferencia:', diffDays, 'días');
        }

        // Contar eventos ON vs OFF
        const onCount = await DeviceData.countDocuments({
            dispositivo: pir._id,
            valor: 'ON'
        });
        const offCount = await DeviceData.countDocuments({
            dispositivo: pir._id,
            valor: 'OFF'
        });

        console.log('');
        console.log('✅ Eventos ON (movimiento detectado):', onCount);
        console.log('❌ Eventos OFF (sin movimiento):', offCount);

        // Contar registros en las últimas 24 horas
        const now = new Date();
        const last24h = new Date(now);
        last24h.setHours(now.getHours() - 24);

        const count24h = await DeviceData.countDocuments({
            dispositivo: pir._id,
            timestamp: { $gte: last24h }
        });

        console.log('');
        console.log('⏰ Últimas 24 horas:', count24h, 'registros');

        // Contar registros en los últimos 30 días
        const last30d = new Date(now);
        last30d.setDate(now.getDate() - 30);

        const count30d = await DeviceData.countDocuments({
            dispositivo: pir._id,
            timestamp: { $gte: last30d }
        });

        console.log('📆 Últimos 30 días:', count30d, 'registros');

        // Mostrar últimos 10 registros
        console.log('');
        console.log('📋 Últimos 10 registros:');
        console.log('─'.repeat(60));

        const last10 = await DeviceData.find({ dispositivo: pir._id })
            .sort({ timestamp: -1 })
            .limit(10);

        last10.forEach((record, idx) => {
            const fecha = record.timestamp.toLocaleString('es-MX');
            const emoji = record.valor === 'ON' ? '‼️' : '  ';
            console.log(`${emoji} ${idx + 1}. ${record.valor.padEnd(4)} - ${fecha}`);
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

checkPIRData();
