const mongoose = require('mongoose');
require('dotenv').config();

const DeviceData = require('./models/DeviceData');

async function findNonNumeric() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const deviceId = '691fa51994f63882343bf777';

        // Buscar todos los valores únicos
        const allValues = await DeviceData.find({
            dispositivo: new mongoose.Types.ObjectId(deviceId)
        }).select('valor tipo timestamp').limit(3600);

        const nonNumeric = [];
        const numeric = [];

        allValues.forEach(record => {
            const val = String(record.valor);
            if (isNaN(parseFloat(val)) || !isFinite(parseFloat(val))) {
                nonNumeric.push(record);
            } else {
                numeric.push(record);
            }
        });

        console.log(`Total registros analizados: ${allValues.length}`);
        console.log(`Numéricos: ${numeric.length}`);
        console.log(`NO numéricos: ${nonNumeric.length}`);

        if (nonNumeric.length > 0) {
            console.log('\n❌ VALORES NO NUMÉRICOS ENCONTRADOS:');
            nonNumeric.slice(0, 10).forEach((r, idx) => {
                console.log(`  ${idx + 1}. "${r.valor}" (tipo: ${r.tipo}) - ${r.timestamp}`);
            });
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findNonNumeric();
