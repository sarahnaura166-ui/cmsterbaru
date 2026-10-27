// Route filesystem Vercel untuk /api/posts/:id (GET detail, PUT ubah, DELETE hapus).
// Handler-nya sama persis dengan aplikasi Express di api/index.js, sehingga
// Express menerima path lengkap /api/posts/<id> dan cocok dengan route :id.
module.exports = require('../index.js');