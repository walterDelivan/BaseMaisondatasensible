// routes/admin/ninja-tuna.js
const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Admin = require('../../models/admin'); // ✅ Modelo correcto
// verificar-admin.js

// GET /admin/2fa/setup → Genera QR del código 2FA
router.get('/2fa/setup', async (req, res) => {
  try {
    const secret = process.env.ADMIN_2FA_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Secreto 2FA no configurado en .env' });
    }

    const otpauthURL = speakeasy.otpauthURL({
      secret,
      label: 'MaisonState(Admin)',
      issuer: 'MaisonState',
      encoding: 'base32'
    });

    const qrCodeDataURL = await qrcode.toDataURL(otpauthURL);
    res.json({ qrCodeDataURL });
  } catch (err) {
    console.error('Error generando QR 2FA:', err);
    res.status(500).json({ error: 'Error generando QR' });
  }
});
router.post('/login', [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').trim().notEmpty().withMessage('La contraseña es obligatoria'),
  body('codigo2FA').trim().isLength({ min: 6, max: 6 }).withMessage('Código 2FA inválido')
], async (req, res) => {
  console.log('🔐 Intento de login recibido');
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    console.log('❌ Errores de validación:', errores.array());
    return res.status(400).json({ success: false, errores: errores.array() });
  }

  const { email, password, codigo2FA } = req.body;
  console.log('📧 Email recibido:', email);

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('❌ Admin no encontrado');
      return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
    }

    const passwordOk = await bcrypt.compare(password, admin.password);
    console.log('🔑 Contraseña válida?', passwordOk);

    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
    }

    if (admin.rol !== 'admin') {
      console.log('🚫 Rol no permitido:', admin.rol);
      return res.status(403).json({ success: false, message: 'Acceso denegado: solo administradores' });
    }

    const esCodigoValido = speakeasy.totp.verify({
      secret: process.env.ADMIN_2FA_SECRET,
      encoding: 'base32',
      token: codigo2FA,
      window: 1
    });

    console.log('✅ Código 2FA válido?', esCodigoValido);

    if (!esCodigoValido) {
      return res.status(401).json({ success: false, message: 'Código 2FA inválido' });
    }

    req.session.usuario = {
      _id: admin._id,
      nombre: admin.nombre,
      email: admin.email,
      rol: admin.rol
    };

    console.log('🎉 Login admin exitoso');

    // 🔁 Redirección automática después del login (si se intentó visitar una ruta protegida)
    const destino = req.session.returnTo || '/admin/dashboard';
    delete req.session.returnTo;

    // 👉 Redirige con status 200 y destino deseado
res.json({
  success: true,
  message: 'Acceso admin concedido',
  redirectTo: req.session.returnTo || '/admin/dashboard'
});
delete req.session.returnTo;

  } catch (err) {
    console.error('💥 Error en login admin:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


module.exports = router;
