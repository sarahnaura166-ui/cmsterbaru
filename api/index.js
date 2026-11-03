const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\r?\n/g, '\n'),
  }),
});

const db = admin.firestore();

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
    const snapshot = await db.collection('posts').get();
    // Diurutkan di aplikasi agar postingan tanpa field createdAt tetap ikut dimuat
    const posts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.status(200).json(posts);
  } catch (error) {
    console.error('Gagal mengambil postingan dari Firestore.', error);
    res.status(500).json({ error: 'Gagal mengambil postingan dari Firestore.' });
  }
});

// Route: Mengambil Satu Konten (dipakai admin saat memuat data ke form)
app.get('/api/posts/:id', async (req, res) => {
  try {
    const doc = await db.collection('posts').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Gagal mengambil postingan dari Firestore.', error);
    res.status(500).json({ error: 'Gagal mengambil postingan dari Firestore.' });
  }
});

// Route: Menambah Konten Baru
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content } = req.body || {};
    if (typeof title !== 'string' || !title.trim() || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Judul dan konten wajib diisi.' });
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const now = new Date().toISOString();
    const newPost = { title: trimmedTitle, content: trimmedContent, createdAt: now, updatedAt: now };
    const docRef = await db.collection('posts').add(newPost);
    res.status(201).json({ id: docRef.id, ...newPost });
  } catch (error) {
    console.error('Gagal menyimpan postingan ke Firestore.', error);
    res.status(500).json({ error: 'Gagal menyimpan postingan ke Firestore.' });
  }
});

// Route: Mengubah Konten yang Sudah Ada (data dimuat admin lalu disimpan kembali)
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { title, content } = req.body || {};
    if (typeof title !== 'string' || !title.trim() || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Judul dan konten wajib diisi.' });
    }

    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
    }

    const updatedPost = {
      title: title.trim(),
      content: content.trim(),
      updatedAt: new Date().toISOString(),
    };
    await ref.update(updatedPost);
    res.status(200).json({ id: ref.id, ...doc.data(), ...updatedPost });
  } catch (error) {
    console.error('Gagal memperbarui postingan di Firestore.', error);
    res.status(500).json({ error: 'Gagal memperbarui postingan di Firestore.' });
  }
});

// Route: Menghapus Konten
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan.' });
    }

    await ref.delete();
    res.status(200).json({ id: req.params.id, deleted: true });
  } catch (error) {
    console.error('Gagal menghapus postingan dari Firestore.', error);
    res.status(500).json({ error: 'Gagal menghapus postingan dari Firestore.' });
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
