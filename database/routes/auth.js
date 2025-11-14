const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const {
    register,
    login,
    getMe,
    updateProfile,
    updatePassword
} = require('../controllers/authController');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Rutas de autenticación local
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);

// ========== RUTAS DE GOOGLE OAUTH ==========

// Ruta para iniciar autenticación con Google
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

// Ruta callback después de autenticación con Google
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login.html?error=google_auth_failed'
    }),
    (req, res) => {
        try {
            // Autenticación exitosa, generar JWT token
            const token = jwt.sign(
                { id: req.user._id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE }
            );

            // Redirigir al frontend con el token
            res.redirect(`/login.html?token=${token}&googleAuth=success`);
        } catch (error) {
            console.error('Error generando token JWT:', error);
            res.redirect('/login.html?error=token_generation_failed');
        }
    }
);

module.exports = router;
