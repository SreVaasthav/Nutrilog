const $ = id => document.getElementById(id);
let mode = 'login';

if (localStorage.getItem('token')) location.href = '/home';

function setMode(m) {
  mode = m;
  $('tabLogin').classList.toggle('active', m === 'login');
  $('tabSignup').classList.toggle('active', m === 'signup');
  $('submit').textContent = m === 'login' ? 'Log in' : 'Create account';
  $('title').textContent = m === 'login' ? 'Welcome back' : 'Join NutriLog';
  $('err').textContent = '';
}
$('tabLogin').onclick = () => setMode('login');
$('tabSignup').onclick = () => setMode('signup');

$('submit').onclick = async () => {
  try {
    const res = await fetch(mode === 'login' ? '/api/login' : '/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $('email').value, password: $('password').value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    localStorage.setItem('token', data.token);
    location.href = '/home';
  } catch (e) { $('err').textContent = e.message; }
};

['email', 'password'].forEach(id =>
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') $('submit').click(); }));
