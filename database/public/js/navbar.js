// Script para manejar el navbar dinámicamente
function updateNavbar() {
    const loginButton = document.querySelector('.login-button');

    if (isAuthenticated()) {
        // Usuario autenticado - mostrar botón de cerrar sesión
        loginButton.textContent = 'Cerrar sesión';
        loginButton.href = '#';
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            removeToken();
            window.location.href = 'login.html';
        });
    } else {
        // Usuario no autenticado - mostrar botón de iniciar sesión
        loginButton.textContent = 'Iniciar sesión';
        loginButton.href = 'login.html';
    }
}

// Ejecutar cuando se carga el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavbar);
} else {
    updateNavbar();
}
