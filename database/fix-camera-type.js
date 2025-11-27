const mongoose = require('mongoose');
require('dotenv').config();

async function fixCameraType() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const db = mongoose.connection.db;

        // Actualizar tipo a mjpeg
        const result = await db.collection('cameras').updateOne(
            { nombre: 'V' },
            { $set: { 'streaming.tipo': 'mjpeg' } }
        );

        console.log('✅ Tipo actualizado a MJPEG');
        console.log(`   Documentos modificados: ${result.modifiedCount}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixCameraType();
