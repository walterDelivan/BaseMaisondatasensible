// models/admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nombre: { type: String },
  rol: { type: String, default: 'admin' }
});

// 👇 Tercer parámetro: nombre exacto de la colección
module.exports = mongoose.model('Admin', adminSchema, 'admin');
