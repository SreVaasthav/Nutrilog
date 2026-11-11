const $ = id => document.getElementById(id);
const token = localStorage.getItem('token');
if (!token) location.href = '/';

function logout() { localStorage.removeItem('token'); location.href = '/'; }
$('logout').onclick = logout;

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (res.status === 401) logout();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

async function loadMeals() {
  const meals = await api('/api/meals');
  const sum = k => Math.round(meals.reduce((a, m) => a + m[k], 0) * 10) / 10;
  $('tCal').textContent = sum('calories');
  $('tP').textContent = sum('protein');
  $('tC').textContent = sum('carbs');
  $('tF').textContent = sum('fat');
  $('list').innerHTML = meals.map(m => `<tr><td>${m.food}</td><td>${m.grams}</td><td>${m.calories}</td>
    <td>${m.protein}</td><td>${m.carbs}</td><td>${m.fat}</td>
    <td><button class="x" onclick="del('${m._id}')">✕</button></td></tr>`).join('');
}

$('add').onclick = async () => {
  $('err2').textContent = '';
  try {
    await api('/api/meals', 'POST', { food: $('food').value, grams: $('grams').value });
    $('food').value = ''; $('grams').value = '';
    loadMeals();
  } catch (e) { $('err2').textContent = e.message; }
};

async function del(id) { await api('/api/meals/' + id, 'DELETE'); loadMeals(); }

(async () => {
  const foods = await api('/api/foods');
  $('foodlist').innerHTML = foods.map(f => `<option value="${f}">`).join('');
  loadMeals();
})();
