// Script para arreglar el índice de googleId
const mongoose = require('mongoose');
require('dotenv').config();

async function fixGoogleIdIndex() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Ver índices actuales
        const indexes = await usersCollection.indexes();
        console.log('\n📋 Índices actuales:');
        indexes.forEach(idx => {
            console.log(`   - ${idx.name}:`, JSON.stringify(idx.key));
        });

        // Eliminar el índice problemático
        console.log('\n🗑️  Eliminando índice googleId_1...');
        try {
            await usersCollection.dropIndex('googleId_1');
            console.log('✅ Índice eliminado');
        } catch (err) {
            if (err.code === 27) {
                console.log('⚠️  El índice no existe (ya fue eliminado)');
            } else {
                throw err;
            }
        }

        // Crear índice correcto (unique + sparse)
        console.log('\n📝 Creando índice correcto...');
        await usersCollection.createIndex(
            { googleId: 1 },
            { unique: true, sparse: true, name: 'googleId_1' }
        );
        console.log('✅ Índice creado correctamente (unique + sparse)');

        // Verificar
        const newIndexes = await usersCollection.indexes();
        console.log('\n📋 Índices después del fix:');
        newIndexes.forEach(idx => {
            console.log(`   - ${idx.name}:`, JSON.stringify(idx.key), idx.sparse ? '(sparse)' : '');
        });

        console.log('\n✅ ¡Arreglado! Ahora puedes registrar múltiples usuarios con el formulario normal.');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixGoogleIdIndex();
