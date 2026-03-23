const express = require('express');
const router = express.Router();

// Importás el controlador para usar sus funciones
const { crearPropiedad, actualizarPropiedad } = require('../controllers/propiedadController');

// Ruta POST para crear nueva propiedad
router.post('/nueva', crearPropiedad);

// Ruta PUT para actualizar propiedad por id
router.put('/:id', actualizarPropiedad);

module.exports = router;
