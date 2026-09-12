const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const errorBox = document.getElementById('form-error');

function showTab(which) {
  const isLogin = which === 'login';
  tabLogin.classList.toggle('active', isLogin);
  tabSignup.classList.toggle('active', !isLogin);
  tabLogin.setAttribute('aria-selected', isLogin);
  tabSignup.setAttribute('aria-selected', !isLogin);
  loginForm.hidden = !isLogin;
  signupForm.hidden = isLogin;
  hideError();
}

tabLogin.addEventListener('click', () => showTab('login'));
tabSignup.addEventListener('click', () => showTab('signup'));

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}
function hideError() {
  errorBox.hidden = true;
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function setLoading(form, loading) {
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = loading;
  btn.textContent = loading
    ? 'Please wait…'
    : (form === loginForm ? 'Sign in' : 'Create account');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  setLoading(loginForm, true);
  try {
    const { user } = await postJSON('/api/auth/login', { email, password });
    onAuthSuccess(user);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(loginForm, false);
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  setLoading(signupForm, true);
  try {
    const { user } = await postJSON('/api/auth/signup', { name, email, password });
    onAuthSuccess(user);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(signupForm, false);
  }
});

document.getElementById('google-btn').addEventListener('click', () => {
  showError('Google sign-in wiring is a later step — needs real OAuth credentials from you first.');
});

// onAuthSuccess is defined in practice.js, loaded after this file —
// it takes the logged-in user straight into the Practice screen.

// If there's already a valid session (returning visitor), skip the
// login form entirely instead of making them sign in again.
(async function checkExistingSession() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const { user } = await res.json();
      onAuthSuccess(user);
    }
  } catch {
    // no session — stay on the login/signup screen, nothing to do
  }
})();
