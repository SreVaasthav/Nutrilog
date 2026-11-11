require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nutrilog';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Models ----------
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}));

const Meal = mongoose.model('Meal', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  food: String,
  grams: Number,
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  createdAt: { type: Date, default: Date.now }
}));

// ---------- Nutrition data (per 100 g): [kcal, protein, carbs, fat] ----------
const FOODS = {
  'rice (cooked)': [130, 2.7, 28, 0.3],
  'chicken breast (cooked)': [165, 31, 0, 3.6],
  'banana': [89, 1.1, 22.8, 0.3],
  'egg (boiled)': [155, 13, 1.1, 11],
  'roti / chapati': [297, 9.8, 46, 7.5],
  'dal (cooked)': [116, 9, 20, 0.4],
  'paneer': [265, 18, 1.2, 20],
  'milk (whole)': [61, 3.2, 4.8, 3.3],
  'curd / yogurt': [61, 3.5, 4.7, 3.3],
  'oats (dry)': [389, 16.9, 66, 6.9],
  'apple': [52, 0.3, 13.8, 0.2],
  'potato (boiled)': [87, 1.9, 20, 0.1],
  'peanuts': [567, 26, 16, 49],
  'almonds': [579, 21, 22, 50],
  'bread (white)': [265, 9, 49, 3.2],
  'salmon (cooked)': [206, 22, 0, 12],
  'tofu': [76, 8, 1.9, 4.8],
  'broccoli': [34, 2.8, 7, 0.4],
  'chickpeas (cooked)': [164, 8.9, 27, 2.6],
  'olive oil': [884, 0, 0, 100]
};

// ---------- Auth ----------
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.userId = jwt.verify(token, JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: 'Please log in again.' }); }
}
const sign = u => jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '7d' });

app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6)
      return res.status(400).json({ error: 'Enter an email and a password of 6+ characters.' });
    if (await User.findOne({ email })) return res.status(400).json({ error: 'That email is already registered.' });
    const user = await User.create({ email, password: await bcrypt.hash(password, 10) });
    res.json({ token: sign(user) });
  } catch (e) { res.status(500).json({ error: 'Server error.' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password || '', user.password)))
      return res.status(400).json({ error: 'Wrong email or password.' });
    res.json({ token: sign(user) });
  } catch (e) { res.status(500).json({ error: 'Server error.' }); }
});

// ---------- Food + meals ----------
app.get('/api/foods', (req, res) => res.json(Object.keys(FOODS)));

app.post('/api/meals', auth, async (req, res) => {
  const food = String(req.body.food || '').toLowerCase().trim();
  const grams = Number(req.body.grams);
  if (!(grams > 0)) return res.status(400).json({ error: 'Enter grams greater than 0.' });
  const key = FOODS[food] ? food : Object.keys(FOODS).find(k => k.includes(food) && food.length > 1);
  if (!key) return res.status(404).json({ error: 'Food not found. Pick one from the suggestions.' });
  const [kcal, p, c, f] = FOODS[key], m = grams / 100, r = n => Math.round(n * m * 10) / 10;
  const meal = await Meal.create({ user: req.userId, food: key, grams,
    calories: Math.round(kcal * m), protein: r(p), carbs: r(c), fat: r(f) });
  res.json(meal);
});

app.get('/api/meals', auth, async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  res.json(await Meal.find({ user: req.userId, createdAt: { $gte: start } }).sort({ createdAt: -1 }));
});

app.delete('/api/meals/:id', auth, async (req, res) => {
  await Meal.deleteOne({ _id: req.params.id, user: req.userId });
  res.json({ ok: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'loginregistration.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'Dashboard.html')));

mongoose.connect(MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`NutriLog running at http://localhost:${PORT}`)))
  .catch(err => {
    console.error('Could not connect to MongoDB at', MONGODB_URI);
    console.error('Start MongoDB (brew services start mongodb-community) or put an Atlas URI in .env');
    console.error(err.message);
    process.exit(1);
  });
