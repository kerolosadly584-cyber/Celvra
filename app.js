/* ============================================================
   CELVRA — app.js
   Beyond Storage, Beyond Limits
   Developer: Kerolos Adly © 2026
   ============================================================ */

// ==================== STORAGE HELPERS ====================
const DB = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem(key); }
};

// ==================== GLOBAL STATE ====================
let currentUser = null;
let pendingIncoming = null;
let currentFolderTarget = null;
let transferFiles = [];

// ==================== BOOT ====================
window.addEventListener('DOMContentLoaded', () => {
  drawGrid();
  const saved = DB.get('celvra_remember');
  if (saved) {
    document.getElementById('loginEmail').value = saved.email || '';
    document.getElementById('loginPass').value = saved.pass || '';
    document.getElementById('rememberMe').checked = true;
  }
  const sess = DB.get('celvra_session');
  if (sess) {
    const users = DB.get('celvra_users') || {};
    if (users[sess]) { currentUser = users[sess]; bootApp(); return; }
  }
  document.getElementById('authSection').classList.remove('hidden');
});

// ==================== GRID CANVAS ====================
function drawGrid() {
  const canvas = document.getElementById('gridCanvas');
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; draw(); }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    const gap = 60;
    for (let x = 0; x < canvas.width; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    // gradient overlay
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width * 0.7);
    grad.addColorStop(0, 'rgba(0,245,196,0.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);
  // subtle animation
  let t = 0;
  function animate() {
    t += 0.005;
    const shift = Math.sin(t) * 5;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.022)';
    ctx.lineWidth = 1;
    const gap = 60;
    for (let x = shift; x < canvas.width; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = shift; y < canvas.height; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width * 0.7);
    grad.addColorStop(0, 'rgba(0,245,196,0.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(animate);
  }
  animate();
}

// ==================== AUTH TAB SWITCHER ====================
function showTab(tab) {
  const ind = document.getElementById('tabIndicator');
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab !== 'login');
  ind.classList.toggle('right', tab !== 'login');
}

function toggleEye(id, btn) {
  const inp = document.getElementById(id);
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.innerHTML = `<i class="fa-solid fa-eye${isPass ? '-slash' : ''}"></i>`;
}

// ==================== REGISTER ====================
function doRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;
  const msg = document.getElementById('registerMsg');
  msg.className = 'auth-msg';

  if (!username || !email || !pass) return showMsg(msg, 'Please fill all fields.', 'error');
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return showMsg(msg, 'Invalid email address.', 'error');
  if (pass.length < 6) return showMsg(msg, 'Password must be at least 6 characters.', 'error');

  const users = DB.get('celvra_users') || {};
  if (users[email]) return showMsg(msg, 'This email is already registered.', 'error');

  users[email] = {
    username, email, pass,
    files: { photos: [], videos: [], music: [], contacts: [], documents: [] },
    folders: { photos: [], videos: [], music: [], documents: [] },
    links: [],
    notifications: [],
    createdAt: Date.now()
  };
  DB.set('celvra_users', users);
  showMsg(msg, '✓ Account created! Sign in now.', 'success');
  setTimeout(() => showTab('login'), 1200);
}

// ==================== LOGIN ====================
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const remember = document.getElementById('rememberMe').checked;
  const msg = document.getElementById('loginMsg');
  msg.className = 'auth-msg';

  if (!email || !pass) return showMsg(msg, 'Please enter email and password.', 'error');

  const users = DB.get('celvra_users') || {};
  if (!users[email]) return showMsg(msg, 'No account found with this email.', 'error');
  if (users[email].pass !== pass) return showMsg(msg, 'Incorrect password.', 'error');

  currentUser = users[email];
  DB.set('celvra_session', email);
  if (remember) DB.set('celvra_remember', { email, pass });
  else DB.remove('celvra_remember');

  bootApp();
}

function doLogout() {
  DB.remove('celvra_session');
  currentUser = null;
  document.getElementById('appSection').classList.add('hidden');
  document.getElementById('authSection').classList.remove('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
  showTab('login');
}

// ==================== BOOT APP ====================
function bootApp() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('appSection').classList.remove('hidden');
  document.getElementById('sbUser').innerHTML = `<div style="font-weight:600;font-size:0.85rem;color:var(--text)">${currentUser.username}</div><div style="font-size:0.72rem;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${currentUser.email}</div>`;
  goPage('dashboard', document.querySelector('.sb-item[data-page="dashboard"]'));
  renderNotifBadge();
  checkIncomingNotifs();
  setInterval(checkIncomingNotifs, 5000);
}

// ==================== NAVIGATION ====================
function goPage(name, el) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const page = document.getElementById('page-' + name);
  if (!page) return;
  page.classList.remove('hidden');
  page.classList.add('active');

  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    const match = document.querySelector(`.sb-item[data-page="${name}"]`);
    if (match) match.classList.add('active');
  }

  closeSidebar();

  if (name === 'dashboard') renderDashboard();
  else if (['photos','videos','music','contacts','documents'].includes(name)) renderFileSection(name);
  else if (name === 'links') renderLinks();
  else if (name === 'notifications') renderNotifications();
}

// ==================== SIDEBAR MOBILE ====================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dashGreet').textContent = `${greet}, ${currentUser.username} 👋`;

  const sections = [
    { key: 'photos', label: 'Photos', icon: '🖼️', page: 'photos' },
    { key: 'videos', label: 'Videos', icon: '🎬', page: 'videos' },
    { key: 'music', label: 'Music', icon: '🎵', page: 'music' },
    { key: 'contacts', label: 'Contacts', icon: '📇', page: 'contacts' },
    { key: 'documents', label: 'Docs', icon: '📁', page: 'documents' },
    { key: 'links', label: 'Links', icon: '🔗', page: 'links' },
  ];

  const grid = document.getElementById('statsGrid');
  grid.innerHTML = sections.map(s => {
    let count = 0;
    if (s.key === 'links') count = (currentUser.links || []).length;
    else {
      const files = currentUser.files[s.key] || [];
      const folders = currentUser.folders[s.key] || [];
      count = files.length + folders.reduce((a,f) => a + (f.files||[]).length, 0);
    }
    return `<div class="stat-card" onclick="goPage('${s.page}',null)">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${count}</div>
    </div>`;
  }).join('');

  // notif count
  const unread = (currentUser.notifications || []).filter(n => !n.read).length;
  grid.innerHTML += `<div class="stat-card" onclick="goPage('notifications',null)">
    <div class="stat-icon">🔔</div>
    <div class="stat-label">Notifications</div>
    <div class="stat-value">${unread}</div>
  </div>`;

  // recent
  const recent = [];
  ['photos','videos','music','contacts','documents'].forEach(s => {
    (currentUser.files[s] || []).forEach(f => recent.push({...f, section: s}));
    (currentUser.folders[s] || []).forEach(folder => (folder.files||[]).forEach(f => recent.push({...f, section: s})));
  });
  recent.sort((a,b) => b.date - a.date);
  const top = recent.slice(0, 8);
  const rl = document.getElementById('recentList');
  if (!top.length) { rl.innerHTML = '<p class="empty-state"><i class="fa-solid fa-box-open"></i> No files yet. Start uploading!</p>'; return; }
  rl.innerHTML = top.map(f => `<div class="recent-item">
    <i class="${fileIcon(f.name, f.section)}"></i>
    <span>${f.name}</span>
    <small>${formatDate(f.date)}</small>
  </div>`).join('');
}

// ==================== FILE SECTIONS ====================
function renderFileSection(section) {
  const area = document.getElementById(section + 'Area');
  area.innerHTML = '';

  // Folders
  const folders = currentUser.folders[section] || [];
  folders.forEach((folder, fi) => {
    const folderEl = document.createElement('div');
    folderEl.className = 'folder-block';
    folderEl.id = `folder-${section}-${fi}`;

    const fileCount = (folder.files||[]).length;
    folderEl.innerHTML = `
      <div class="folder-header" onclick="toggleFolder('${section}',${fi})">
        <i class="fa-solid fa-folder folder-icon"></i>
        <span class="folder-name">${folder.name}</span>
        <span class="folder-count">${fileCount} file${fileCount !== 1 ? 's' : ''}</span>
        <div class="folder-actions" onclick="event.stopPropagation()">
          <button class="icon-btn del" onclick="deleteFolder('${section}',${fi})" title="Delete Folder"><i class="fa-solid fa-trash"></i></button>
        </div>
        <i class="fa-solid fa-chevron-right folder-chevron"></i>
      </div>
      <div class="folder-body" id="fbody-${section}-${fi}">
        <div class="folder-upload-row">
          <button class="folder-upload-btn" onclick="triggerFolderUpload('${section}',${fi})">
            <i class="fa-solid fa-plus"></i> Add Files
          </button>
          <input type="file" id="finput-${section}-${fi}" multiple onchange="handleFolderUpload(event,'${section}',${fi})" hidden/>
        </div>
        ${(folder.files||[]).map((f,fIdx) => fileCardHTML(f, section, fi, fIdx)).join('')}
        ${!(folder.files||[]).length ? '<p class="empty-state" style="padding:1rem"><i class="fa-solid fa-folder-open"></i> Empty folder</p>' : ''}
      </div>`;
    area.appendChild(folderEl);
  });

  // Root files
  const rootFiles = currentUser.files[section] || [];
  if (rootFiles.length) {
    const rootDiv = document.createElement('div');
    rootDiv.className = 'root-files';
    rootDiv.innerHTML = rootFiles.map((f, i) => fileCardHTML(f, section, null, i)).join('');
    area.appendChild(rootDiv);
  }

  if (!folders.length && !rootFiles.length) {
    area.innerHTML = '<p class="empty-state"><i class="fa-solid fa-cloud-arrow-up"></i> No files yet. Upload something!</p>';
  }
}

function fileCardHTML(f, section, folderIdx, fileIdx) {
  const iconClass = fileIcon(f.name, section);
  const color = sectionColor(section);
  const ref = folderIdx !== null ? `${folderIdx},${fileIdx}` : `null,${fileIdx}`;
  return `<div class="file-card">
    <input type="checkbox" class="file-check" id="chk-${section}-${ref}" />
    <div class="file-icon-wrap" style="background:${color}20;color:${color}"><i class="${iconClass}"></i></div>
    <div class="file-info">
      <div class="file-name">${f.name}</div>
      <div class="file-meta">${formatBytes(f.size)} · ${formatDate(f.date)}</div>
    </div>
    <div class="file-actions">
      <button class="icon-btn send" title="Send File" onclick="sendSingleFile('${section}',${folderIdx},${fileIdx})"><i class="fa-solid fa-paper-plane"></i></button>
      <button class="icon-btn dl" title="Download" onclick="downloadFile('${section}',${folderIdx},${fileIdx})"><i class="fa-solid fa-download"></i></button>
      <button class="icon-btn del" title="Delete" onclick="deleteFile('${section}',${folderIdx},${fileIdx})"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}

// ==================== UPLOAD ====================
function triggerUpload(inputId, section) {
  currentFolderTarget = null;
  document.getElementById(inputId).click();
}

function handleUpload(event, section) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  files.forEach(f => {
    const fileData = { name: f.name, size: f.size, type: f.type, date: Date.now(), dataUrl: null };
    const reader = new FileReader();
    reader.onload = (e) => {
      fileData.dataUrl = e.target.result;
      currentUser.files[section] = currentUser.files[section] || [];
      currentUser.files[section].push(fileData);
      saveUser();
      renderFileSection(section);
    };
    reader.readAsDataURL(f);
  });
  event.target.value = '';
}

function triggerFolderUpload(section, fi) {
  document.getElementById(`finput-${section}-${fi}`).click();
}

function handleFolderUpload(event, section, fi) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  files.forEach(f => {
    const fileData = { name: f.name, size: f.size, type: f.type, date: Date.now(), dataUrl: null };
    const reader = new FileReader();
    reader.onload = (e) => {
      fileData.dataUrl = e.target.result;
      currentUser.folders[section][fi].files = currentUser.folders[section][fi].files || [];
      currentUser.folders[section][fi].files.push(fileData);
      saveUser();
      renderFileSection(section);
    };
    reader.readAsDataURL(f);
  });
  event.target.value = '';
}

// ==================== FOLDERS ====================
function createFolder(section) {
  currentFolderTarget = section;
  document.getElementById('folderNameInput').value = '';
  document.getElementById('folderModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('folderNameInput').focus(), 100);
}

function confirmFolder() {
  const name = document.getElementById('folderNameInput').value.trim();
  if (!name) return;
  currentUser.folders[currentFolderTarget] = currentUser.folders[currentFolderTarget] || [];
  currentUser.folders[currentFolderTarget].push({ name, files: [], date: Date.now() });
  saveUser();
  closeModal('folderModal');
  renderFileSection(currentFolderTarget);
}

function toggleFolder(section, fi) {
  const block = document.getElementById(`folder-${section}-${fi}`);
  block.classList.toggle('open');
}

function deleteFolder(section, fi) {
  if (!confirm(`Delete folder "${currentUser.folders[section][fi].name}" and all its files?`)) return;
  currentUser.folders[section].splice(fi, 1);
  saveUser();
  renderFileSection(section);
}

// ==================== FILE ACTIONS ====================
function deleteFile(section, folderIdx, fileIdx) {
  if (folderIdx !== null && folderIdx !== undefined && folderIdx !== 'null') {
    currentUser.folders[section][folderIdx].files.splice(fileIdx, 1);
  } else {
    currentUser.files[section].splice(fileIdx, 1);
  }
  saveUser();
  renderFileSection(section);
}

function downloadFile(section, folderIdx, fileIdx) {
  let f;
  if (folderIdx !== null && folderIdx !== undefined && folderIdx !== 'null') {
    f = currentUser.folders[section][folderIdx].files[fileIdx];
  } else {
    f = currentUser.files[section][fileIdx];
  }
  if (!f || !f.dataUrl) return alert('File data not available.');
  const a = document.createElement('a');
  a.href = f.dataUrl;
  a.download = f.name;
  a.click();
}

function sendSingleFile(section, folderIdx, fileIdx) {
  let f;
  if (folderIdx !== null && folderIdx !== undefined && folderIdx !== 'null') {
    f = currentUser.folders[section][folderIdx].files[fileIdx];
  } else {
    f = currentUser.files[section][fileIdx];
  }
  const recipient = prompt('Enter recipient email address:');
  if (!recipient) return;
  doSendFiles([f], recipient.trim().toLowerCase());
}

function sendSelectedFiles(section) {
  const emailInput = document.getElementById('sendEmail' + capitalize(section));
  const recipient = emailInput ? emailInput.value.trim().toLowerCase() : '';
  if (!recipient) return showToast('Enter a recipient email first.', 'Missing Email');

  const checkboxes = document.querySelectorAll(`#${section}Area .file-check:checked`);
  if (!checkboxes.length) return showToast('Select at least one file to send.', 'No Files Selected');

  const files = [];
  checkboxes.forEach(cb => {
    const ref = cb.id.replace(`chk-${section}-`, '').split(',');
    const fi = parseInt(ref[0]);
    const idx = parseInt(ref[1]);
    let f;
    if (!isNaN(fi) && ref[0] !== 'null') {
      f = currentUser.folders[section][fi]?.files[idx];
    } else {
      f = currentUser.files[section][idx];
    }
    if (f) files.push(f);
  });

  if (!files.length) return;
  doSendFiles(files, recipient);
  if (emailInput) emailInput.value = '';
  checkboxes.forEach(cb => cb.checked = false);
}

function doSendFiles(files, recipientEmail) {
  const users = DB.get('celvra_users') || {};
  if (!users[recipientEmail]) return showToast(`No Celvra user found at ${recipientEmail}`, 'User Not Found');

  const notif = {
    id: Date.now() + Math.random(),
    type: 'incoming',
    from: currentUser.username,
    fromEmail: currentUser.email,
    files: files,
    date: Date.now(),
    read: false
  };

  users[recipientEmail].notifications = users[recipientEmail].notifications || [];
  users[recipientEmail].notifications.unshift(notif);
  DB.set('celvra_users', users);

  // If sending to yourself
  if (recipientEmail === currentUser.email) {
    currentUser = users[currentUser.email];
    DB.set('celvra_session', currentUser.email);
    checkIncomingNotifs();
  }

  showToast(`Files sent to ${users[recipientEmail].username}!`, 'Files Sent ✓');
}

// ==================== TRANSFER PAGE ====================
function handleTransferSelect(event) {
  transferFiles = Array.from(event.target.files);
  document.getElementById('transferLabel').textContent = transferFiles.length
    ? `${transferFiles.length} file(s) selected`
    : 'Click to choose files';
}

function doTransfer() {
  const email = document.getElementById('transferEmail').value.trim().toLowerCase();
  const msg = document.getElementById('transferMsg');
  msg.className = 'auth-msg';

  if (!email) return showMsg(msg, 'Enter recipient email.', 'error');
  if (!transferFiles.length) return showMsg(msg, 'Select at least one file.', 'error');

  const users = DB.get('celvra_users') || {};
  if (!users[email]) return showMsg(msg, 'No Celvra account with that email.', 'error');

  // Read all files, then send
  let loaded = 0;
  const fileDatas = [];
  transferFiles.forEach(f => {
    const reader = new FileReader();
    reader.onload = e => {
      fileDatas.push({ name: f.name, size: f.size, type: f.type, date: Date.now(), dataUrl: e.target.result });
      loaded++;
      if (loaded === transferFiles.length) {
        doSendFiles(fileDatas, email);
        showMsg(msg, `✓ Sent ${fileDatas.length} file(s) to ${users[email].username}!`, 'success');
        document.getElementById('transferEmail').value = '';
        document.getElementById('transferInput').value = '';
        transferFiles = [];
        document.getElementById('transferLabel').textContent = 'Click to choose files';
      }
    };
    reader.readAsDataURL(f);
  });
}

// ==================== INCOMING NOTIFICATIONS ====================
function checkIncomingNotifs() {
  const users = DB.get('celvra_users') || {};
  const fresh = users[currentUser.email];
  if (!fresh) return;
  const unread = (fresh.notifications || []).filter(n => n.type === 'incoming' && !n.read && !n.shown);
  if (unread.length) {
    currentUser = fresh;
    DB.set('celvra_session', currentUser.email);
    unread.forEach(n => {
      n.shown = true;
      // show modal for first incoming
    });
    // Save shown state
    users[currentUser.email] = currentUser;
    DB.set('celvra_users', users);

    const first = unread[0];
    showIncomingModal(first);
    renderNotifBadge();

    // Play sound
    try { document.getElementById('notifSound').play(); } catch(e) {}

    // Show toast
    showToast(`You received ${first.files.length} file(s) from ${first.from}`, 'New Files Received 📦');
  }
}

function showIncomingModal(notif) {
  document.getElementById('incomingTitle').textContent = `You received files from ${notif.from}`;
  document.getElementById('incomingBody').textContent = `${notif.files.length} file(s) sent to you`;
  document.getElementById('incomingFiles').innerHTML = notif.files.map(f => `
    <div class="modal-file-item"><i class="${fileIcon(f.name, guessSection(f))}"></i>${f.name}</div>
  `).join('');
  pendingIncoming = notif;
  document.getElementById('incomingModal').classList.remove('hidden');
}

function acceptIncoming() {
  if (!pendingIncoming) return;
  const users = DB.get('celvra_users') || {};

  pendingIncoming.files.forEach(f => {
    const section = guessSection(f);
    currentUser.files[section] = currentUser.files[section] || [];
    currentUser.files[section].push({...f, date: Date.now()});
  });

  // Mark notification as read
  const notifs = currentUser.notifications || [];
  const idx = notifs.findIndex(n => n.id === pendingIncoming.id);
  if (idx >= 0) notifs[idx].read = true;
  currentUser.notifications = notifs;

  users[currentUser.email] = currentUser;
  DB.set('celvra_users', users);
  pendingIncoming = null;

  closeModal('incomingModal');
  renderNotifBadge();
  showToast('Files saved to your vault!', 'Files Accepted ✓');
}

function guessSection(f) {
  const name = f.name.toLowerCase();
  const type = (f.type || '').toLowerCase();
  if (type.startsWith('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return 'photos';
  if (type.startsWith('video') || /\.(mp4|mkv|avi|mov|webm)$/.test(name)) return 'videos';
  if (type.startsWith('audio') || /\.(mp3|wav|flac|aac|ogg)$/.test(name)) return 'music';
  if (/\.vcf$/.test(name)) return 'contacts';
  return 'documents';
}

// ==================== NOTIFICATIONS ====================
function renderNotifications() {
  const list = document.getElementById('notifList');
  const notifs = (currentUser.notifications || []).slice().reverse();
  if (!notifs.length) {
    list.innerHTML = '<p class="empty-state"><i class="fa-solid fa-bell-slash"></i> No notifications</p>';
    return;
  }
  list.innerHTML = notifs.map((n, i) => `
    <div class="notif-item ${n.read ? '' : 'unread'}" id="notif-${i}">
      ${!n.read ? '<div class="notif-dot-indicator"></div>' : '<div style="width:8px"></div>'}
      <div class="notif-body">
        <div class="notif-title">${n.type === 'incoming' ? `📦 Files from ${n.from}` : '🔔 Notification'}</div>
        <div class="notif-text">${n.files ? n.files.map(f=>f.name).join(', ') : ''}</div>
        <div class="notif-time">${formatDate(n.date)}</div>
      </div>
      <div class="notif-actions">
        ${n.type === 'incoming' && !n.read ? `<button class="icon-btn dl" title="Accept" onclick="acceptFromNotif(${notifs.length-1-i})"><i class="fa-solid fa-check"></i></button>` : ''}
        <button class="icon-btn del" title="Delete" onclick="deleteNotif(${notifs.length-1-i})"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');
}

function acceptFromNotif(idx) {
  const notif = currentUser.notifications[idx];
  if (!notif) return;
  pendingIncoming = notif;
  acceptIncoming();
  renderNotifications();
}

function deleteNotif(idx) {
  currentUser.notifications.splice(idx, 1);
  saveUser();
  renderNotifications();
  renderNotifBadge();
}

function clearAllNotifs() {
  if (!confirm('Clear all notifications?')) return;
  currentUser.notifications = [];
  saveUser();
  renderNotifications();
  renderNotifBadge();
}

function renderNotifBadge() {
  const count = (currentUser.notifications || []).filter(n => !n.read).length;
  const badge = document.getElementById('sbBadge');
  const dot = document.getElementById('topDot');
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.remove('hidden');
    dot.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
    dot.classList.add('hidden');
  }
}

// ==================== LINKS ====================
function addLink() {
  const name = document.getElementById('linkName').value.trim();
  const url = document.getElementById('linkUrl').value.trim();
  if (!name || !url) return alert('Enter link name and URL.');
  if (!/^https?:\/\/.+/.test(url)) return alert('URL must start with http:// or https://');
  currentUser.links = currentUser.links || [];
  currentUser.links.push({ name, url, date: Date.now() });
  saveUser();
  document.getElementById('linkName').value = '';
  document.getElementById('linkUrl').value = '';
  renderLinks();
}

function deleteLink(i) {
  currentUser.links.splice(i, 1);
  saveUser();
  renderLinks();
}

function renderLinks() {
  const area = document.getElementById('linksArea');
  const links = currentUser.links || [];
  if (!links.length) { area.innerHTML = '<p class="empty-state"><i class="fa-solid fa-link"></i> No links saved yet.</p>'; return; }
  area.innerHTML = links.map((l, i) => `
    <div class="link-card">
      <i class="fa-solid fa-link"></i>
      <div class="link-card-info">
        <div class="link-card-name">${escHtml(l.name)}</div>
        <div class="link-card-url">${escHtml(l.url)}</div>
      </div>
      <a href="${escHtml(l.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open</a>
      <button class="icon-btn del" onclick="deleteLink(${i})"><i class="fa-solid fa-trash"></i></button>
    </div>`).join('');
}

// ==================== TOAST ====================
function showToast(body, title = 'Celvra') {
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastBody').textContent = body;
  const t = document.getElementById('toastNotif');
  t.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  document.getElementById('toastNotif').classList.add('hidden');
}

// ==================== MODALS ====================
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ==================== HELPERS ====================
function saveUser() {
  const users = DB.get('celvra_users') || {};
  users[currentUser.email] = currentUser;
  DB.set('celvra_users', users);
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'auth-msg ' + type;
}

function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
  return (b/(1024*1024)).toFixed(1) + ' MB';
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function escHtml(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

function sectionColor(section) {
  const map = { photos:'#00f5c4', videos:'#7b5ea7', music:'#ff9f43', contacts:'#54a0ff', documents:'#ff6b6b' };
  return map[section] || '#8892a4';
}

function fileIcon(name, section) {
  const n = (name||'').toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(n)) return 'fa-solid fa-image';
  if (/\.(mp4|mkv|avi|mov|webm)$/.test(n)) return 'fa-solid fa-film';
  if (/\.(mp3|wav|flac|aac|ogg)$/.test(n)) return 'fa-solid fa-music';
  if (/\.vcf$/.test(n)) return 'fa-solid fa-address-card';
  if (/\.pdf$/.test(n)) return 'fa-solid fa-file-pdf';
  if (/\.(doc|docx)$/.test(n)) return 'fa-solid fa-file-word';
  if (/\.(xls|xlsx)$/.test(n)) return 'fa-solid fa-file-excel';
  if (/\.txt$/.test(n)) return 'fa-solid fa-file-lines';
  if (/\.apk$/.test(n)) return 'fa-brands fa-android';
  if (/\.exe$/.test(n)) return 'fa-brands fa-windows';
  if (section === 'photos') return 'fa-solid fa-image';
  if (section === 'videos') return 'fa-solid fa-film';
  if (section === 'music') return 'fa-solid fa-music';
  return 'fa-solid fa-file';
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('incomingModal');
    closeModal('folderModal');
    hideToast();
    closeSidebar();
  }
});

// ==================== ENTER KEY FOR FORMS ====================
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.activeElement.id === 'loginEmail' || document.activeElement.id === 'loginPass') doLogin();
    if (document.activeElement.id === 'regUsername' || document.activeElement.id === 'regEmail' || document.activeElement.id === 'regPass') doRegister();
    if (document.activeElement.id === 'folderNameInput') confirmFolder();
  }
});
