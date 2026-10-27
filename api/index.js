const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

function getDb() {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const requiredEnv = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]?.trim());

  if (missingEnv.length) {
    throw new Error(`Konfigurasi Firebase belum lengkap: ${missingEnv.join(', ')}`);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  return admin.firestore();
}

function sendApiError(res, message, error) {
  console.error(message, error);
  res.status(500).json({ error: error.message || message });
}

function isValidPostBody(body) {
  const { title, content } = body || {};
  return (
    typeof title === 'string' && title.trim() &&
    typeof content === 'string' && content.trim()
  );
}

// Halaman admin (area admin), terpisah dari area publish di '/'
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

// Middleware untuk menyajikan file statis dari folder 'public' (agar index.html bisa diakses di root '/')
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Route: Mengambil Daftar Konten dari Firestore (dipakai halaman publish & admin)
app.get('/api/posts', async (req, res) => {
  try {
    const snapshot = await getDb().collection('posts').orderBy('createdAt', 'desc').get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(posts);
  } catch (error) {
    sendApiError(res, 'Gagal mengambil postingan dari Firestore.', error);
  }
});

// Route: Mengambil Satu Konten (dipakai admin saat memuat data ke form)
app.get('/api/posts/:id', async (req, res) => {
  try {
    const doc = await getDb().collection('posts').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    sendApiError(res, 'Gagal mengambil postingan dari Firestore.', error);
  }
});

// Route: Menambah Konten Baru
app.post('/api/posts', async (req, res) => {
  try {
    if (!isValidPostBody(req.body)) {
      return res.status(400).json({ error: 'Judul dan konten wajib diisi.' });
    }

    const title = req.body.title.trim();
    const content = req.body.content.trim();
    const now = new Date().toISOString();
    const newPost = { title, content, createdAt: now, updatedAt: now };
    const docRef = await getDb().collection('posts').add(newPost);
    res.status(201).json({ id: docRef.id, ...newPost });
  } catch (error) {
    sendApiError(res, 'Gagal menyimpan postingan ke Firestore.', error);
  }
});

// Route: Mengubah Konten yang Sudah Ada (data dimuat admin lalu disimpan kembali)
app.put('/api/posts/:id', async (req, res) => {
  try {
    if (!isValidPostBody(req.body)) {
      return res.status(400).json({ error: 'Judul dan konten wajib diisi.' });
    }

    const ref = getDb().collection('posts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
    }

    const updatedPost = {
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      updatedAt: new Date().toISOString(),
    };
    await ref.update(updatedPost);
    res.status(200).json({ id: ref.id, ...doc.data(), ...updatedPost });
  } catch (error) {
    sendApiError(res, 'Gagal memperbarui postingan di Firestore.', error);
  }
});

// Route: Menghapus Konten
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const ref = getDb().collection('posts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
    }

    await ref.delete();
    res.status(200).json({ id: req.params.id, deleted: true });
  } catch (error) {
    sendApiError(res, 'Gagal menghapus postingan dari Firestore.', error);
  }
});

// Export untuk Vercel Serverless Function
module.exports = app;

// Jalankan server lokal jika tidak di Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server CMS berjalan di http://localhost:${PORT}`);
  });
}