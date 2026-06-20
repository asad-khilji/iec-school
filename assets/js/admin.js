const STORAGE_KEY = 'isnjIecAdmin';
const SESSION_KEY = 'isnjIecAdminSession';
const DEFAULT_ADMIN_URL = '../data/admin.json';

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loadAdmin() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  const response = await fetch(DEFAULT_ADMIN_URL);
  const data = await response.json();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.admin));
  return data.admin;
}

function saveAdmin(admin) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(admin));
}

function setMessage(id, text, type) {
  const box = document.getElementById(id);
  if (!box) return;
  box.textContent = text;
  box.className = type || '';
  box.hidden = !text;
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function requireLogin() {
  if (!isLoggedIn()) window.location.href = 'login.html';
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
}

function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.target);
      input.type = input.type === 'password' ? 'text' : 'password';
      button.textContent = input.type === 'password' ? 'Show' : 'Hide';
    });
  });
}

function passwordScore(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function setupStrengthMeter() {
  const password = document.getElementById('newPassword');
  const meter = document.querySelector('.strength span');
  const rules = document.querySelectorAll('[data-rule]');
  if (!password || !meter) return;
  password.addEventListener('input', () => {
    const value = password.value;
    const score = passwordScore(value);
    meter.style.width = `${(score / 5) * 100}%`;
    meter.style.background = score < 3 ? '#9b1c1c' : score < 5 ? '#d8a432' : '#136b3a';
    rules.forEach(rule => {
      const ok = rule.dataset.rule === 'length' ? value.length >= 8 :
        rule.dataset.rule === 'upper' ? /[A-Z]/.test(value) :
        rule.dataset.rule === 'lower' ? /[a-z]/.test(value) :
        rule.dataset.rule === 'number' ? /\d/.test(value) : /[^A-Za-z0-9]/.test(value);
      rule.classList.toggle('ok', ok);
    });
  });
}

async function setupLogin() {
  setupPasswordToggles();
  const form = document.getElementById('loginForm');
  if (!form) return;
  const admin = await loadAdmin();
  document.getElementById('email').value = admin.email;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const hash = await sha256(password);
    if (email === admin.email.toLowerCase() && hash === admin.passwordHash) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      window.location.href = 'index.html';
    } else {
      setMessage('loginMessage', 'Invalid email or password.', 'error');
    }
  });
}

async function setupPasswordPage() {
  requireLogin();
  setupPasswordToggles();
  setupStrengthMeter();
  const form = document.getElementById('passwordForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const admin = await loadAdmin();
    if (await sha256(currentPassword) !== admin.passwordHash) return setMessage('passwordMessage', 'Current password is incorrect.', 'error');
    if (newPassword.length < 8) return setMessage('passwordMessage', 'New password must be at least 8 characters.', 'error');
    if (newPassword !== confirmPassword) return setMessage('passwordMessage', 'New passwords do not match.', 'error');
    admin.passwordHash = await sha256(newPassword);
    saveAdmin(admin);
    form.reset();
    document.querySelector('.strength span').style.width = '0';
    document.querySelectorAll('[data-rule]').forEach(rule => rule.classList.remove('ok'));
    setMessage('passwordMessage', 'Password changed successfully in this browser.', 'success');
  });
}

function setupProtectedPage() {
  requireLogin();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'login') setupLogin();
  if (document.body.dataset.page === 'password') setupPasswordPage();
  if (document.body.dataset.page === 'dashboard') setupProtectedPage();
  document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', logout));
});
