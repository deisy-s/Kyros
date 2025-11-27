const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'Por favor ingrese un nombre'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Por favor ingrese un email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Por favor ingrese un email válido'
        ]
    },
    password: {
        type: String,
        required: function() {
            // Solo requerir password si no es usuario de Google
            return this.authProvider === 'local';
        },
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
        select: false, // No devolver password por defecto en queries
        validate: {
            validator: function(password) {
                // Solo validar si es usuario local y la contraseña no está hasheada
                if (this.authProvider !== 'local' || !password) return true;

                // Si ya está hasheada (empieza con $2a$ o $2b$), no validar
                if (password.startsWith('$2a$') || password.startsWith('$2b$')) return true;

                // Validar formato: al menos 1 mayúscula, 1 minúscula, 1 número
                const hasUpperCase = /[A-Z]/.test(password);
                const hasLowerCase = /[a-z]/.test(password);
                const hasNumber = /[0-9]/.test(password);

                return hasUpperCase && hasLowerCase && hasNumber;
            },
            message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
        }
    },
    googleId: {
        type: String,
        sparse: true // Permite múltiples documentos sin googleId
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    tipo: {
        type: String,
        enum: ['estudiante', 'admin'],
        default: 'estudiante'
    },
    fechaRegistro: {
        type: Date,
        default: Date.now
    },
    estado: {
        type: String,
        enum: ['activo', 'inactivo', 'suspendido'],
        default: 'activo'
    },
    assignedBus: {
        type: String,
        default: null
    },
    estudiante: {
        matricula: {
            type: String,
            default: ''
        },
        rutaPreferida: {
            type: String,
            default: ''
        },
        searchHistory: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// Middleware para hashear password antes de guardar
UserSchema.pre('save', async function(next) {
    // Solo hashear si el password fue modificado y existe
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    // Generar salt y hashear
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar passwords
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Método para generar JWT
UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Método para obtener datos públicos del usuario
UserSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        nombre: this.nombre,
        email: this.email,
        tipo: this.tipo,
        estado: this.estado,
        assignedBus: this.assignedBus,
        estudiante: this.estudiante,
        fechaRegistro: this.fechaRegistro
    };
};

module.exports = mongoose.model('Usuario', UserSchema, 'users');
