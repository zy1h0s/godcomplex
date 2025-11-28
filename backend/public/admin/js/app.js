const API_URL = ''; // Relative path since served from same origin

// State
let token = localStorage.getItem('admin_token');
let currentUser = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const menuItems = document.querySelectorAll('.menu-item');
const views = document.querySelectorAll('.view');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close-modal');

// Initialize
function init() {
    if (token) {
        showDashboard();
        loadDashboardStats();
    } else {
        showLogin();
    }

    // Event Listeners
    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    closeModal.addEventListener('click', () => modal.classList.add('hidden'));

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            switchView(viewName);
        });
    });

    document.getElementById('create-operator-btn').addEventListener('click', showCreateOperatorModal);
    document.getElementById('candidate-search').addEventListener('input', handleCandidateSearch);
}

// Navigation
function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    switchView('dashboard');
}

function switchView(viewName) {
    // Update menu
    menuItems.forEach(item => {
        if (item.dataset.view === viewName) item.classList.add('active');
        else item.classList.remove('active');
    });

    // Update view
    views.forEach(view => {
        if (view.id === `view-${viewName}`) view.classList.add('active');
        else view.classList.remove('active');
    });

    // Load data
    if (viewName === 'dashboard') loadDashboardStats();
    if (viewName === 'operators') loadOperators();
    if (viewName === 'candidates') loadCandidates();
}

// Auth
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success) {
            if (data.user.user_type !== 'admin') {
                loginError.textContent = 'Access denied. Admin only.';
                return;
            }
            token = data.token;
            localStorage.setItem('admin_token', token);
            document.getElementById('admin-username').textContent = data.user.username;
            showDashboard();
        } else {
            loginError.textContent = data.error || 'Login failed';
        }
    } catch (err) {
        loginError.textContent = 'Connection error';
    }
}

function handleLogout() {
    token = null;
    localStorage.removeItem('admin_token');
    showLogin();
}

// Dashboard
async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_URL}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('stat-operators').textContent = data.stats.operators;
            document.getElementById('stat-candidates').textContent = data.stats.candidates;
            document.getElementById('stat-sessions').textContent = data.stats.sessions;

            const tbody = document.querySelector('#recent-sessions-table tbody');
            tbody.innerHTML = data.recent_activity.map(session => `
                <tr>
                    <td>${session.name}</td>
                    <td>${session.creator?.username || 'Unknown'}</td>
                    <td>${new Date(session.updated_at).toLocaleString()}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

// Operators
async function loadOperators() {
    try {
        const res = await fetch(`${API_URL}/admin/operators`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            const tbody = document.querySelector('#operators-table tbody');
            tbody.innerHTML = data.operators.map(op => `
                <tr>
                    <td>${op.username}</td>
                    <td>${op.email}</td>
                    <td>${op.candidate_count || 0}</td>
                    <td><span class="${op.is_active ? 'status-active' : 'status-inactive'}">${op.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                    <td>
                        <button class="btn-sm" onclick="editOperator('${op.id}', '${op.username}', '${op.email}', ${op.is_active})">EDIT</button>
                        <button class="btn-sm btn-danger" onclick="deleteOperator('${op.id}')">DELETE</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

function showCreateOperatorModal() {
    modalTitle.textContent = 'Create New Operator';
    modalBody.innerHTML = `
        <form id="create-operator-form">
            <div class="form-group">
                <label>USERNAME</label>
                <input type="text" id="op-username" required>
            </div>
            <div class="form-group">
                <label>EMAIL</label>
                <input type="email" id="op-email" required>
            </div>
            <div class="form-group">
                <label>PASSWORD</label>
                <input type="password" id="op-password" required>
            </div>
            <button type="submit">CREATE OPERATOR</button>
        </form>
    `;
    modal.classList.remove('hidden');

    document.getElementById('create-operator-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('op-username').value;
        const email = document.getElementById('op-email').value;
        const password = document.getElementById('op-password').value;

        try {
            const res = await fetch(`${API_URL}/admin/operators`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (data.success) {
                modal.classList.add('hidden');
                loadOperators();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Failed to create operator');
        }
    });
}

window.deleteOperator = async (id) => {
    if (!confirm('Are you sure? This will delete all candidates and sessions associated with this operator.')) return;

    try {
        const res = await fetch(`${API_URL}/admin/operators/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) loadOperators();
    } catch (err) {
        alert('Failed to delete operator');
    }
};

// Candidates
async function loadCandidates() {
    try {
        const res = await fetch(`${API_URL}/admin/candidates`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            renderCandidatesTable(data.candidates);
            window.allCandidates = data.candidates; // Store for search
        }
    } catch (err) {
        console.error(err);
    }
}

function renderCandidatesTable(candidates) {
    const tbody = document.querySelector('#candidates-table tbody');
    tbody.innerHTML = candidates.map(map => `
        <tr>
            <td>${map.candidate.username}</td>
            <td>${map.operator.username}</td>
            <td>${map.session?.name || 'No Session'}</td>
            <td><span class="${map.candidate.is_active ? 'status-active' : 'status-inactive'}">${map.candidate.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
            <td>
                <button class="btn-sm" onclick="toggleCandidateStatus('${map.candidate.id}', ${!map.candidate.is_active})">
                    ${map.candidate.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                </button>
            </td>
        </tr>
    `).join('');
}

function handleCandidateSearch(e) {
    const term = e.target.value.toLowerCase();
    if (!window.allCandidates) return;

    const filtered = window.allCandidates.filter(c =>
        c.candidate.username.toLowerCase().includes(term) ||
        c.operator.username.toLowerCase().includes(term)
    );
    renderCandidatesTable(filtered);
}

window.toggleCandidateStatus = async (id, isActive) => {
    try {
        const res = await fetch(`${API_URL}/admin/candidates/${id}/toggle-active`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_active: isActive })
        });
        if (res.ok) loadCandidates();
    } catch (err) {
        alert('Failed to update status');
    }
};

// Start
init();
