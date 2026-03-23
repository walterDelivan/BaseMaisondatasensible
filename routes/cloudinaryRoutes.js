// routes/cloudinaryRoutes.js
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dfqzk9mnm',
  api_key: '124773411722971',
  api_secret: 'KFlDos064hJQovTD7J4SRYHOg7w',
});

// Configuración de multer en memoria
const upload = multer({ storage: multer.memoryStorage() });

// 📤 Ruta para subir comprobante
router.post('/api/subir-comprobante', upload.single('comprobante'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });

  const stream = cloudinary.uploader.upload_stream(
    { folder: 'comprobantes' },
    (error, result) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({
        url: result.secure_url,
        public_id: result.public_id
      });
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
});

// 📌 Ruta para eliminar imagen
router.post('/api/eliminar-imagen', async (req, res) => {
  const { public_id } = req.body;
  
  if (!public_id) {
    return res.status(400).json({ error: "Falta 'public_id'" });
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id);
    res.json({ message: 'Imagen eliminada', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
