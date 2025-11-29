const mongoose = require('mongoose');
require('dotenv').config();

const DeviceData = require('./models/DeviceData');

async function testGasAggregation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const deviceId = '691fa51994f63882343bf777'; // Sensor MQ2

        // Simular la agregación que hace el backend
        const now = new Date();
        let startDate = new Date();
        startDate.setDate(now.getDate() - 30); // Últimos 30 días

        console.log('🧪 PROBANDO AGREGACIÓN (30 días):');
        console.log('='.repeat(60));
        console.log(`Desde: ${startDate.toLocaleString('es-MX')}`);
        console.log(`Hasta: ${now.toLocaleString('es-MX')}`);
        console.log('');

        const groupFormat = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
        };

        const pipeline = [
            {
                $match: {
                    dispositivo: new mongoose.Types.ObjectId(deviceId),
                    timestamp: { $gte: startDate, $lte: now },
                    tipo: { $ne: 'estado' } // Excluir registros de estado
                }
            },
            {
                $group: {
                    _id: groupFormat,
                    avgValue: { $avg: { $toDouble: '$valor' } },
                    minValue: { $min: { $toDouble: '$valor' } },
                    maxValue: { $max: { $toDouble: '$valor' } },
                    count: { $sum: 1 },
                    firstTimestamp: { $first: '$timestamp' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            },
            {
                $project: {
                    _id: 0,
                    period: '$_id',
                    timestamp: '$firstTimestamp',
                    valor: { $round: ['$avgValue', 2] },
                    avg: { $round: ['$avgValue', 2] },
                    min: { $round: ['$minValue', 2] },
                    max: { $round: ['$maxValue', 2] },
                    count: 1
                }
            }
        ];

        console.log('📊 Ejecutando pipeline de agregación...\n');

        const result = await DeviceData.aggregate(pipeline);

        console.log(`✅ Agregación exitosa!`);
        console.log(`📈 Puntos de datos: ${result.length}`);
        console.log('');

        if (result.length > 0) {
            console.log('📋 Primeros 5 puntos agregados:');
            console.log('-'.repeat(60));
            result.slice(0, 5).forEach((point, idx) => {
                console.log(`${idx + 1}. ${new Date(point.timestamp).toLocaleDateString('es-MX')}`);
                console.log(`   Promedio: ${point.avg} | Min: ${point.min} | Max: ${point.max}`);
                console.log(`   Registros: ${point.count}`);
            });

            console.log('');
            console.log('📋 Últimos 5 puntos agregados:');
            console.log('-'.repeat(60));
            result.slice(-5).forEach((point, idx) => {
                console.log(`${idx + 1}. ${new Date(point.timestamp).toLocaleDateString('es-MX')}`);
                console.log(`   Promedio: ${point.avg} | Min: ${point.min} | Max: ${point.max}`);
                console.log(`   Registros: ${point.count}`);
            });
        } else {
            console.log('❌ No se obtuvieron puntos agregados');
        }

        // Verificar si hay datos en el rango
        console.log('\n' + '='.repeat(60));
        console.log('🔍 VERIFICACIÓN DE DATOS EN EL RANGO:');
        console.log('='.repeat(60));

        const totalInRange = await DeviceData.countDocuments({
            dispositivo: new mongoose.Types.ObjectId(deviceId),
            timestamp: { $gte: startDate, $lte: now }
        });

        console.log(`Total de registros en rango: ${totalInRange}`);

        if (totalInRange === 0) {
            console.log('\n⚠️  No hay registros en el rango de 30 días');
            console.log('Verificando fecha del primer y último registro...\n');

            const firstRecord = await DeviceData.findOne({ dispositivo: new mongoose.Types.ObjectId(deviceId) })
                .sort({ timestamp: 1 });
            const lastRecord = await DeviceData.findOne({ dispositivo: new mongoose.Types.ObjectId(deviceId) })
                .sort({ timestamp: -1 });

            if (firstRecord && lastRecord) {
                console.log(`Primer registro: ${firstRecord.timestamp.toLocaleString('es-MX')}`);
                console.log(`Último registro: ${lastRecord.timestamp.toLocaleString('es-MX')}`);
            }
        }

    } catch (error) {
        console.error('❌ Error en agregación:', error);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

testGasAggregation();
