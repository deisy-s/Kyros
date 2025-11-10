const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Device = require('../models/Device'); // Necesario para populate
const Automatize = require('../models/Automatize');
let Task;
try {
    Task = require('../models/Task');
} catch (e) {
    // Task model no existe
}

const listAutomatizations = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME || 'kyros'
        });
        console.log('✅ Conectado a MongoDB\n');

        // Buscar todas las automatizaciones
        const automatizations = await Automatize.find({})
            .populate('acciones.dispositivo', 'nombre tipo')
            .sort('-createdAt');

        console.log(`📋 Automatizaciones encontradas: ${automatizations.length}\n`);

        automatizations.forEach((auto, index) => {
            console.log(`${index + 1}. ${auto.nombre}`);
            console.log(`   ID: ${auto._id}`);
            console.log(`   Activa: ${auto.activa ? '✅' : '❌'}`);
            console.log(`   Trigger: ${auto.trigger.tipo}`);
            if (auto.trigger.horario) {
                console.log(`   Horario: ${auto.trigger.horario.hora || 'N/A'}`);
            }
            if (auto.acciones && auto.acciones.length > 0) {
                console.log(`   Acciones:`);
                auto.acciones.forEach(accion => {
                    const dispositivo = accion.dispositivo?.nombre || 'Dispositivo desconocido';
                    console.log(`      - ${accion.accion} ${dispositivo}`);
                });
            }
            console.log('');
        });

        // Verificar si hay tareas en la colección tasks (legacy)
        try {
            const tasks = await Task.find({}).sort('-createdAt');
            if (tasks.length > 0) {
                console.log(`\n⚠️  ADVERTENCIA: Hay ${tasks.length} tareas en la colección "tasks" (legacy):`);
                tasks.forEach((task, index) => {
                    console.log(`   ${index + 1}. ${task.nombre || 'Sin nombre'} (ID: ${task._id})`);
                });
                console.log('\n   Estas deberían migrar a la colección "automatize"');
            }
        } catch (error) {
            console.log('\n📝 Nota: La colección "tasks" no existe (esto es correcto)');
        }

        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

listAutomatizations();
