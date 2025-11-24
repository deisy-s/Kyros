// Script para verificar datos en MongoDB
// Ejecutar con: node test-data-query.js

require('dotenv').config({ path: './database/.env' });
const mongoose = require('mongoose');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Obtener todas las colecciones
        const Device = require('./database/models/Device');
        const DeviceData = require('./database/models/DeviceData');

        // Listar dispositivos
        const devices = await Device.find().select('nombre tipo habitacion');
        console.log('\n📱 DISPOSITIVOS EN LA BD:');
        devices.forEach(d => {
            console.log(`  - ${d.nombre} (${d.tipo}) - ID: ${d._id}`);
        });

        // Contar datos por dispositivo
        console.log('\n📊 DATOS HISTÓRICOS POR DISPOSITIVO:');
        for (const device of devices) {
            const count = await DeviceData.countDocuments({ dispositivo: device._id });
            const ultimoDato = await DeviceData.findOne({ dispositivo: device._id }).sort({ timestamp: -1 });

            if (count > 0) {
                console.log(`  ✅ ${device.nombre} (${device.tipo}): ${count} registros`);
                console.log(`     Último dato: ${ultimoDato.timestamp} - Valor: ${ultimoDato.valor}`);
            } else {
                console.log(`  ❌ ${device.nombre} (${device.tipo}): SIN DATOS`);
            }
        }

        // Resumen por tipo de sensor
        console.log('\n📈 RESUMEN POR TIPO:');
        const tipos = ['temperatura', 'humedad', 'gas', 'luz', 'movimiento', 'estado'];
        for (const tipo of tipos) {
            const count = await DeviceData.countDocuments({ tipo });
            console.log(`  ${tipo}: ${count} registros`);
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkData();
