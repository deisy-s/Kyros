// Script para arreglar el índice de googleId FORZADAMENTE
const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexForce() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Ver índices actuales
        console.log('📋 Índices ANTES:');
        const indexesBefore = await usersCollection.indexes();
        indexesBefore.forEach(idx => {
            console.log(`   ${idx.name}:`, idx.key,
                idx.unique ? '[unique]' : '',
                idx.sparse ? '[sparse]' : ''
            );
        });

        // Eliminar TODOS los índices excepto _id
        console.log('\n🗑️  Eliminando índice googleId_1...');
        try {
            await usersCollection.dropIndex('googleId_1');
            console.log('✅ Índice googleId_1 eliminado');
        } catch (err) {
            console.log('⚠️  No se pudo eliminar:', err.message);
        }

        // Esperar un poco
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Crear índice CORRECTO con sparse
        console.log('\n📝 Creando índice googleId con sparse=true...');
        await usersCollection.createIndex(
            { googleId: 1 },
            {
                unique: true,
                sparse: true,
                name: 'googleId_1',
                background: false
            }
        );
        console.log('✅ Índice creado');

        // Verificar
        console.log('\n📋 Índices DESPUÉS:');
        const indexesAfter = await usersCollection.indexes();
        indexesAfter.forEach(idx => {
            console.log(`   ${idx.name}:`, idx.key,
                idx.unique ? '[unique]' : '',
                idx.sparse ? '[SPARSE]' : '[NO SPARSE]'
            );
        });

        // Verificar que sparse esté en true
        const googleIdIdx = indexesAfter.find(i => i.name === 'googleId_1');
        if (googleIdIdx && googleIdIdx.sparse === true) {
            console.log('\n✅✅✅ ÉXITO! El índice googleId_1 es SPARSE');
        } else {
            console.log('\n❌❌❌ ERROR! El índice NO es sparse');
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixIndexForce();
