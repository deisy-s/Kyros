const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Buscar si ya existe un usuario con este googleId
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // Usuario ya existe, retornarlo
                return done(null, user);
            }

            // Verificar si existe un usuario con el mismo email
            const existingEmailUser = await User.findOne({
                email: profile.emails[0].value
            });

            if (existingEmailUser) {
                // Si el usuario existe con email pero no tiene googleId,
                // vincular la cuenta de Google
                existingEmailUser.googleId = profile.id;
                existingEmailUser.authProvider = 'google';
                await existingEmailUser.save();
                return done(null, existingEmailUser);
            }

            // Crear nuevo usuario con Google
            user = await User.create({
                nombre: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                authProvider: 'google',
                tipo: 'estudiante',
                estado: 'activo'
                // No se requiere password para usuarios de Google
            });

            done(null, user);
        } catch (error) {
            console.error('Error en Google OAuth:', error);
            done(error, null);
        }
    }));

    // Serializar usuario para la sesión
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserializar usuario desde la sesión
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};
