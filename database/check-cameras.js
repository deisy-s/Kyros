// Script para verificar cámaras en la BD
const mongoose = require('mongoose');
require('dotenv').config();

async function checkCameras() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;
        const camerasCollection = db.collection('cameras');

        const totalCameras = await camerasCollection.countDocuments();
        console.log(`📊 Total de cámaras: ${totalCameras}\n`);

        const cameras = await camerasCollection.find({}).toArray();

        console.log('📹 Lista de cámaras:');
        cameras.forEach((cam, index) => {
            console.log(`\n${index + 1}. ${cam.nombre}`);
            console.log(`   Usuario: ${cam.usuario || 'NO TIENE USUARIO ❌'}`);
            console.log(`   Habitación: ${cam.habitacion}`);
            console.log(`   Conectada: ${cam.estado?.conectada}`);
        });

        // Contar cámaras sin usuario
        const sinUsuario = await camerasCollection.countDocuments({ usuario: { $exists: false } });
        const usuarioNull = await camerasCollection.countDocuments({ usuario: null });

        console.log('\n\n⚠️  Problemas detectados:');
        console.log(`   Cámaras sin campo usuario: ${sinUsuario}`);
        console.log(`   Cámaras con usuario = null: ${usuarioNull}`);

        if (sinUsuario > 0 || usuarioNull > 0) {
            console.log('\n❌ HAY CÁMARAS SIN USUARIO - Por eso aparecen globales');
        } else {
            console.log('\n✅ Todas las cámaras tienen usuario asignado');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkCameras();
