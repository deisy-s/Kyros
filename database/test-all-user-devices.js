const mongoose = require('mongoose');
require('dotenv').config();

const Device = require('./models/Device');
const DeviceData = require('./models/DeviceData');

async function testAllUserDevices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Usuario del sensor MQ2
        const userId = '6913f321812d3438d49c53b2';

        // Buscar TODOS los dispositivos del usuario
        const devices = await Device.find({ usuario: userId });

        console.log('='.repeat(70));
        console.log(`📱 DISPOSITIVOS DEL USUARIO (Total: ${devices.length})`);
        console.log('='.repeat(70));

        const results = [];

        for (const device of devices) {
            console.log(`\n🔍 Probando: ${device.nombre} (${device.tipo})`);
            console.log('-'.repeat(70));

            const deviceId = device._id;

            // Contar registros totales
            const totalRecords = await DeviceData.countDocuments({ dispositivo: deviceId });
            console.log(`   📊 Total registros: ${totalRecords}`);

            if (totalRecords === 0) {
                console.log('   ⚠️  Sin datos - OMITIENDO');
                results.push({
                    nombre: device.nombre,
                    tipo: device.tipo,
                    status: 'SIN_DATOS',
                    error: null
                });
                continue;
            }

            // Verificar tipos de datos y valores
            const sampleData = await DeviceData.find({ dispositivo: deviceId }).limit(10);
            const tiposUnicos = [...new Set(sampleData.map(d => d.tipo))];
            console.log(`   🏷️  Tipos de dato: ${tiposUnicos.join(', ')}`);

            // Verificar valores no numéricos
            const nonNumericCount = await DeviceData.countDocuments({
                dispositivo: deviceId,
                tipo: 'estado'
            });

            if (nonNumericCount > 0) {
                console.log(`   ⚠️  Registros de estado (no numéricos): ${nonNumericCount}`);
            }

            // Probar agregación (30 días)
            const now = new Date();
            const startDate = new Date();
            startDate.setDate(now.getDate() - 30);

            const groupFormat = {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' }
            };

            // Detectar si es sensor numérico o de eventos
            const tiposNumericos = ['temperatura', 'humedad', 'gas'];
            const tiposEventos = ['movimiento', 'luz', 'estado'];

            const esNumerico = tiposNumericos.some(t => tiposUnicos.includes(t));
            const esEvento = tiposEventos.some(t => tiposUnicos.includes(t)) || device.tipo === 'actuador';

            let aggregationResult;
            let testPassed = false;
            let errorMsg = null;

            if (esNumerico) {
                // Probar agregación numérica
                try {
                    const pipeline = [
                        {
                            $match: {
                                dispositivo: new mongoose.Types.ObjectId(deviceId),
                                timestamp: { $gte: startDate, $lte: now },
                                tipo: { $ne: 'estado' } // Excluir estados
                            }
                        },
                        {
                            $group: {
                                _id: groupFormat,
                                avgValue: { $avg: { $toDouble: '$valor' } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
                        { $limit: 5 }
                    ];

                    aggregationResult = await DeviceData.aggregate(pipeline);
                    testPassed = true;
                    console.log(`   ✅ Agregación NUMÉRICA: ${aggregationResult.length} puntos`);

                    if (aggregationResult.length > 0) {
                        const sample = aggregationResult[0];
                        console.log(`      Ejemplo: Promedio=${sample.avgValue.toFixed(2)}, Registros=${sample.count}`);
                    }
                } catch (error) {
                    errorMsg = error.message;
                    console.log(`   ❌ Error en agregación: ${error.message.substring(0, 100)}...`);
                }
            } else if (esEvento) {
                // Probar consolidación de eventos
                try {
                    const eventData = await DeviceData.find({
                        dispositivo: deviceId,
                        timestamp: { $gte: startDate, $lte: now }
                    }).sort({ timestamp: 1 }).limit(100).lean();

                    // Consolidar eventos
                    let consolidated = 0;
                    let currentState = null;

                    eventData.forEach(item => {
                        const valStr = String(item.valor).toUpperCase();
                        const state = (valStr === 'ON' || valStr === 'ENCENDIDO' || valStr === '1') ? 'ON' : 'OFF';

                        if (currentState !== state) {
                            consolidated++;
                            currentState = state;
                        }
                    });

                    testPassed = true;
                    console.log(`   ✅ Consolidación EVENTOS: ${consolidated} cambios de estado`);
                } catch (error) {
                    errorMsg = error.message;
                    console.log(`   ❌ Error en consolidación: ${error.message.substring(0, 100)}...`);
                }
            }

            results.push({
                nombre: device.nombre,
                tipo: device.tipo,
                subtipo: device.subtipo || 'N/A',
                totalRecords,
                tiposUnicos,
                nonNumericCount,
                status: testPassed ? 'OK' : 'ERROR',
                error: errorMsg
            });
        }

        // Resumen final
        console.log('\n' + '='.repeat(70));
        console.log('📋 RESUMEN DE PRUEBAS');
        console.log('='.repeat(70));

        const ok = results.filter(r => r.status === 'OK');
        const errors = results.filter(r => r.status === 'ERROR');
        const sinDatos = results.filter(r => r.status === 'SIN_DATOS');

        console.log(`\n✅ Funcionando correctamente: ${ok.length}`);
        ok.forEach(r => {
            console.log(`   - ${r.nombre} (${r.tipo}) - ${r.totalRecords} registros`);
        });

        if (errors.length > 0) {
            console.log(`\n❌ Con errores: ${errors.length}`);
            errors.forEach(r => {
                console.log(`   - ${r.nombre} (${r.tipo})`);
                console.log(`     Error: ${r.error}`);
            });
        }

        if (sinDatos.length > 0) {
            console.log(`\n⚠️  Sin datos: ${sinDatos.length}`);
            sinDatos.forEach(r => {
                console.log(`   - ${r.nombre} (${r.tipo})`);
            });
        }

        console.log('\n' + '='.repeat(70));
        console.log(`Total: ${results.length} dispositivos | OK: ${ok.length} | Errores: ${errors.length} | Sin datos: ${sinDatos.length}`);
        console.log('='.repeat(70));

    } catch (error) {
        console.error('❌ Error general:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

testAllUserDevices();
