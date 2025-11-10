const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Device = require('../models/Device');
const Automatize = require('../models/Automatize');

const testESPEndpoint = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME || 'kyros'
        });
        console.log('✅ Conectado a MongoDB\n');

        // Obtener todas las habitaciones
        const rooms = await Room.find({}).select('_id nombre ip');

        if (rooms.length === 0) {
            console.log('❌ No hay habitaciones en la base de datos');
            process.exit(1);
        }

        console.log(`📋 Encontradas ${rooms.length} habitación(es):\n`);

        for (const room of rooms) {
            console.log(`🏠 Habitación: ${room.nombre}`);
            console.log(`   ID: ${room._id}`);
            console.log(`   IP: ${room.ip || 'Sin IP configurada'}`);

            // Obtener dispositivos de esta habitación
            const devices = await Device.find({ habitacion: room._id })
                .select('nombre tipo pin estado');

            console.log(`   Dispositivos: ${devices.length}`);
            devices.forEach(device => {
                console.log(`      - ${device.nombre} (${device.tipo}) - Pin: ${device.pin || 'N/A'}`);
            });

            // Obtener automatizaciones
            const deviceIds = devices.map(d => d._id);
            const automatizaciones = await Automatize.find({
                activa: true,
                $or: [
                    { 'trigger.sensor.dispositivo': { $in: deviceIds } },
                    { 'acciones.dispositivo': { $in: deviceIds } }
                ]
            }).select('nombre activa');

            console.log(`   Automatizaciones activas: ${automatizaciones.length}`);

            console.log(`\n   🔗 URL de prueba:`);
            console.log(`   http://localhost:3000/api/esp-config/${room._id}\n`);
            console.log('─'.repeat(60));
        }

        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

testESPEndpoint();
