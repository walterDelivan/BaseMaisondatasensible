const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

// Definimos el esquema de usuario
const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: function () {
            // Solo requerir contraseña si no es un usuario de Google
            return !this.id_google;
        }
    },
    id_google: {
        type: String,
        default: null,
        unique: true,
        sparse: true // ✅ Permite múltiples null, solo aplica unique si tiene valor
    },
    foto: { type: String, default: null },
    telefono: String,
    termsAcceptedAt: { type: Date }
});

// Middleware para encriptar la contraseña antes de guardar
userSchema.pre('save', async function (next) {
    // Solo encriptar si se modificó la contraseña y existe
    if (!this.isModified('password') || !this.password) return next();

    try {
        const salt = await bcryptjs.genSalt(10);
        this.password = await bcryptjs.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Exportamos el modelo
module.exports = mongoose.model('User', userSchema);
