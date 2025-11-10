require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Room = require('../models/Room');

const migrateRoomsIP = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME || 'kyros'
        });
        console.log('✅ Conectado a MongoDB\n');

        console.log('🔍 Buscando habitaciones con prefijo "IP: " en el campo ip...');

        // Buscar todas las habitaciones
        const rooms = await Room.find({});

        let updatedCount = 0;

        for (const room of rooms) {
            // Si el campo ip tiene el prefijo "IP: ", limpiarlo
            if (room.ip && room.ip.startsWith('IP: ')) {
                const cleanIP = room.ip.replace('IP: ', '').trim();
                room.ip = cleanIP;
                await room.save();
                console.log(`✅ Habitación "${room.nombre}": "${room.ip}" → "${cleanIP}"`);
                updatedCount++;
            }
        }

        console.log(`\n📊 Resumen:`);
        console.log(`   Total de habitaciones: ${rooms.length}`);
        console.log(`   Habitaciones actualizadas: ${updatedCount}`);
        console.log(`   Habitaciones sin cambios: ${rooms.length - updatedCount}`);

        console.log('\n✅ Migración completada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
};

// Ejecutar migración
migrateRoomsIP();
