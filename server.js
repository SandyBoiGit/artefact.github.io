const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { users: [], posts: [], pending: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return { users: [], posts: [], pending: [], ...parsed };
  } catch (e) {
    return { users: [], posts: [], pending: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function publicUser(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    role: user.role,
    verified: user.verified,
  };
}

app.post('/api/register', (req, res) => {
  const { nickname, email, password } = req.body || {};
  if (!nickname || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const data = loadData();
  if (data.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already exists' });
  }
  const user = {
    id: 'u_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    nickname,
    email,
    passwordHash: hashPassword(password),
    role: data.users.length === 0 ? 'admin' : 'user',
    verified: false,
  };
  data.users.push(user);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  data.pending = data.pending.filter((p) => p.email !== email);
  data.pending.push({ email, code });
  saveData(data);

  res.json({ ok: true, code });
});

app.post('/api/verify', (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'Missing fields' });
  const data = loadData();
  const pending = data.pending.find((p) => p.email === email);
  if (!pending || pending.code !== code) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  const user = data.users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.verified = true;
  data.pending = data.pending.filter((p) => p.email !== email);
  saveData(data);
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const data = loadData();
  const user = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ ok: true, user: publicUser(user) });
});

app.get('/api/posts', (req, res) => {
  const data = loadData();
  res.json({ posts: data.posts });
});

app.post('/api/posts', (req, res) => {
  const { title, content, authorId } = req.body || {};
  if (!title || !content || !authorId) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const data = loadData();
  const user = data.users.find((u) => u.id === authorId);
  if (!user || user.role !== 'admin' || !user.verified) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const post = {
    id: 'p_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    title,
    content,
    author: user.nickname,
    authorRole: user.role,
    createdAt: new Date().toISOString(),
    comments: [],
  };
  data.posts.push(post);
  saveData(data);
  res.json({ ok: true, post });
});

app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, authorId } = req.body || {};
  const data = loadData();
  const user = data.users.find((u) => u.id === authorId);
  if (!user || user.role !== 'admin' || !user.verified) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const post = data.posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (title) post.title = title;
  if (content) post.content = content;
  saveData(data);
  res.json({ ok: true, post });
});

app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { authorId } = req.body || {};
  const data = loadData();
  const user = data.users.find((u) => u.id === authorId);
  if (!user || user.role !== 'admin' || !user.verified) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const before = data.posts.length;
  data.posts = data.posts.filter((p) => p.id !== id);
  if (data.posts.length === before) return res.status(404).json({ error: 'Post not found' });
  saveData(data);
  res.json({ ok: true });
});

app.post('/api/posts/:id/comments', (req, res) => {
  const { id } = req.params;
  const { authorId, content } = req.body || {};
  if (!authorId || !content) return res.status(400).json({ error: 'Missing fields' });
  const data = loadData();
  const user = data.users.find((u) => u.id === authorId);
  if (!user || !user.verified) return res.status(403).json({ error: 'Forbidden' });
  const post = data.posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const comment = {
    id: 'c_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    author: user.nickname,
    authorRole: user.role,
    content,
    createdAt: new Date().toISOString(),
  };
  post.comments.push(comment);
  saveData(data);
  res.json({ ok: true, comment });
});

app.listen(PORT, () => {
  console.log(`Artefact backend running on http://localhost:${PORT}`);
});
