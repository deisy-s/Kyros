const mongoose = require('mongoose');
require('dotenv').config();

const Device = require('./models/Device');
const DeviceData = require('./models/DeviceData');

async function investigateGasData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar el registro específico mencionado
        const specificRecord = await DeviceData.findById('691fb16f94f63882343bfa25');

        console.log('📊 REGISTRO ESPECÍFICO DEL ESP32:');
        console.log('='.repeat(60));
        if (specificRecord) {
            console.log('✅ Registro encontrado:');
            console.log(JSON.stringify(specificRecord, null, 2));
        } else {
            console.log('❌ Registro no encontrado con ese ID');
        }

        console.log('\n' + '='.repeat(60));
        console.log('📱 INFORMACIÓN DEL DISPOSITIVO:');
        console.log('='.repeat(60));

        // Buscar el dispositivo
        const deviceId = '691fa51994f63882343bf777';
        const device = await Device.findById(deviceId);

        if (device) {
            console.log('✅ Dispositivo encontrado:');
            console.log(`   Nombre: ${device.nombre}`);
            console.log(`   Tipo: ${device.tipo}`);
            console.log(`   Subtipo: ${device.subtipo || 'N/A'}`);
            console.log(`   Usuario: ${device.usuario}`);
            console.log(`   Habitación: ${device.habitacion}`);

            // Buscar TODOS los registros de este dispositivo
            console.log('\n' + '='.repeat(60));
            console.log('📈 DATOS DEL DISPOSITIVO:');
            console.log('='.repeat(60));

            const allData = await DeviceData.find({ dispositivo: deviceId })
                .sort({ timestamp: -1 })
                .limit(10);

            console.log(`Total de registros: ${await DeviceData.countDocuments({ dispositivo: deviceId })}`);
            console.log('\nÚltimos 10 registros:');
            console.log('-'.repeat(60));

            allData.forEach((record, idx) => {
                console.log(`\n${idx + 1}. ID: ${record._id}`);
                console.log(`   Timestamp: ${record.timestamp}`);
                console.log(`   Tipo: ${record.tipo}`);
                console.log(`   Valor: ${record.valor}`);
                console.log(`   Unidad: ${record.unidad || 'N/A'}`);
                console.log(`   Metadata: ${JSON.stringify(record.metadata || {})}`);
            });

            // Comparar con datos de prueba
            console.log('\n' + '='.repeat(60));
            console.log('🔍 COMPARACIÓN CON DATOS DE PRUEBA:');
            console.log('='.repeat(60));

            const testData = await DeviceData.findOne({
                'metadata.simulado': true,
                tipo: 'gas'
            });

            if (testData) {
                console.log('\n📋 Registro de prueba (para comparar):');
                console.log(JSON.stringify(testData, null, 2));
            }

            // Verificar si hay diferencias de formato
            console.log('\n' + '='.repeat(60));
            console.log('⚠️  DIFERENCIAS DETECTADAS:');
            console.log('='.repeat(60));

            if (allData.length > 0) {
                const realRecord = allData[0];

                console.log('\nDatos Reales (ESP32):');
                console.log(`   - tipo: "${realRecord.tipo}" (${typeof realRecord.tipo})`);
                console.log(`   - valor: "${realRecord.valor}" (${typeof realRecord.valor})`);
                console.log(`   - unidad: "${realRecord.unidad || ''}" (${typeof realRecord.unidad})`);
                console.log(`   - timestamp: ${realRecord.timestamp} (${typeof realRecord.timestamp})`);
                console.log(`   - metadata: ${realRecord.metadata ? 'Sí tiene' : 'No tiene'}`);

                if (testData) {
                    console.log('\nDatos de Prueba:');
                    console.log(`   - tipo: "${testData.tipo}" (${typeof testData.tipo})`);
                    console.log(`   - valor: "${testData.valor}" (${typeof testData.valor})`);
                    console.log(`   - unidad: "${testData.unidad || ''}" (${typeof testData.unidad})`);
                    console.log(`   - timestamp: ${testData.timestamp} (${typeof testData.timestamp})`);
                    console.log(`   - metadata: ${testData.metadata ? JSON.stringify(testData.metadata) : 'No tiene'}`);
                }

                // Probar la conversión a número
                console.log('\n' + '='.repeat(60));
                console.log('🧪 PRUEBA DE CONVERSIÓN A NÚMERO:');
                console.log('='.repeat(60));

                const valorReal = realRecord.valor;
                const valorPrueba = testData ? testData.valor : null;

                console.log(`\nValor real "${valorReal}" -> Número: ${parseFloat(valorReal)} (válido: ${!isNaN(parseFloat(valorReal))})`);
                if (valorPrueba) {
                    console.log(`Valor prueba "${valorPrueba}" -> Número: ${parseFloat(valorPrueba)} (válido: ${!isNaN(parseFloat(valorPrueba))})`);
                }
            }

        } else {
            console.log('❌ Dispositivo no encontrado');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

investigateGasData();
