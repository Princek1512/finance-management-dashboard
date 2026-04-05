const API = '/api/v1';
let token = localStorage.getItem('token') || '';
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentPage = 1;

// ===== Utility =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const api = async (path, opts = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, { ...opts, headers });
    // Handle 204 No Content (e.g. user delete) and empty responses
    if (res.status === 204) return { status: 'success' };
    const text = await res.text();
    const data = text ? JSON.parse(text) : { status: 'success' };
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
};

const toast = (msg) => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
};

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const monthName = (m) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];

// ===== Auth =====
const showApp = () => {
    $('#login-page').classList.remove('active');
    $('#app-page').classList.add('active');
    document.body.className = `role-${currentUser.role}`;
    $('#user-info').textContent = `${currentUser.name} (${currentUser.role})`;
    loadDashboard();
};

const showLogin = () => {
    token = '';
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.body.className = '';
    $('#app-page').classList.remove('active');
    $('#login-page').classList.add('active');
};

$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-error').textContent = '';
    try {
        const data = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: $('#login-email').value,
                password: $('#login-password').value,
            }),
        });
        token = data.token;
        currentUser = data.data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
        showApp();
    } catch (err) {
        $('#login-error').textContent = err.message;
    }
});

$('#logout-btn').addEventListener('click', showLogin);

// ===== Tabs =====
$$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        $$('.nav-btn').forEach((b) => b.classList.remove('active'));
        $$('.tab').forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        $(`#tab-${tab}`).classList.add('active');

        if (tab === 'dashboard') loadDashboard();
        if (tab === 'records') loadRecords();
        if (tab === 'users') loadUsers();
    });
});

// ===== Dashboard =====
const loadDashboard = async () => {
    try {
        const data = await api('/dashboard');
        const s = data.data.summary;
        $('#total-income').textContent = fmt(s.totalIncome);
        $('#total-expense').textContent = fmt(s.totalExpense);
        $('#net-balance').textContent = fmt(s.netBalance);

        $('#recent-tbody').innerHTML = data.data.recentTransactions
            .map((r) => `<tr>
        <td>${fmtDate(r.date)}</td>
        <td>${r.category}</td>
        <td><span class="badge badge-${r.type}">${r.type}</span></td>
        <td>${fmt(r.amount)}</td>
      </tr>`).join('');

        $('#categories-tbody').innerHTML = data.data.categoryTotals
            .map((c) => `<tr>
        <td>${c.category}</td>
        <td><span class="badge badge-${c.type}">${c.type}</span></td>
        <td>${fmt(c.total)}</td>
      </tr>`).join('');

        $('#trends-tbody').innerHTML = data.data.monthlyTrends
            .map((t) => `<tr>
        <td>${monthName(t.month)} ${t.year}</td>
        <td>${fmt(t.income)}</td>
        <td>${fmt(t.expense)}</td>
        <td>${fmt(t.income - t.expense)}</td>
      </tr>`).join('');
    } catch (err) {
        toast(err.message);
    }
};

// ===== Records =====
const loadRecords = async (page = 1) => {
    currentPage = page;
    const type = $('#filter-type').value;
    const search = $('#filter-search').value;
    let query = `?page=${page}&limit=10`;
    if (type) query += `&type=${type}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;

    try {
        const data = await api(`/records${query}`);
        const records = data.data.records;

        $('#records-tbody').innerHTML = records.map((r) => `<tr id="row-${r._id}">
      <td>${fmtDate(r.date)}</td>
      <td>${r.category}</td>
      <td><span class="badge badge-${r.type}">${r.type}</span></td>
      <td>${fmt(r.amount)}</td>
      <td>${r.note || '—'}</td>
      <td class="admin-only">
        <button class="btn btn-outline btn-sm" onclick="editRecord('${r._id}')">Edit</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${r._id}">Delete</button>
      </td>
    </tr>`).join('');

        // Attach delete click handlers (no confirm dialog - uses two-click pattern)
        document.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', function () {
                if (this.dataset.ready === 'true') {
                    // Second click — actually delete
                    performDelete(this.dataset.id);
                } else {
                    // First click — show "Sure?" confirmation on the button itself
                    this.textContent = 'Sure?';
                    this.dataset.ready = 'true';
                    this.style.background = '#c00';
                    this.style.color = '#fff';
                    this.style.borderColor = '#c00';
                    // Reset after 3 seconds if not clicked again
                    setTimeout(() => {
                        this.textContent = 'Delete';
                        this.dataset.ready = '';
                        this.style.background = '';
                        this.style.color = '';
                        this.style.borderColor = '';
                    }, 3000);
                }
            });
        });

        // Pagination
        const pages = data.pages;
        let pagHtml = '';
        for (let i = 1; i <= pages; i++) {
            pagHtml += `<button class="${i === page ? 'active' : ''}" onclick="loadRecords(${i})">${i}</button>`;
        }
        $('#records-pagination').innerHTML = pagHtml;

        document.body.className = `role-${currentUser.role}`;
    } catch (err) {
        toast(err.message);
    }
};

const performDelete = async (id) => {
    try {
        await api(`/records/${id}`, { method: 'DELETE' });
        toast('Record deleted');
        loadRecords(currentPage);
    } catch (err) {
        toast(err.message);
    }
};

$('#filter-btn').addEventListener('click', () => loadRecords(1));
$('#filter-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') loadRecords(1); });

// Add record
$('#add-record-btn').addEventListener('click', () => {
    $('#record-id').value = '';
    $('#record-form').reset();
    $('#rec-date').value = new Date().toISOString().split('T')[0];
    $('#record-form-title').textContent = 'Add Record';
    $('#record-form-container').style.display = 'block';
});

$('#cancel-record-btn').addEventListener('click', () => {
    $('#record-form-container').style.display = 'none';
});

$('#record-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#record-id').value;
    const body = {
        amount: parseFloat($('#rec-amount').value),
        type: $('#rec-type').value,
        category: $('#rec-category').value,
        date: $('#rec-date').value,
        note: $('#rec-note').value,
    };

    try {
        if (id) {
            await api(`/records/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
            toast('Record updated');
        } else {
            await api('/records', { method: 'POST', body: JSON.stringify(body) });
            toast('Record created');
        }
        $('#record-form-container').style.display = 'none';
        loadRecords(currentPage);
    } catch (err) {
        toast(err.message);
    }
});

// Edit record
window.editRecord = async (id) => {
    try {
        const data = await api(`/records/${id}`);
        const r = data.data.record;
        $('#record-id').value = r._id;
        $('#rec-amount').value = r.amount;
        $('#rec-type').value = r.type;
        $('#rec-category').value = r.category;
        $('#rec-date').value = r.date.split('T')[0];
        $('#rec-note').value = r.note || '';
        $('#record-form-title').textContent = 'Edit Record';
        $('#record-form-container').style.display = 'block';
    } catch (err) {
        toast(err.message);
    }
};

// ===== Users =====
const loadUsers = async () => {
    try {
        const data = await api('/users?limit=50');
        $('#users-tbody').innerHTML = data.data.users.map((u) => `<tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td><span class="badge badge-${u.status}">${u.status}</span></td>
      <td>
        <select onchange="updateUserRole('${u._id}', this.value)" style="margin-right:4px;padding:4px;font-size:0.8rem;border:1px solid #ccc;border-radius:4px;">
          <option value="" disabled selected>Role</option>
          <option value="viewer">Viewer</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="toggleUserStatus('${u._id}', '${u.status}')" style="margin-right:4px;">
          ${u.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
        <button class="btn btn-danger btn-sm user-delete-btn" data-id="${u._id}">Delete</button>
      </td>
    </tr>`).join('');

        // Attach user delete handlers (two-click pattern)
        document.querySelectorAll('.user-delete-btn').forEach((btn) => {
            btn.addEventListener('click', function () {
                if (this.dataset.ready === 'true') {
                    performUserDelete(this.dataset.id);
                } else {
                    this.textContent = 'Sure?';
                    this.dataset.ready = 'true';
                    this.style.background = '#c00';
                    this.style.color = '#fff';
                    this.style.borderColor = '#c00';
                    setTimeout(() => {
                        this.textContent = 'Delete';
                        this.dataset.ready = '';
                        this.style.background = '';
                        this.style.color = '';
                        this.style.borderColor = '';
                    }, 3000);
                }
            });
        });
    } catch (err) {
        toast(err.message);
    }
};

const performUserDelete = async (id) => {
    try {
        await api(`/users/${id}`, { method: 'DELETE' });
        toast('User deleted');
        loadUsers();
    } catch (err) {
        toast(err.message);
    }
};

window.updateUserRole = async (id, role) => {
    try {
        await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
        toast('Role updated');
        loadUsers();
    } catch (err) {
        toast(err.message);
    }
};

window.toggleUserStatus = async (id, current) => {
    const status = current === 'active' ? 'inactive' : 'active';
    try {
        await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
        toast('Status updated');
        loadUsers();
    } catch (err) {
        toast(err.message);
    }
};

// ===== Init =====
if (token && currentUser) {
    showApp();
} else {
    showLogin();
}
