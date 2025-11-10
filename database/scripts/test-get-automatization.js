const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Device = require('../models/Device'); // Necesario para populate
const Automatize = require('../models/Automatize');

const testGetAutomatization = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME || 'kyros'
        });
        console.log('✅ Conectado a MongoDB\n');

        // ID de la tarea "Refrescar"
        const taskId = '690e2d7199de9dcf6b72e17f';

        const automatization = await Automatize.findById(taskId)
            .populate('trigger.sensor.dispositivo', 'nombre tipo')
            .populate('trigger.dispositivoEstado.dispositivo', 'nombre tipo')
            .populate('acciones.dispositivo', 'nombre tipo habitacion')
            .populate('condiciones.dispositivo', 'nombre tipo');

        if (!automatization) {
            console.log('❌ No se encontró la automatización');
            process.exit(1);
        }

        console.log('📋 Datos de la automatización:\n');
        console.log(JSON.stringify(automatization, null, 2));

        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

testGetAutomatization();
