// Middleware para manejo centralizado de errores

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Error de Mongoose - Validación
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors
        });
    }

    // Error de Mongoose - Duplicado (email, etc.)
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        let message = `El ${field} ya está registrado`;

        // Mensaje personalizado para email
        if (field === 'email') {
            message = 'El correo electrónico ya está registrado. Por favor inicia sesión o usa otro correo.';
        }

        // Mensaje personalizado para googleId
        if (field === 'googleId') {
            message = 'Este correo ya está registrado con Google. Por favor inicia sesión con Google.';
        }

        return res.status(409).json({
            success: false,
            message: message
        });
    }

    // Error de Mongoose - Cast (ID inválido)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'ID inválido'
        });
    }

    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expirado'
        });
    }

    // Error genérico del servidor
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
