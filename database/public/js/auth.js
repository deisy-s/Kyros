// Utilidades para manejo de autenticación JWT
const API_URL = 'http://localhost:3000/api';

// Guardar token en localStorage
function saveToken(token) {
    localStorage.setItem('token', token);
}

// Obtener token del localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Eliminar token (logout)
function removeToken() {
    localStorage.removeItem('token');
}

// Verificar si el usuario está autenticado
function isAuthenticated() {
    return getToken() !== null;
}

// Hacer petición con token
async function fetchWithAuth(url, options = {}) {
    const token = getToken();

    if (!options.headers) {
        options.headers = {};
    }

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    options.headers['Content-Type'] = 'application/json';

    const response = await fetch(url, options);

    // Si el token es inválido, redirigir al login
    if (response.status === 401) {
        removeToken();
        window.location.href = 'login.html';
    }

    return response;
}

// Proteger páginas (requiere autenticación)
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Obtener datos del usuario actual
async function getCurrentUser() {
    try {
        const response = await fetchWithAuth(`${API_URL}/auth/me`);
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
    }
}
