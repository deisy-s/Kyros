// Script para ver los usuarios en la base de datos
const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Contar usuarios totales
        const totalUsers = await usersCollection.countDocuments();
        console.log(`📊 Total de usuarios: ${totalUsers}\n`);

        // Ver usuarios con authProvider
        const users = await usersCollection.find({}, {
            projection: {
                nombre: 1,
                email: 1,
                googleId: 1,
                authProvider: 1
            }
        }).toArray();

        console.log('👥 Lista de usuarios:');
        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.nombre || 'Sin nombre'}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Provider: ${user.authProvider || 'N/A'}`);
            console.log(`   GoogleId: ${user.googleId || 'null'}`);
        });

        // Contar por tipo
        const googleUsers = await usersCollection.countDocuments({ authProvider: 'google' });
        const localUsers = await usersCollection.countDocuments({ authProvider: 'local' });
        const nullProvider = await usersCollection.countDocuments({ authProvider: null });

        console.log('\n\n📈 Resumen:');
        console.log(`   Usuarios con Google: ${googleUsers}`);
        console.log(`   Usuarios locales: ${localUsers}`);
        console.log(`   Usuarios sin provider: ${nullProvider}`);

        // Verificar índice
        console.log('\n\n🔍 Verificando índice googleId:');
        const indexes = await usersCollection.indexes();
        const googleIdIndex = indexes.find(idx => idx.name === 'googleId_1');
        if (googleIdIndex) {
            console.log(`   ✅ Índice existe`);
            console.log(`   Sparse: ${googleIdIndex.sparse ? 'Sí' : 'No'}`);
            console.log(`   Unique: ${googleIdIndex.unique ? 'Sí' : 'No'}`);
        } else {
            console.log(`   ❌ Índice no encontrado`);
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUsers();
