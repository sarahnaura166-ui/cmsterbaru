const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const app = express();
// Batas body dinaikkan agar konten panjang tidak memicu error 413 (payload too large)
app.use(express.json({ limit: '2mb' }));

// Fallback: baca file service account bila variabel environment belum tersedia
// (misalnya saat di-deploy ke Vercel tanpa menambahkan environment variables)
function getServiceAccountFromFile() {
  try {
    return require('../cmsterbaru-firebase-adminsdk-fbsvc-f688567eb0.json');
  } catch (error) {
    return null;
  }
}

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

  let credential;

  if (missingEnv.length === 0) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  } else {
    const serviceAccount = getServiceAccountFromFile();
    if (!serviceAccount) {
      throw new Error(
        `Konfigurasi Firebase belum lengkap: ${missingEnv.join(', ')}. ` +
        'Isi variabel tersebut di .env (lokal) atau di pengaturan environment Vercel, ' +
        'atau letakkan file service account di root project.'
      );
    }
    console.warn(`Variabel Firebase tidak tersedia (${missingEnv.join(', ')}). Menggunakan file service account.`);
    credential = admin.credential.cert(serviceAccount);
  }

  admin.initializeApp({ credential });

  return admin.firestore();
}

function sendApiError(res, message, error) {
  console.error(message, error);
  res.status(500).json({ error: (error && error.message) || message });
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

// ====== AUTO GENERATED CONTENT ======
// Generator draf otomatis berbasis template (tanpa layanan eksternal / API key,
// jadi langsung pakai di lokal maupun Vercel). Hasilnya hanya DRAF yang diisi
// ke form admin, tetap diperiksa dan disimpan manual lewat tombol Simpan.

function sanitizeTopic(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 80);
}

function pickOne(items) {
  return items[Math.floor(Math.random() * items.length)];
}

const DEFAULT_TOPICS = [
  'menulis produktif',
  'membaca buku',
  'nutrisi mindset',
  'kebiasaan menulis harian',
  'mengelola konten blog',
];

function buildGeneratedTitle(topic) {
  const patterns = [
    (t) => `${t}: Menulis dan Membaca Itu Nutrisi Mindset`,
    (t) => `5 Tips ${t} untuk Pemula`,
    (t) => `Cara Memulai ${t} dengan Konsisten`,
    (t) => `Mengapa ${t} Penting untuk Mental Bugar`,
    (t) => `Panduan Singkat ${t} dalam Sehari`,
  ];
  return pickOne(patterns)(topic);
}

function buildGeneratedContent(topic) {
  const openings = [
    (t) => `Menulis dan membaca itu nutrisi mindset, dan ${t} adalah salah satu cara paling sederhana untuk memanennya.\n\nArtikel ini masih berupa draf otomatis. Silakan sunting agar terasa seperti suara Anda sendiri.`,
    (t) => `Banyak orang menunda karena ingin langsung sempurna. Padahal untuk mulai ${t}, langkah kecil yang konsisten jauh lebih penting daripada sempurna.\n\nGanti bagian di bawah ini dengan pengalaman Anda agar tulisan lebih hidup.`,
    (t) => `Setiap tulisan yang terbit dimulai dari baris pertama yang berani ditulis. Topik ${t} bisa jadi pintu masuknya.\n\nEdit draf ini sesuai gaya dan tujuan Anda sebelum menekan Simpan.`,
  ];
n  const points = [
    (t) => `1. Mulai dari yang kecil: cukup 15-30 menit sehari untuk ${t}.\n2. Catat ide begitu muncul supaya tidak hilang saat butuh.\n3. Baca kembali tulisanmu minggu lalu, lalu perbaiki sedikit demi sedikit.`,
    (t) => `1. Tetapkan tujuan yang jelas untuk ${t} dalam satu minggu ke depan.\n2. Kurangi gangguan: satu ruangan tenang sudah cukup.\n3. Bagikan hasilnya agar mendapat masukan yang membangun.`,
    (t) => `1. Pilih satu fokus utama dulu, jangan semuanya sekaligus.\n2. Latih rutin dengan ritme yang nyaman, bukan kewalahan.\n3. Evaluasi tiap akhir pekan, sesuaikan pendekatannya.`,
  ];
n  const closings = [
    `Penutup: ulangi poin-poin di atas dengan kata-katamu sendiri, lalu tambahkan ajakan singkat bagi pembaca untuk mencobanya juga.`,
    `Penutup: akhiri dengan satu kalimat yang mudah diingat pembaca tentang topik ini.`,
  ];
n  return `${pickOne(openings)(topic)}\n\n${pickOne(points)(topic)}\n\n${pickOne(closings)}`;
}

// Route: Membuat Draf Konten Otomatis (dipakai tombol "Generate Otomatis" di admin)
app.post('/api/generate', (req, res) => {
  try {
    const topic = sanitizeTopic(req.body && req.body.topic) || pickOne(DEFAULT_TOPICS);
    const generated = {
      title: buildGeneratedTitle(topic),
      content: buildGeneratedContent(topic),
    };
    res.status(200).json(generated);
  } catch (error) {
    sendApiError(res, 'Gagal membuat draf otomatis.', error);
  }
});

// Route: Mengambil Daftar Konten dari Firestore (dipakai halaman publish & admin)
app.get('/api/posts', async (req, res) => {
  try {
    const snapshot = await getDb().collection('posts').get();
    // Diurutkan di aplikasi agar postingan tanpa field createdAt tetap ikut dimuat
    const posts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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