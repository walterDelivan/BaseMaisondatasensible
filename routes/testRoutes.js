const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ mensaje: '¡Backend funcionando!' });
});

module.exports = router;