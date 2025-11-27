// Test: Intentar crear 2 usuarios con googleId: null
const mongoose = require('mongoose');
require('dotenv').config();

async function testInsert() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Intentar insertar 2 usuarios con googleId: null
        console.log('🧪 Intentando insertar usuario 1 con googleId: null...');
        const user1 = await usersCollection.insertOne({
            nombre: 'Test User 1',
            email: 'testinsert1@test.com',
            password: '$2a$10$abcdefghijklmnopqrstuv', // Hash fake
            googleId: null,
            authProvider: 'local',
            tipo: 'estudiante',
            estado: 'activo',
            fechaRegistro: new Date()
        });
        console.log('✅ Usuario 1 insertado:', user1.insertedId);

        console.log('\n🧪 Intentando insertar usuario 2 con googleId: null...');
        const user2 = await usersCollection.insertOne({
            nombre: 'Test User 2',
            email: 'testinsert2@test.com',
            password: '$2a$10$abcdefghijklmnopqrstuv',
            googleId: null,
            authProvider: 'local',
            tipo: 'estudiante',
            estado: 'activo',
            fechaRegistro: new Date()
        });
        console.log('✅ Usuario 2 insertado:', user2.insertedId);

        console.log('\n✅✅✅ ÉXITO! El índice sparse funciona correctamente');
        console.log('Se pudieron insertar 2 usuarios con googleId: null');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\n🔍 Esto significa que el índice NO es sparse correctamente');
        process.exit(1);
    }
}

testInsert();
