const SUPABASE_URL = 'https://smrvnrzglntzsgcgzewm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtcnZucnpnbG50enNnY2d6ZXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzIxNzUsImV4cCI6MjA4NzI0ODE3NX0.jzrDlH3ldj2Cx0pJcwzEBlnms12eIqWKb4ey1vBVf-k';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);


// ── Load users ─────────────────────────────────────────────
async function loadUsers() {
    const { data, error } = await db
        .from('panel_users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase error:', error);
        document.getElementById('usersTableBody').innerHTML =
            `<tr><td colspan="6" class="loading-row">BŁĄD POŁĄCZENIA: ${error.message}</td></tr>`;
        return;
    }

    const total = data.length;
    const active = data.filter(u => u.bound_ip).length;
    const pending = total - active;

    // Animated counters
    animCount(document.getElementById('statTotal'), total);
    animCount(document.getElementById('statActive'), active);
    animCount(document.getElementById('statPending'), pending);

    // Stat bars
    const pct = total > 0 ? Math.round((active / total) * 100) : 0;
    setTimeout(() => {
        document.getElementById('barTotal').style.width = '100%';
        document.getElementById('barActive').style.width = pct + '%';
        document.getElementById('barPending').style.width = (100 - pct) + '%';
    }, 200);

    // Nav badge
    const badge = document.getElementById('badge-users');
    badge.textContent = total;
    badge.classList.toggle('has-data', total > 0);

    // Table count
    document.getElementById('tableCount').textContent = `${total} rekord${total === 1 ? '' : 'ów'}`;

    const tbody = document.getElementById('usersTableBody');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Brak użytkowników. Utwórz pierwszy.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((u, i) => {
        const isActive = !!u.bound_ip;
        const created = new Date(u.created_at);
        const dateStr = created.toLocaleDateString('pl-PL') + ' ' + created.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

        return `
        <tr style="animation:fadeSlideIn 0.3s ease ${i * 0.05}s both;">
            <td style="color:var(--text-muted);font-size:11px;">${String(i + 1).padStart(2, '0')}</td>
            <td><span class="badge-login">${u.login}</span></td>
            <td>
                ${isActive
                ? '<span class="badge-ip" style="background:rgba(0,255,136,0.05);color:var(--green);border-color:rgba(0,255,136,0.15);font-size:10px;padding:3px 10px;">● AKTYWNY</span>'
                : '<span class="badge-pending" style="font-size:10px;padding:3px 10px;">○ OCZEKUJE</span>'}
            </td>
            <td>
                ${isActive
                ? `<span class="badge-ip">${u.bound_ip}</span>`
                : '<span style="color:var(--text-muted);font-size:11px;">—</span>'}
            </td>
            <td class="date-cell">${dateStr}</td>
            <td>
                <button class="btn-danger-sm" onclick="deleteUser('${u.id}','${u.login}')">USUŃ</button>
                ${isActive ? `<button class="btn-secondary-sm" onclick="resetIp('${u.id}')">RESET IP</button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

// ── Create user ─────────────────────────────────────────────
function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
    document.getElementById('newLogin').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('createError').style.display = 'none';
    setTimeout(() => document.getElementById('newLogin').focus(), 50);
}
function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
}
function closeModalOnBg(e) {
    if (e.target.id === 'createModal') closeCreateModal();
}

async function createUser() {
    const login = document.getElementById('newLogin').value.trim();
    const pass = document.getElementById('newPass').value.trim();
    const err = document.getElementById('createError');

    err.style.display = 'none';
    if (!login || !pass) { err.textContent = 'Wypełnij wszystkie pola.'; err.style.display = 'block'; return; }
    if (pass.length < 4) { err.textContent = 'Hasło min. 4 znaki.'; err.style.display = 'block'; return; }

    const { error } = await db.from('panel_users').insert({ login, password: pass });
    if (error) {
        err.textContent = error.code === '23505' ? 'Login już istnieje.' : 'Błąd: ' + error.message;
        err.style.display = 'block';
        return;
    }
    closeCreateModal();
    loadUsers();
}

// ── Delete user ─────────────────────────────────────────────
async function deleteUser(id, login) {
    if (!confirm(`Usunąć użytkownika „${login}"? Tej operacji nie można cofnąć.`)) return;
    await db.from('panel_users').delete().eq('id', id);
    loadUsers();
}

// ── Reset IP ────────────────────────────────────────────────
async function resetIp(id) {
    if (!confirm('Zresetować bound IP? Umożliwi to aktywację konta na nowym urządzeniu.')) return;
    await db.from('panel_users').update({ bound_ip: null }).eq('id', id);
    loadUsers();
}

// ── Logout ──────────────────────────────────────────────────
function logout() { window.location.href = 'index.html'; }

// ── IP BAN ──────────────────────────────────────────────────
async function loadBans() {
    const { data, error } = await db
        .from('banned_ips')
        .select('*')
        .order('banned_at', { ascending: false });

    if (error) { console.error(error); return; }

    const tbody = document.getElementById('bansTableBody');
    const count = data.length;

    const badge = document.getElementById('badge-bans');
    badge.textContent = count;
    badge.classList.toggle('has-data', count > 0);
    document.getElementById('banCount').textContent = `${count} ban${count === 1 ? '' : 'ów'}`;

    if (count === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Brak zbanowanych adresów IP.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((b, i) => {
        const d = new Date(b.banned_at);
        const ds = d.toLocaleDateString('pl-PL') + ' ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        return `
        <tr style="animation:fadeSlideIn 0.3s ease ${i * 0.05}s both;">
            <td style="color:var(--text-muted);font-size:11px;">${String(i + 1).padStart(2, '0')}</td>
            <td><span style="color:var(--red);font-family:var(--mono);font-weight:600;font-size:13px;">${b.ip}</span></td>
            <td style="color:var(--text-sec);">${b.reason || '<span style="color:var(--text-muted)">—</span>'}</td>
            <td class="date-cell">${ds}</td>
            <td><button class="btn-secondary-sm" onclick="removeBan('${b.id}','${b.ip}')">ODBANUJ</button></td>
        </tr>`;
    }).join('');
}

async function addBan() {
    const ip = document.getElementById('banIp').value.trim();
    const reason = document.getElementById('banReason').value.trim();
    const err = document.getElementById('banError');
    err.style.display = 'none';

    if (!ip) { err.textContent = 'Podaj adres IP.'; err.style.display = 'block'; return; }
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) { err.textContent = 'Nieprawidłowy format IP (np. 192.168.1.100).'; err.style.display = 'block'; return; }

    const { error } = await db.from('banned_ips').insert({ ip, reason: reason || null });
    if (error) {
        err.textContent = error.code === '23505' ? 'Ten IP jest już zbanowany.' : 'Błąd: ' + error.message;
        err.style.display = 'block';
        return;
    }
    document.getElementById('banIp').value = '';
    document.getElementById('banReason').value = '';
    loadBans();
}

async function removeBan(id, ip) {
    if (!confirm(`Odbanować adres IP „${ip}"?`)) return;
    await db.from('banned_ips').delete().eq('id', id);
    loadBans();
}

// ── Tab switching (override inline handler) ──────────────────
function showTab(name, el) {
    event.preventDefault();
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.getElementById('pageTitle').textContent = name.toUpperCase();
    el.classList.add('active');
    if (name === 'users') loadUsers();
    if (name === 'ban') loadBans();
}

// ── Init ────────────────────────────────────────────────────
loadUsers();
loadBans();
