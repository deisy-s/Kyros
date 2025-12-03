// Script para generar datos de prueba para sensores
// Ejecutar con: node generate-test-data.js <deviceId>
// Ejemplo: node generate-test-data.js 67418f5e9b2c3d001a4e5f6a

require('dotenv').config({ path: './database/.env' });
const mongoose = require('mongoose');

async function generateTestData() {
    try {
        const deviceId = process.argv[2];

        if (!deviceId) {
            console.log('❌ Uso: node generate-test-data.js <deviceId>');
            console.log('💡 Ejecuta primero: node test-data-query.js para ver los IDs de dispositivos');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const Device = require('../models/Device');
        const DeviceData = require('../models/DeviceData');

        // Verificar que el dispositivo existe
        const device = await Device.findById(deviceId);
        if (!device) {
            console.log(`❌ Dispositivo ${deviceId} no encontrado`);
            process.exit(1);
        }

        console.log(`\n📱 Generando datos para: ${device.nombre} (${device.tipo})`);

        const now = new Date();
        const testData = [];

        // Generar datos según el tipo
        if (device.tipo === 'temperatura') {
            console.log('🌡️ Generando datos de temperatura (últimos 30 días)...');
            for (let i = 0; i < 720; i++) { // 30 días * 24 horas
                const timestamp = new Date(now - i * 60 * 60 * 1000); // Cada hora
                const temperatura = 20 + Math.sin(i / 6) * 5 + Math.random() * 2; // Variación senoidal

                testData.push({
                    dispositivo: deviceId,
                    tipo: 'temperatura',
                    valor: temperatura.toFixed(1),
                    unidad: '°C',
                    timestamp,
                    metadata: { origen: 'Test Data Generator' }
                });
            }
        }
        else if (device.tipo === 'humedad') {
            console.log('💧 Generando datos de humedad (últimos 30 días)...');
            for (let i = 0; i < 720; i++) {
                const timestamp = new Date(now - i * 60 * 60 * 1000);
                const humedad = 50 + Math.sin(i / 8) * 20 + Math.random() * 5;

                testData.push({
                    dispositivo: deviceId,
                    tipo: 'humedad',
                    valor: humedad.toFixed(1),
                    unidad: '%',
                    timestamp,
                    metadata: { origen: 'Test Data Generator' }
                });
            }
        }
        else if (device.tipo === 'gas') {
            console.log('💨 Generando datos de gas (últimos 7 días)...');
            for (let i = 0; i < 168; i++) { // 7 días * 24 horas
                const timestamp = new Date(now - i * 60 * 60 * 1000);
                const gas = 50 + Math.random() * 100;

                testData.push({
                    dispositivo: deviceId,
                    tipo: 'gas',
                    valor: gas.toFixed(0),
                    unidad: 'ppm',
                    timestamp,
                    metadata: { origen: 'Test Data Generator' }
                });
            }
        }
        else if (device.tipo === 'movimiento') {
            console.log('👁️ Generando eventos de movimiento (últimos 7 días)...');
            for (let i = 0; i < 50; i++) { // 50 eventos aleatorios
                const timestamp = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000);
                const detectado = Math.random() > 0.3;

                testData.push({
                    dispositivo: deviceId,
                    tipo: 'movimiento',
                    valor: detectado ? '1' : '0',
                    timestamp,
                    metadata: { origen: 'Test Data Generator' }
                });
            }
        }
        else if (device.tipo === 'luz' || device.tipo === 'actuador' || device.tipo === 'ventilador' || device.tipo === 'foco') {
            console.log('💡 Generando datos de uso (últimos 30 días)...');
            for (let i = 0; i < 200; i++) { // 200 eventos de encendido/apagado
                const timestamp = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
                const estado = Math.random() > 0.5 ? 'ON' : 'OFF';

                testData.push({
                    dispositivo: deviceId,
                    tipo: 'estado',
                    valor: estado,
                    timestamp,
                    metadata: { origen: 'Test Data Generator' }
                });
            }
        }
        else {
            console.log(`⚠️ Tipo "${device.tipo}" no soportado por el generador`);
            process.exit(1);
        }

        // Insertar en la BD
        console.log(`\n💾 Insertando ${testData.length} registros...`);
        await DeviceData.insertMany(testData);

        console.log('✅ Datos de prueba generados exitosamente!');
        console.log(`\n🔗 Abre: http://localhost:3000/deviceinfo.html?deviceId=${deviceId}&devicename=${device.nombre}&roomId=${device.habitacion}&roomname=Test`);

        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

generateTestData();
