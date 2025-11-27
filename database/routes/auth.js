const express = require('express');
const passport = require('passport');
const {
    register,
    login,
    getMe,
    updateProfile,
    updatePassword
} = require('../controllers/authController');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);

// Rutas de Google OAuth
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login.html',
        session: true
    }),
    async (req, res) => {
        try {
            // Generar JWT para el usuario autenticado
            const token = req.user.getSignedJwtToken();

            // Redirigir al frontend con el token
            res.redirect(`/login.html?token=${token}&success=true`);
        } catch (error) {
            console.error('Error en callback de Google:', error);
            res.redirect('/login.html?error=auth_failed');
        }
    }
);

module.exports = router;
