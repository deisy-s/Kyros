const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
    // Serializar usuario para sesión
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserializar usuario desde sesión
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    // Estrategia de Google OAuth
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Buscar si el usuario ya existe con este googleId
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // Usuario ya existe
                return done(null, user);
            }

            // Verificar si existe un usuario con el mismo email
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                // Vincular cuenta de Google a cuenta existente
                user.googleId = profile.id;
                user.authProvider = 'google';
                await user.save();
                return done(null, user);
            }

            // Crear nuevo usuario
            const newUser = await User.create({
                googleId: profile.id,
                nombre: profile.displayName,
                email: profile.emails[0].value,
                authProvider: 'google',
                tipo: 'estudiante',
                estado: 'activo'
            });

            return done(null, newUser);
        } catch (error) {
            console.error('Error en Google Strategy:', error);
            return done(error, null);
        }
    }));
};
