/**
 * Library Management System - Core Script
 * Handles Data Persistence, Auth, and Global UI
 */

const DB_KEYS = {
    BOOKS: 'lib_books',
    USERS: 'lib_users',
    MEMBERS: 'lib_members',
    ISSUED: 'lib_issued',
    CURRENT_USER: 'lib_current_user',
    THEME: 'lib_theme'
};

const DEFAULT_DATA = {
    books: [
        { id: '101', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction', isbn: '9780743273565', quantity: 5, available: 3, cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200' },
        { id: '102', title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', isbn: '9780132350884', quantity: 10, available: 10, cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=200' },
        { id: '103', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Fiction', isbn: '9780061120084', quantity: 7, available: 2, cover: 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?auto=format&fit=crop&q=80&w=200' },
        { id: '104', title: 'Design Patterns', author: 'Erich Gamma', category: 'Technology', isbn: '9780201633610', quantity: 4, available: 1, cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=200' }
    ],
    members: [
        { id: 'M001', name: 'Jarvis Bell', email: 'jarvis@example.com', phone: '7534125645', joinDate: '2025-01-15' },
        { id: 'M002', name: 'Byron Richards', email: 'byron@example.com', phone: '9855347689', joinDate: '2025-02-25' }
    ],
    users: [
        { id: 'U1', name: 'Admin User', email: 'admin@library.com', password: 'password123', role: 'admin' }
    ],
    issued: []
};

// --- Storage Helper ---
const Storage = {
    get(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    init() {
        if (!this.get(DB_KEYS.BOOKS)) this.set(DB_KEYS.BOOKS, DEFAULT_DATA.books);
        if (!this.get(DB_KEYS.USERS)) this.set(DB_KEYS.USERS, DEFAULT_DATA.users);
        if (!this.get(DB_KEYS.MEMBERS)) this.set(DB_KEYS.MEMBERS, DEFAULT_DATA.members);
        if (!this.get(DB_KEYS.ISSUED)) this.set(DB_KEYS.ISSUED, DEFAULT_DATA.issued);
    }
};

// --- Auth Helper ---
const Auth = {
    login(email, password) {
        // Master password check (User Request)
        if (password === '123456') {
            const users = Storage.get(DB_KEYS.USERS);
            let user = users.find(u => u.email === email);

            // Create mock user if not found
            if (!user) {
                user = {
                    id: 'U_TEMP_' + Date.now(),
                    name: email.split('@')[0],
                    email: email,
                    role: 'student',
                    password: '123456'
                };
                // Optionally save this new user to DB so they persist?
                // For now, just setting current session is enough for "login me"
            }
            Storage.set(DB_KEYS.CURRENT_USER, user);
            return true;
        }

        const users = Storage.get(DB_KEYS.USERS);
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            Storage.set(DB_KEYS.CURRENT_USER, user);
            return true;
        }
        return false;
    },
    logout() {
        localStorage.removeItem(DB_KEYS.CURRENT_USER);
        window.location.href = 'login.html';
    },
    check() {
        const user = Storage.get(DB_KEYS.CURRENT_USER);
        const currentPage = window.location.pathname.split('/').pop();

        if (!user && currentPage !== 'login.html') {
            window.location.href = 'login.html';
        } else if (user && currentPage === 'login.html') {
            window.location.href = 'index.html';
        }
        return user;
    },
    getCurrentUser() {
        return Storage.get(DB_KEYS.CURRENT_USER);
    }
};

// --- Global UI ---
const UI = {
    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        Storage.set(DB_KEYS.THEME, newTheme);

        // Update icon if exists
        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    },
    initTheme() {
        const savedTheme = Storage.get(DB_KEYS.THEME) || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    },
    updateProfileUI() {
        const user = Auth.getCurrentUser();
        const nameEl = document.getElementById('nav-user-name');
        if (user && nameEl) nameEl.textContent = user.name;
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    Storage.init();

    // Skip auth check for login page itself to prevent infinite loops if handled incorrectly
    if (window.location.pathname.includes('login.html')) {
        // If already logged in, redirect to index
        if (Auth.getCurrentUser()) window.location.href = 'index.html';
    } else {
        Auth.check();
    }

    UI.initTheme();
    UI.updateProfileUI();

    // Global Logout Listener
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }

    // Theme Toggle Listener
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', UI.toggleTheme);
    }
});
