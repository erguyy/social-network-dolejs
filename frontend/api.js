const API = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('login.html');
}

// Přesměrování nepřihlášených uživatelů
function requireAuth() {
    const current = window.location.pathname.split('/').pop();
    if (!getToken() && current !== 'login.html') {
        window.location.replace('login.html');
    }
}

// Přesměrování přihlášených z login/register
function requireGuest() {
    const current = window.location.pathname.split('/').pop();
    if (getToken() && current !== 'wall.html') {
        window.location.replace('wall.html');
    }
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) delete headers['Content-Type'];

    const res = await fetch(API + path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Chyba serveru');
    return data;
}

function formatDate(str) {
    return new Date(str).toLocaleString('cs-CZ', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function showAlert(el, msg, type = 'error') {
    el.textContent = msg;
    el.className = `alert show alert-${type}`;
}

// Nastavení navigace
function setupNav() {
    const token = getToken();
    const user = getUser();
    document.querySelectorAll('.nav-auth').forEach(el => {
        el.style.display = token ? 'inline-flex' : 'none';
    });
    const nameEl = document.getElementById('nav-username');
    if (nameEl && user) nameEl.textContent = user.first_name;
}
