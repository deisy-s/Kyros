const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// Generar token
const token = jwt.sign(
    {id: '68fd3f1931fed2e2246ddde0'},
    'tu_secreto_super_seguro_cambialo_en_produccion',
    {expiresIn: '1h'}
);

// Hacer request
fetch('http://localhost:3000/api/automatize/6927763b5b6334826ae454ff', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(res => res.json())
.then(data => {
    console.log('=== RESPUESTA DEL API ===');
    console.log(JSON.stringify(data, null, 2));

    if (data.success && data.data.acciones && data.data.acciones[0]) {
        console.log('\n=== DISPOSITIVO EN ACCIÓN ===');
        console.log(JSON.stringify(data.data.acciones[0].dispositivo, null, 2));
    }
})
.catch(err => console.error('Error:', err));
