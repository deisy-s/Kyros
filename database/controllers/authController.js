const Usuario = require('../models/User');

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { nombre, email, password, tipo } = req.body;

        console.log('[REGISTER] Intento de registro:', { nombre, email });

        // Validar campos requeridos
        if (!nombre || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporcione nombre, email y contraseña'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await Usuario.findOne({ email });
        console.log('[REGISTER] Usuario existente?', existingUser ? 'Sí' : 'No');

        if (existingUser) {
            // Verificar si está registrado con Google
            console.log('[REGISTER] AuthProvider:', existingUser.authProvider);
            if (existingUser.authProvider === 'google') {
                return res.status(409).json({
                    success: false,
                    message: 'Este correo ya está registrado con Google. Por favor inicia sesión con Google.'
                });
            }
            return res.status(409).json({
                success: false,
                message: 'El correo electrónico ya está registrado'
            });
        }

        // Crear usuario
        console.log('[REGISTER] Creando nuevo usuario...');
        const usuario = await Usuario.create({
            nombre,
            email,
            password,
            tipo: tipo || 'estudiante'
        });
        console.log('[REGISTER] Usuario creado exitosamente:', usuario._id);

        // Generar token
        const token = usuario.getSignedJwtToken();

        res.status(201).json({
            success: true,
            message: 'Registro exitoso',
            token,
            user: usuario.getPublicProfile()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validar campos
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporcione email y contraseña'
            });
        }

        // Buscar usuario con password
        const usuario = await Usuario.findOne({ email }).select('+password');

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const isMatch = await usuario.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar estado del usuario
        if (usuario.estado !== 'activo') {
            return res.status(403).json({
                success: false,
                message: 'Usuario inactivo o suspendido. Contacte al administrador.'
            });
        }

        // Generar token
        const token = usuario.getSignedJwtToken();

        res.status(200).json({
            success: true,
            message: 'Login exitoso',
            token,
            user: usuario.getPublicProfile()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: usuario.getPublicProfile()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar perfil de usuario
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res, next) => {
    try {
        const fieldsToUpdate = {
            nombre: req.body.nombre,
            email: req.body.email,
            estudiante: req.body.estudiante
        };

        // Remover campos undefined
        Object.keys(fieldsToUpdate).forEach(key =>
            fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
        );

        const usuario = await Usuario.findByIdAndUpdate(
            req.user.id,
            fieldsToUpdate,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: usuario.getPublicProfile()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cambiar contraseña
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Por favor proporcione la contraseña actual y la nueva'
            });
        }

        const usuario = await Usuario.findById(req.user.id).select('+password');

        // Verificar contraseña actual
        const isMatch = await usuario.matchPassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        // Actualizar contraseña
        usuario.password = newPassword;
        await usuario.save();

        // Generar nuevo token
        const token = usuario.getSignedJwtToken();

        res.status(200).json({
            success: true,
            message: 'Contraseña actualizada exitosamente',
            token
        });
    } catch (error) {
        next(error);
    }
};
