// Route filesystem Vercel untuk /api/posts (GET daftar & POST konten Baru).
// Dengan file ini, Vercel melayani endpoint langsung tanpa bergantung pada
// konfigurasi rewrite di vercel.json (rewrite tetap ada sebagai cadangan).
// Handler-nya sama persis dengan aplikasi Express di api/index.js.
module.exports = require('./index.js');