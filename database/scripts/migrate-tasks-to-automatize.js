const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Device = require('../models/Device');
const Automatize = require('../models/Automatize');
const Task = require('../models/Task');

const migrateTasks = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME || 'kyros'
        });
        console.log('✅ Conectado a MongoDB\n');

        // Buscar todas las tareas en la colección tasks
        const tasks = await Task.find({});

        if (tasks.length === 0) {
            console.log('✅ No hay tareas para migrar');
            process.exit(0);
        }

        console.log(`📋 Encontradas ${tasks.length} tarea(s) para migrar\n`);

        let migratedCount = 0;

        for (const task of tasks) {
            console.log(`🔄 Migrando: ${task.nombre}`);

            // Convertir la estructura de task a automatización
            const automatizacion = {
                nombre: task.nombre || 'Tarea sin nombre',
                descripcion: task.descripcion || '',
                usuario: task.usuario,
                activa: task.activa !== undefined ? task.activa : true,
                trigger: {
                    tipo: 'horario',
                    horario: {}
                },
                acciones: []
            };

            // Convertir programación a trigger.horario
            if (task.programacion) {
                if (task.programacion.hora) {
                    automatizacion.trigger.horario.hora = task.programacion.hora;
                }
                if (task.programacion.dias) {
                    automatizacion.trigger.horario.dias = task.programacion.dias;
                } else {
                    // Por defecto, todos los días
                    automatizacion.trigger.horario.dias = [0, 1, 2, 3, 4, 5, 6];
                }
            }

            // Convertir acciones
            if (task.acciones && Array.isArray(task.acciones)) {
                automatizacion.acciones = task.acciones.map(accion => ({
                    dispositivo: accion.dispositivo,
                    accion: accion.accion || 'encender',
                    parametros: accion.parametros || {},
                    retardo: accion.retardo || 0,
                    orden: accion.orden || 0
                }));
            }

            // Crear la automatización
            const newAuto = await Automatize.create(automatizacion);
            console.log(`   ✅ Migrada a automatización: ${newAuto._id}`);

            // Eliminar la tarea antigua
            await Task.deleteOne({ _id: task._id });
            console.log(`   🗑️  Tarea antigua eliminada\n`);

            migratedCount++;
        }

        console.log(`\n✅ Migración completada:`);
        console.log(`   ${migratedCount} tarea(s) migrada(s) a automatizaciones`);

        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
};

migrateTasks();
