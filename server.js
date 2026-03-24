// ==========================================
// Módulos necesarios
// ==========================================
const helmet = require("helmet");
const xss = require("xss-clean");
const speakeasy = require('speakeasy');
const crypto = require("crypto");
const rateLimit = require('express-rate-limit');
const mongoSanitize = require("express-mongo-sanitize");
const express = require('express');  // Framework para el servidor
const app = express();  // Creamos la instancia de la aplicación Express
const cron = require('node-cron');
const path = require('path');        // Módulo para gestionar rutas de archivos
const fs = require('fs');            // Módulo para trabajar con el sistema de archivos
const { OAuth2Client } = require('google-auth-library');  // Google OAuth2
const dotenv = require('dotenv');    // Módulo para cargar variables de entorno desde el archivo .env
const passport = require('passport');  // Módulo para la autenticación (Passport)
const GoogleStrategy = require('passport-google-oauth20').Strategy;  // Estrategia de autenticación con Google
const session = require('express-session');  // Módulo para gestionar sesiones en Express
const cors = require('cors');  // Módulo para habilitar CORS
const mongoose = require('mongoose');  // Módulo para trabajar con MongoDB
const User = require('./models/User'); // Importa el modelo de usuario
const bcrypt = require('bcryptjs');
const { OpenAI } = require("openai"); // Cliente oficial de OpenAI

const bodyParser = require('body-parser');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server);
const nodemailer = require('nodemailer'); // Módulo para enviar correos electrónicos
// ==========================================
// Configuración de la aplicación Express
// ==========================================

const port = 777;  // Definimos el puerto donde el servidor va a escuchar

// ==========================================
// Configuración de dotenv (variables de entorno)
// ==========================================
dotenv.config();  // Cargamos las variables de entorno desde un archivo .env





// 🛡️ Seguridad con Helmet
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://cdn.jsdelivr.net',
        'https://widget.cloudinary.com',
        'https://upload-widget.cloudinary.com',
        'https://unpkg.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://cdnjs.cloudflare.com' // <-- agregado para Font Awesome
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com'  // <-- Faltaba aquí

      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://res.cloudinary.com',
        'https://via.placeholder.com',
        'https://unpkg.com',
        'https://www.google-analytics.com',
        'https://a.tile.openstreetmap.org',
        'https://b.tile.openstreetmap.org',
        'https://c.tile.openstreetmap.org',
        'https://lh3.googleusercontent.com',
        'https://flagcdn.com',
        'https://cdn-icons-png.flaticon.com', // <-- agregado
        'https://th.bing.com' // <-- agregado
      ],
      connectSrc: [
        "'self'",
        'https://your.api.com',
        'https://www.google-analytics.com',
      ],
      frameSrc: [
        "'self'",
        "https://www.google.com",
        "https://upload-widget.cloudinary.com"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
    },
  })
);



app.use(xss());               // Limpia HTML malicioso
app.use(mongoSanitize());    // Limpia operadores peligrosos tipo $ne, $gt


const url = require('url');

function esUrlSegura(returnUrl) {
  if (!returnUrl) return false;

  // Permitir URLs relativas (ej: /registro, /dashboard)
  if (returnUrl.startsWith('/')) return true;

  try {
    const parsedUrl = new URL(returnUrl);

    // Permitir si el hostname es localhost o 127.0.0.1
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      return true;
    }

    // También podés agregar tu dominio real:
    // if (parsedUrl.hostname === 'tudominio.com') return true;

  } catch (err) {
    // Si no es URL válida, bloquea
    return false;
  }

  return false; // Si no cumple nada, bloquea
}




// ==========================================
// Configuración de middleware
// ==========================================
app.use(session({
  secret: 'kaketero7777777',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true si usás HTTPS
    maxAge: 1000 * 60 * 60 // 1 hora
  }
}));





app.use(passport.initialize());  // Inicializa Passport para la gestión de sesiones
app.use(passport.session());     // Utiliza la sesión de Passport para mantener al usuario autenticado

app.use(express.json()); // Middleware para analizar JSON en las solicitudes
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: "https://maisonstate.com", 
  // Permite SOLO requests desde tu dominio

  methods: ["GET", "POST", "PUT", "DELETE"], 
  // Métodos HTTP permitidos

  allowedHeaders: ["Content-Type", "Authorization"],
  // Headers que puede enviar el frontend

  credentials: true
  // Permite cookies o headers de sesión si los usás
}));
// Middleware para poder procesar las solicitudes JSON y URL-encoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());  // Si planeas recibir JSON
// ==========================================
// Servir archivos estáticos
// ==========================================
// Limitar velocidad de peticiones a archivos estáticos para evitar abusos
const staticLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 2000, // Aumenta a 100 peticiones por IP por minuto
  message: 'Demasiadas solicitudes a archivos estáticos, intente más tarde.',
});

// Proteger rutas estáticas con limitador
app.use('/assets', staticLimiter, express.static(path.join(__dirname, '../assets'), { maxAge: '30d' }));

app.use('/imagenes', staticLimiter, express.static(path.join(__dirname, '../assets/media/propiedades'), { maxAge: '30d' }));
app.use(staticLimiter, express.static(path.join(__dirname, '../html'), { maxAge: '30d' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// ==========================================
// Configuración de Passport con Google
// ==========================================
passport.serializeUser((user, done) => {
  done(null, user.id_google);  // Serializa al usuario por su ID de Google
});

passport.deserializeUser((id, done) => {
  done(null, { id_google: id });  // Deserializa el usuario usando su ID de Google
});

// ==========================================
// Rutas principales
// ==========================================
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '/../html/about.html'));  // Ruta para la página "About"
});

app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, '/../html/registro.html'));  // Ruta para la página de registro
});
app.get('/politicas', (req, res) => {
  res.sendFile(path.join(__dirname, '/../html/politicas.html'));  // Ruta para la página de registro
});
app.get('/inicio', (req, res) => {
  res.sendFile(path.join(__dirname, '/../html/inicio.html'));  // Ruta para la página "Inicio"
});

app.get('/contacto', (req, res) => {
  res.sendFile(path.join(__dirname, '/../html/contacto.html'));  // Ruta para la página de contacto
});


// Almacén temporal de IPs bloqueadas
const ipBloqueadas = new Map();

// Middleware para chequear si IP está bloqueada
app.use((req, res, next) => {
  const ip = req.ip;
  const bloqueo = ipBloqueadas.get(ip);

  if (bloqueo && bloqueo > Date.now()) {
    return res.status(403).send('⛔ Acceso bloqueado temporalmente.');
  } else if (bloqueo) {
    ipBloqueadas.delete(ip); // Quitar si ya venció
  }

  next();
});
function detectarAtaques(req, res, next) {
  // Excepciones: rutas que no se validan contra patrones
  const rutasExentas = [
    '/api/propiedades',
    '/api/propiedades/' // para que también coincida con /api/propiedades/:id (PUT)
  ];

  // Si la ruta empieza con una de las exentas, continuar sin filtrar
  if (rutasExentas.some(ruta => req.path.startsWith(ruta))) {
    return next();
  }

  const stringEnJSON = JSON.stringify(req.body);

  const patronesMaliciosos = [
    /<script.*?>.*?<\/script>/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /<iframe.*?>/i,
    /javascript:/i,
    /\$where\s*:/i,
    /eval\s*\(/i
  ];

  for (const patron of patronesMaliciosos) {
    if (patron.test(stringEnJSON)) {
      const ip = req.ip;
      ipBloqueadas.set(ip, Date.now() + 30 * 60 * 1000); // 30 minutos
      console.warn(`🚨 IP bloqueada por intento de inyección: ${ip}`);
      return res.status(400).send('🚫 Intento malicioso detectado. IP bloqueada temporalmente.');
    }
  }

  next();
}


app.use(express.json());
app.use(detectarAtaques);


// ==========================================
// API para obtener datos de la base de datos desde MongoDB
// Limitar cantidad de peticiones para evitar abusos o ataques DoS
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // máximo 60 peticiones por IP por minuto
  message: 'Demasiadas peticiones desde esta IP, por favor espera un momento.'
});

// Aplicar limitador a la ruta
app.get('/api/properties', apiLimiter, async (req, res) => {
  try {
    // No hay inputs, pero igual podría aplicarse autenticación si es necesario

    const propiedades = await PropiedadModel.find({});

    console.log(`✅ Se obtuvieron ${propiedades.length} propiedades desde MongoDB`);
    res.json(propiedades);
  } catch (error) {
    console.error('Error al obtener propiedades desde MongoDB:', error);
    res.status(500).json({ error: 'Error al obtener propiedades desde la base de datos' });
  }
});


const propiedadSchema = new mongoose.Schema({
  id_propiedad: String,
  baños: String,
  bienvenida: String,
  desayuno: String,
  descripcion: String,
  dormitorios: String,
  garage: String,
  imagenes: [String],
  kit_higiene: String,
  nombre: String,
  precio: String,
  superficie: String,
  tipo: String,
  ubicacion: String,
  ubicacion_mapa: String,
  capacidad: String,
  lat: Number,
  lng: Number,

  // Nuevos campos
  servicios: {
    type: [String],  // lista de servicios (ej: ['Wifi', 'TV', 'Parrilla'])
    default: []
  },
  objetos: {
    type: [{
      nombre: { type: String, required: true },
      cantidad: { type: Number, default: 1 }
    }],
    default: []
  },
  inventario: {
    stock: { type: Number, default: 0 },       // Ejemplo: cantidad disponible
    opciones: { type: mongoose.Schema.Types.Mixed, default: {} } // opciones extra flexibles
  }
});

// Variable global para almacenar los precios de todas las propiedades
// Variable global para almacenar los precios de todas las propiedades
let propiedadesConPrecioGlobal = [];
let preciosnormales = {}; // Objeto global para precio base numérico
// Importás rutas si las usás en el servidor
const propiedadesRoutes = require('./routes/propiedades');
const { generarHtmlPropiedad } = require('./controllers/propiedadController');

// Definís el modelo: si ya existe, lo reutiliza, si no, lo crea
const Propiedad = mongoose.model("Propiedad", propiedadSchema, "propiedades");
const { body } = require('express-validator');

// Middleware para permitir solo a admin
function verificarAdmin(req, res, next) {
  if (!req.session || !req.session.userEmail || req.session.userEmail !== 'admin@maisonstate.com') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

app.post('/api/propiedades', [ 
  // Validaciones y sanitizaciones solo donde corresponde
  body('id_propiedad').trim().notEmpty().withMessage('id_propiedad es obligatorio').escape(),
  body('baños').optional().trim().escape(),
  body('bienvenida').optional().trim().escape(),
  body('desayuno').optional().trim().escape(),
  body('descripcion').optional().trim().escape(),
  body('dormitorios').optional().trim().escape(),
  body('garage').optional().trim().escape(),

  // ⛔ imagenes NO se sanitiza (solo verificamos que sea array de strings)
  body('imagenes').optional().isArray().withMessage('imagenes debe ser un array'),
  body('imagenes.*').optional().isString().trim(),  // sin .escape()

  body('kit_higiene').optional().trim().escape(),
  body('nombre').trim().notEmpty().withMessage('nombre es obligatorio').escape(),
  body('precio').trim().notEmpty().withMessage('precio es obligatorio').escape(),
  body('superficie').optional().trim().escape(),
  body('tipo').optional().trim().escape(),

  // ⛔ ubicacion SIN trim ni escape, pasa tal cual
  body('ubicacion').optional().trim(),

  // ⛔ ubicacion_mapa se permite como HTML sin escape
  body('ubicacion_mapa'),

  body('capacidad').optional().trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Errores de validación:', errors.array());
    return res.status(400).json({ errores: errors.array() });
  }

  try {
    const nuevaPropiedad = new Propiedad({
      id_propiedad: req.body.id_propiedad,
      baños: req.body.baños,
      bienvenida: req.body.bienvenida,
      desayuno: req.body.desayuno,
      descripcion: req.body.descripcion,
      dormitorios: req.body.dormitorios,
      garage: req.body.garage,
      imagenes: req.body.imagenes || [],
      kit_higiene: req.body.kit_higiene,
      nombre: req.body.nombre,
      precio: req.body.precio,
      superficie: req.body.superficie,
      tipo: req.body.tipo,
      ubicacion: req.body.ubicacion,  // sin modificar ni sanitizar
      ubicacion_mapa: req.body.ubicacion_mapa,
      capacidad: req.body.capacidad,
    });

    const propiedadGuardada = await nuevaPropiedad.save();
    await generarHtmlPropiedad(propiedadGuardada.toObject());

    res.status(201).json({
      mensaje: 'Propiedad creada correctamente',
      propiedad: propiedadGuardada
    });
  } catch (error) {
    console.error('Error al crear propiedad:', error);
    res.status(500).json({ error: 'Error al crear la propiedad' });
  }
});




// Importamos funciones de express-validator para validar y sanear inputs
const { query, validationResult } = require('express-validator');

// Ruta GET para calcular el precio y almacenarlo en la sesión
app.get('/ecuacion', [
  // Validar y sanear query params:
  // personas debe ser entero positivo, opcional (por si no lo usás)
  query('personas').optional().isInt({ min: 1 }).withMessage('personas debe ser un número entero positivo').toInt(),
  // fechaInicio y fechaFin deben ser fechas válidas en formato ISO8601
  query('fechaInicio').exists().isISO8601().withMessage('fechaInicio debe ser una fecha válida'),
  query('fechaFin').exists().isISO8601().withMessage('fechaFin debe ser una fecha válida')
], async (req, res) => {
  // Validar resultados de express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Si hay errores de validación, respondemos con 400 y detalles
    return res.status(400).json({ errores: errors.array() });
  }
  const query = req.query;
  // Extraemos los parámetros ya saneados (gracias a toInt y validaciones)
  const personas = req.query.personas;
  const fechaInicio = req.query.fechaInicio;
  const fechaFin = req.query.fechaFin;

  console.log('🔎 Parámetros recibidos:', { personas, fechaInicio, fechaFin });

  try {
    // Obtener todas las propiedades desde MongoDB
    const propiedades = await PropiedadModel.find({});

    // Convertimos fechas a objetos Date
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    console.log('📅 Fechas parseadas:', { inicio, fin });

    // Validamos que las fechas sean válidas (isNaN para fechas inválidas)
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      console.warn('❌ Fechas no válidas después de parsear');
      return res.status(400).json({ error: 'Las fechas no son válidas' });
    }

    // Validamos que la fecha fin sea posterior a la fecha inicio
    if (fin <= inicio) {
      console.warn('❌ Fecha fin no es posterior a inicio');
      return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la fecha de entrada' });
    }

    // Calculamos la cantidad de noches entre ambas fechas
    const noches = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    console.log('🌙 Noches calculadas:', noches);

    if (isNaN(noches)) {
      console.warn('❌ Noches no calculadas correctamente');
      return res.status(400).json({ error: 'No se pudo calcular el número de noches' });
    }

    // Reiniciamos objeto global de precios normales
    preciosnormales = {};

    // Procesamos cada propiedad para calcular precio total según noches
    const propiedadesConPrecio = propiedades.map((prop) => {
      // Convertimos precio (string) a número, considerando formatos comunes
      let precioNumerico = parseFloat(
        String(prop.precio).replace(/\./g, '').replace(',', '.')
      );

      if (prop.id_propiedad) {
        preciosnormales[prop.id_propiedad] = precioNumerico;
      } else {
        console.warn("⚠️ Propiedad sin id válida:", prop);
      }

      console.log("Precio base de propiedad (antes de multiplicar):", precioNumerico);

      // Calculamos precio total según cantidad de noches
      const precioTotal = isNaN(precioNumerico) ? 0 : precioNumerico * noches;

      return {
        ...prop.toObject(),
        precioTotal,
        noches
      };
    });

    console.log("📌 Precios base normales actualizados:", preciosnormales);

    // Guardamos resultados globalmente y en sesión
    propiedadesConPrecioGlobal = propiedadesConPrecio;
    req.session.propiedadesCalculadas = propiedadesConPrecio;

    // Respondemos con el array de propiedades con precios calculados
    res.json(propiedadesConPrecio);
  } catch (error) {
    console.error('Error al obtener datos desde MongoDB:', error);
    res.status(500).json({ error: 'Error al obtener datos de la base de datos' });
  }
});





  const PropiedadModel = mongoose.model('Propiedad', propiedadSchema, 'propiedades');


// Ruta para obtener precios base desde MongoDB
app.get('/precioBaseGlobal', [
  // Validar que id sea opcional y si existe que sea string alfanumérico para evitar inyección
  query('id').optional().isAlphanumeric().withMessage('id inválido')
], async (req, res) => {
  // Validar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }

  const id = req.query.id;

  try {
    // Traer propiedades desde MongoDB solo los campos necesarios
    const propiedades = await PropiedadModel.find({}, 'id_propiedad precio');


    const preciosnormales = {};
    propiedades.forEach(prop => {
      if (prop.id_propiedad && prop.precio !== undefined) {
        // Convertimos el precio a número correctamente
        let precioNumerico = parseFloat(
          String(prop.precio).replace(/\./g, '').replace(',', '.')
        );
        preciosnormales[prop.id_propiedad] = precioNumerico;
      }
    });

    if (id) {
      const precio = preciosnormales[id];
      if (precio !== undefined) {
        console.log(`✅ Precio base para id ${id}:`, precio);
        return res.json({ id, precioBase: precio });
      } else {
        console.warn(`⚠️ No se encontró precio base para id ${id}`);
        return res.status(404).json({ error: 'No se encontró precio base para esa propiedad' });
      }
    }

    console.log('✅ Devolviendo todos los precios base');
    res.json(preciosnormales);
  } catch (err) {
    console.error('❌ Error al consultar MongoDB:', err);
    res.status(500).json({ error: 'Error al consultar la base de datos desde MongoDB' });
  }
});

// Ruta para obtener las noches globales almacenadas
app.get('/obtenerNoches', (req, res) => {
  // Retornamos las noches calculadas, si no hay datos retornamos 0
  res.json({ noches: propiedadesConPrecioGlobal[0]?.noches || 0 });
});

// Ruta para obtener todos los precios globales almacenados
app.get('/obtenerPreciosGlobales', (req, res) => {
  res.json(propiedadesConPrecioGlobal);
});



// ========================
// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error de conexión a MongoDB', err));

// ========================
// Esquema de reservas
const reservaSchema = new mongoose.Schema({
    id: String, // Identificador único de la reserva

    id_propiedad: String, // ID de la propiedad asociada a la reserva

    estado: { 
        type: String, 
        default: 'pendiente' // Estado inicial de la reserva
    },

    fecha_inicio: Date, // Fecha de inicio de la estadía

    fecha_fin: Date, // Fecha de fin de la estadía

    cantidad_noches: Number, // Cantidad total de noches reservadas

    precio: Number, // Precio total de la reserva

    nombre_cliente: String, // Nombre del cliente que reserva

    viajeros: Number, // Cantidad de personas

    fecha_creacion: { 
        type: Date, 
        default: Date.now // Fecha automática cuando se crea la reserva
    },

    comprobanteArchivo: String, // Ruta o nombre del archivo del comprobante de pago

    id_google: String, // ID del usuario si inició sesión con Google

    porcentaje_pago: Number // Porcentaje pagado (ej: 30, 50, 100)
});


const Reserva = mongoose.model('Reserva', reservaSchema);
const multer = require('multer');
// Configuración de multer para subir archivos
// Configuración segura para almacenamiento con multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Carpeta destino: recomendable validar que exista y permisos correctos
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Generar nombre único para evitar colisiones y posibles sobrescrituras
    const nombreUnico = `${Date.now()}-${file.originalname}`;

    // Opcional: Sanear el nombre original para evitar caracteres problemáticos
    const nombreSeguro = nombreUnico.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, nombreSeguro);
  }
});

// Filtro para tipos de archivos permitidos (ejemplo: solo imágenes jpg, png, jpeg)
function fileFilter (req, file, cb) {
  const tiposPermitidos = /jpeg|jpg|png/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if(tiposPermitidos.test(ext) && tiposPermitidos.test(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos jpg, jpeg y png'));
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
      return cb(new Error('Solo se permiten imágenes jpeg, png o webp'), false);
    }
    cb(null, true);
  }
});

app.use(express.json());

// 📨 Ruta para crear reserva + enviar correo
app.post('/api/crearReserva', async (req, res) => {
  // Verificar que el usuario esté autenticado
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "No autenticado. Debes iniciar sesión para crear una reserva."
    });
  }

  // Desestructuramos los campos del body
  const {
    id,
    id_propiedad,
    fecha_inicio,
    fecha_fin,
    cantidad_noches,
    precio,
    nombre_cliente,
    viajeros,
    porcentaje_pago
  } = req.body;

  const id_google = req.user.id_google;

  // Intentar obtener email directamente de req.user
  let email_cliente = req.user.email;

  // Si no hay email en req.user, buscar en BD por id_google
  if (!email_cliente) {
    try {
      // Cambia "Usuario" por el nombre real de tu modelo usuario
      const usuarioDB = await Usuario.findOne({ id_google: id_google }).lean();
      if (usuarioDB && usuarioDB.email) {
        email_cliente = usuarioDB.email;
      }
    } catch (err) {
      console.error('❌ Error al buscar email en BD:', err);
    }
  }

  console.log("📩 Datos recibidos para reserva:", {
    id,
    id_propiedad,
    fecha_inicio,
    fecha_fin,
    cantidad_noches,
    precio,
    nombre_cliente,
    viajeros,
    porcentaje_pago,
    id_google,
    email_cliente
  });

  // Validaciones básicas y sanitización manual
  if (
    !id || !id_propiedad || !fecha_inicio || !fecha_fin || !cantidad_noches ||
    !precio || !nombre_cliente || !viajeros || !email_cliente || !id_google
  ) {
    console.warn("⚠️ Faltan campos en la reserva o usuario no autenticado");
    return res.status(400).json({
      success: false,
      message: "Faltan datos necesarios o usuario no autenticado"
    });
  }

  // Sanitización sencilla
  const sanitizedNombreCliente = String(nombre_cliente).trim();
  const sanitizedId = String(id).trim();

  // Crear instancia de reserva con datos sanitizados
  const nuevaReserva = new Reserva({
    id: sanitizedId,
    id_propiedad: String(id_propiedad).trim(),
    estado: 'pendiente',
    fecha_inicio: new Date(fecha_inicio),
    fecha_fin: new Date(fecha_fin),
    cantidad_noches: Number(cantidad_noches),
    precio: Number(precio),
    nombre_cliente: sanitizedNombreCliente,
    viajeros: Number(viajeros),
    porcentaje_pago: Number(porcentaje_pago),
    id_google: id_google
  });

  try {
    await nuevaReserva.save();

    // Sumar 1 día (en ms) para correo
    const fechaEntrada = new Date(new Date(fecha_inicio).getTime() + 24 * 60 * 60 * 1000);
    const fechaSalida = new Date(new Date(fecha_fin).getTime() + 24 * 60 * 60 * 1000);

    // Configurar correo HTML
    const mailOptions = {
      from: 'tudinero.net.verfify.code@gmail.com',
      to: email_cliente,
      subject: '✔️ Confirmación de reserva en Maison&State',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; background-color: #fdfdfd; padding: 32px; border-radius: 20px; max-width: 600px; margin: auto; box-shadow: 0 8px 20px rgba(0,0,0,0.06);">
          <h2 style="color: #007aff; text-align: center; font-weight: 600;">✔️ Reserva confirmada</h2>
          <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${sanitizedNombreCliente}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6;">
            Gracias por reservar con <strong>Maison&State</strong>. Tu solicitud ha sido procesada con éxito. Aquí están los detalles:
          </p>
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 20px;">
            <tbody>
              <tr><td style="padding: 12px; background: #f9f9f9;"><strong>ID de reserva:</strong></td><td style="padding: 12px;">${sanitizedId}</td></tr>
              <tr><td style="padding: 12px; background: #f9f9f9;"><strong>Fecha de entrada:</strong></td><td style="padding: 12px;">${fechaEntrada.toLocaleDateString()}</td></tr>
              <tr><td style="padding: 12px; background: #f9f9f9;"><strong>Fecha de salida:</strong></td><td style="padding: 12px;">${fechaSalida.toLocaleDateString()}</td></tr>
              <tr><td style="padding: 12px; background: #f9f9f9;"><strong>Total:</strong></td><td style="padding: 12px;">$${Number(precio)}</td></tr>
              <tr><td style="padding: 12px; background: #f9f9f9;"><strong>Abonado:</strong></td><td style="padding: 12px;">${Number(porcentaje_pago)}%</td></tr>
            </tbody>
          </table>
          <p style="font-size: 14px; margin-top: 24px;">
            Te notificaremos cuando la reserva sea aprobada por nuestro equipo.
          </p>
          <p style="font-size: 14px;">Gracias por confiar en nosotros.</p>
          <p style="margin-top: 32px; text-align: center; font-weight: 500; color: #4a4a4a;">Maison&State</p>
          <p style="text-align: center; font-size: 12px; color: #b0b0b0;">Este es un mensaje automático. No respondas a este correo.</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Error al enviar correo:', error);
      } else {
        console.log('📧 Correo enviado:', info.response);
      }
    });

    console.log(`✅ Reserva creada con estado: ${nuevaReserva.estado}`);
    res.json({ success: true, reservaId: sanitizedId });

  } catch (error) {
    console.error('❌ Error al guardar la reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar la reserva',
      error: error.message
    });
  }
});





app.get('/api/reservas', async (req, res) => {
  try {
    // Validar que el usuario esté autenticado y sea admin
    if (!req.session?.usuario) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }
    if (req.session.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado: solo admin' });
    }

    // Obtener todas las reservas de la base de datos
    const reservas = await Reserva.find();

    // Responder con el listado de reservas en formato JSON
    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener las reservas', error);
    res.status(500).json({ success: false, message: 'Error al obtener las reservas' });
  }
});

// Ruta para obtener las reservas del usuario autenticado según su id_google
app.get('/api/mis-reservas', async (req, res) => {
  try {
    // Obtener el id_google del usuario autenticado desde req.user
    const id_google = req.user ? req.user.id_google : null;

    // Validar que id_google esté presente (usuario autenticado)
    if (!id_google) {
      return res.status(401).json({ success: false, message: 'No autorizado: no se encontró id_google' });
    }

    // Buscar reservas en MongoDB que coincidan con el id_google del usuario
    const reservas = await Reserva.find({ id_google });

    // Enviar las reservas encontradas en la respuesta
    res.json({ success: true, reservas });
  } catch (error) {
    // Captura de errores inesperados y respuesta con error 500
    console.error('Error al obtener reservas del usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

 

app.get('/api/bloqueos/:id_propiedad', async (req, res) => {
  try {
    const idPropiedad = req.params.id_propiedad;

    // Validar que id_propiedad sea un string numérico (con o sin ceros a la izquierda)
    if (!idPropiedad || !/^\d+$/.test(idPropiedad)) {
      return res.status(400).json({ success: false, message: 'ID de propiedad inválido. Debe ser un número' });
    }

    // Buscar bloqueos para la propiedad
    const bloqueos = await Bloqueo.find({ id_propiedad: idPropiedad });

    res.json({ success: true, bloqueos });
  } catch (err) {
    console.error("Error al obtener bloqueos:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
});

// Guardar nuevas fechas bloqueadas para una propiedad con validación de solapamiento
app.post('/api/bloqueos', async (req, res) => {
  try {
    const { id_propiedad, fecha_inicio, fecha_fin } = req.body;

    console.log("Datos recibidos para bloqueo:", { id_propiedad, fecha_inicio, fecha_fin });

    // Validación básica de datos recibidos
    if (!id_propiedad || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ success: false, message: "Faltan datos obligatorios" });
    }

    // Validar formato del id_propiedad (solo números o strings numéricos con ceros a la izquierda)
    if (!/^\d+$/.test(id_propiedad)) {
      return res.status(400).json({ success: false, message: "ID de propiedad inválido. Debe ser un número" });
    }

    // Validar fechas
    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({ success: false, message: "Fechas inválidas" });
    }

    if (fin <= inicio) {
      return res.status(400).json({ success: false, message: "La fecha de fin debe ser posterior a la fecha de inicio" });
    }

    // Buscar bloqueos que se solapan con estas fechas para la propiedad
    const bloqueosSolapados = await Bloqueo.find({
      id_propiedad,
      $or: [
        { fecha_inicio: { $lte: fin }, fecha_fin: { $gte: inicio } }
      ]
    });

    if (bloqueosSolapados.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Las fechas que querés bloquear ya están ocupadas."
      });
    }

    // No se solapan, guardar bloqueo nuevo
    const nuevoBloqueo = new Bloqueo({
      id_propiedad,
      fecha_inicio: inicio,
      fecha_fin: fin
    });

    await nuevoBloqueo.save();

    res.json({ success: true, bloqueo: nuevoBloqueo });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
});


const UsuarioSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  password: String,
  id_google: String,
  foto: String,
  termsAcceptedAt: Date,
  verificado: {
    type: Boolean,
    default: false
  },
  tokenVerificacion: String, // ← IMPORTANTE

  // Nuevos campos
  contacto: String,
  direccion: String,
  altura: String,
  piso: String,
  postal: String,
  ciudad: String,
  provincia: String,

  // Documentos de identidad
  dni: {
    anverso: { type: String, default: null },   // URL subida
    reverso: { type: String, default: null },   // URL subida
    estado: { 
      type: String, 
      enum: ["pendiente", "aprobado", "rechazado", "sin_subir"], 
      default: "sin_subir"   // Valor inicial cuando no hay documento
    },
    fechaSubida: { type: Date, default: null }  // Fecha de la última subida
  }
});

const Usuario = mongoose.model("users", UsuarioSchema);


// Esquema Bloqueo
const bloqueoSchema = new mongoose.Schema({
  id_propiedad: String,
  fecha_inicio: Date,
  fecha_fin: Date
});
const Bloqueo = mongoose.model('Bloqueo', bloqueoSchema);

// Hacer io accesible para usar en rutas
app.set('io', io);
// Ruta para guardar/actualizar teléfono del usuario autenticado
// Ruta para obtener todos los datos nuevos del usuario

// GET para traer datos usuario
// Asegúrate de tener esto antes de las rutas
// Antes: app.use(express.json());
app.use(express.json({ limit: '10mb' }));  // ajusta según necesites
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// GET /api/usuario/:id/dni-status
// Ejemplo backend
// GET estado DNI
// GET estado DNI

// GET datos usuario
app.get('/api/user/datos', async (req, res) => {
  try {
    console.log('GET /api/user/datos - Inicio');
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const id_google = req.user.id_google;
    console.log('id_google:', id_google);

    if (!id_google) {
      return res.status(400).json({ success: false, message: 'ID de usuario no encontrado' });
    }

    const usuario = await User.findOne({ id_google });
    console.log('Usuario encontrado:', !!usuario);

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, user: usuario });
  } catch (error) {
    console.error('Error al obtener datos usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});
app.post('/api/user/datos', async (req, res) => {
  try {
    console.log('POST /api/user/datos - Inicio');
    console.log('Body recibido:', req.body);

    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const id_google = req.user.id_google;
    if (!id_google) {
      return res.status(400).json({ success: false, message: 'ID de usuario no encontrado' });
    }

    const {
      contacto,
      direccion,
      altura,
      piso,
      postal,
      ciudad,
      provincia,
      dni
    } = req.body;

    if (contacto && !/^[\d\s\+\-]{7,15}$/.test(contacto)) {
      return res.status(400).json({ success: false, message: 'Formato de teléfono inválido' });
    }

    const updateObj = {};
    if (contacto !== undefined) updateObj.contacto = contacto;
    if (direccion !== undefined) updateObj.direccion = direccion;
    if (altura !== undefined) updateObj.altura = altura;
    if (piso !== undefined) updateObj.piso = piso;
    if (postal !== undefined) updateObj.postal = postal;
    if (ciudad !== undefined) updateObj.ciudad = ciudad;
    if (provincia !== undefined) updateObj.provincia = provincia;

    // Forzar actualización de subdocumento DNI usando dot notation
    if (dni) {
      if (dni.anverso) updateObj["dni.anverso"] = dni.anverso;
      if (dni.reverso) updateObj["dni.reverso"] = dni.reverso;

      // Estado y fechaSubida se actualizan automáticamente
      updateObj["dni.estado"] = "pendiente";
      updateObj["dni.fechaSubida"] = new Date();
    }

    const actualizado = await Usuario.findOneAndUpdate(
      { id_google },
      { $set: updateObj },
      { new: true }
    );

    if (!actualizado) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    console.log('Datos guardados correctamente:', actualizado);
    res.json({ success: true, message: 'Datos guardados con éxito', datos: actualizado });

  } catch (error) {
    console.error('Error al guardar datos usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});


// GET estado DNI
app.get('/api/usuario/:id/dni-status', async (req, res) => {
  try {
    console.log("GET DNI estado para usuario:", req.params.id);
    const user = await Usuario.findById(req.params.id, 'dni.estado');
    if (!user) {
      console.log("Usuario no encontrado");
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    console.log("Estado DNI actual:", user.dni.estado);
    res.json({ dniStatus: user.dni.estado });
  } catch (e) {
    console.error("Error GET DNI:", e);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});
// POST actualizar estado DNI (solo admin)
app.post("/api/usuario/:id/dni-status", soloAdmin, async (req, res) => {
  try {
    console.log("POST DNI recibido para usuario:", req.params.id);
    console.log("Cuerpo recibido:", req.body);

    const { estado } = req.body;
    if (!["aprobado","rechazado","pendiente","sin_subir"].includes(estado)) {
      console.log("Estado inválido:", estado);
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }

    const user = await Usuario.findById(req.params.id);
    if (!user) {
      console.log("Usuario no encontrado");
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    console.log("Estado actual:", user.dni.estado, "→ nuevo:", estado);

    user.dni.estado = estado;
    await user.save();

    console.log("Estado DNI actualizado en DB:", user.dni.estado);
    res.json({ success: true, dniStatus: user.dni.estado });
  } catch (err) {
    console.error("Error al actualizar DNI:", err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});


// ==========================================
// Ruta para manejar el registro de Google
// ==========================================
app.post('/register-google', async (req, res) => {
  const { token } = req.body; // Recibimos el token desde el frontend

  // Validar que el token exista
  if (!token) {
    return res.status(400).json({ error: 'No se recibió el token de Google.' });
  }

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Inicializamos cliente OAuth2

  try {
    // Verificar el token recibido contra Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, // Verificar que el token es para nuestro cliente
    });

    const payload = ticket.getPayload(); // Obtener información del token
    const userId = payload['sub'];       // ID único de usuario Google
    const userName = payload['name'];
    const userEmail = payload['email'];
    const userPicture = payload['picture'];

    console.log("Usuario autenticado con Google:", { userId, userName, userEmail });

    // Responder con los datos del usuario autenticado
    res.json({
      message: 'Usuario registrado con Google',
      user: {
        userId,
        userName,
        userEmail,
        userPicture,
      },
    });
  } catch (error) {
    console.error('Error en la verificación del token:', error);
    res.status(400).json({ error: 'Error en la autenticación con Google' });
  }
});

// RUTA DE REGISTRO

const UsuarioTemporalSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  password: String, // ya hasheado
  termsAcceptedAt: Date,
  tokenVerificacion: String,
  creadoEn: { type: Date, default: Date.now, expires: 86400 } // Expira en 24hs
});
const UsuarioTemporal = mongoose.model('UsuarioTemporal', UsuarioTemporalSchema);

// Aquí suponemos que ya tienes configurado tu transporter con datos de .env
// const transporter = nodemailer.createTransport({ ... });

// Ruta POST /register - guarda en usuarios temporales y manda mail
app.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres').escape(),
  body('email_manual').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 8, max: 100 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('termsTimestamp').isISO8601().withMessage('Timestamp de aceptación de términos inválido'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email_manual, password, termsTimestamp } = req.body;

  try {
    // Revisar si usuario ya existe en definitivo
    const existeUsuario = await Usuario.findOne({ email: email_manual });
    if (existeUsuario) return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });

    // Eliminar usuarios temporales previos con ese email (por si hay)
    await UsuarioTemporal.deleteMany({ email: email_manual });

    // Hashear contraseña
    const hashedPassword = await bcryptjs.hash(password, 10);
    // Generar token único
    const tokenVerificacion = crypto.randomBytes(32).toString('hex');

    // Guardar usuario temporal
    const usuarioTemp = new UsuarioTemporal({
      nombre: name,
      email: email_manual,
      password: hashedPassword,
      termsAcceptedAt: new Date(termsTimestamp),
      tokenVerificacion
    });
    await usuarioTemp.save();

    // Enviar email con link de verificación
    const link = `http://localhost:777/verificar-email?token=${tokenVerificacion}`;
    await transporter.sendMail({
      from: '"Maison&State" <no-reply@tuapp.com>',
      to: email_manual,
      subject: 'Verificá tu cuenta',
      html: `
        <p>Hola ${name},</p>
        <p>Gracias por registrarte en Maison&State.</p>
        <p>Por favor verificá tu correo haciendo clic en el siguiente enlace:</p>
        <a href="${link}">Verificar mi cuenta</a>
        <p>Si no te registraste, podés ignorar este mensaje.</p>
      `
    });

    return res.status(201).json({ success: true, message: '🎉 ¡Registro exitoso! Revisa tu correo para verificar la cuenta.' });
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar el registro.' });
  }
});

// Ruta GET /verificar-email - valida token, crea usuario definitivo y elimina temporal
app.get('/verificar-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Token faltante");

  try {
    const usuarioTemp = await UsuarioTemporal.findOne({ tokenVerificacion: token });
    if (!usuarioTemp) return res.status(404).send("Token inválido o expirado.");

    // Crear usuario definitivo
    const nuevoUsuario = new Usuario({
      nombre: usuarioTemp.nombre,
      email: usuarioTemp.email,
      password: usuarioTemp.password,
      termsAcceptedAt: usuarioTemp.termsAcceptedAt,
      verificado: true,
      tokenVerificacion: null
    });
    await nuevoUsuario.save();

    // Borrar usuario temporal
    await UsuarioTemporal.deleteOne({ _id: usuarioTemp._id });

    // Redirigir a login tras verificar el correo
    res.redirect('/login.html');
  } catch (error) {
    console.error("Error al verificar email:", error);
    res.status(500).send("Ocurrió un error al verificar tu correo.");
  }
});

// Ruta para consultar si un email ya está verificado
app.get("/api/check-verification", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, error: "Email requerido" });

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(404).json({ success: false, error: "Usuario no encontrado" });

    return res.json({ success: true, verified: usuario.verificado === true });
  } catch (error) {
    console.error("Error en check-verification:", error);
    return res.status(500).json({ success: false, error: "Error interno" });
  }
});
const bcryptjs = require('bcryptjs');

// ==========================================
// Configuración de Passport con GoogleStrategy
// ==========================================
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:777/auth/google/callback"
}, async (token, tokenSecret, profile, done) => {
  try {
    const email = profile.emails[0].value;

    // 1. Buscar por email primero
    let user = await User.findOne({ email });

    if (user) {
      // 2. Si ya existe (registrado por email), actualizo el id_google si no lo tiene
      if (!user.id_google) {
        user.id_google = profile.id;
        user.foto = user.foto || profile.photos[0].value; // opcional: no pisar si ya tiene
        await user.save();
      }
      console.log('Usuario existente actualizado:', user);
    } else {
      // 3. Si no existe, lo creo nuevo
      user = new User({
        id_google: profile.id,
        nombre: profile.displayName,
        email,
        foto: profile.photos[0].value
      });
      await user.save();
      console.log('Nuevo usuario creado:', user);
    }

    return done(null, user);
  } catch (err) {
    console.error('Error en GoogleStrategy:', err);
    return done(err, null);
  }
}));

// Hacer io accesible para usar en rutas
app.set('io', io);
app.put('/api/reservas/aprobar/:id', soloAdmin ,async (req, res) => {
  try {
    // Validar que el id esté presente y sea un string no vacío
    const reservaId = req.params.id;
    if (!reservaId || typeof reservaId !== 'string' || reservaId.trim() === '') {
      return res.status(400).json({ success: false, message: "ID de reserva inválido" });
    }

    // Buscar reserva por id
    const reserva = await Reserva.findOne({ id: reservaId.trim() });
    if (!reserva) {
      return res.status(404).json({ success: false, message: "Reserva no encontrada" });
    }

    // Verificar si ya está aprobada para no reprocesar
    if (reserva.estado === 'aprobada') {
      return res.json({ success: false, message: "Reserva ya está aprobada" });
    }

    // Convertir fechas a objeto Date y validar
    const fechaInicio = new Date(reserva.fecha_inicio);
    if (isNaN(fechaInicio.getTime())) {
      return res.status(400).json({ success: false, message: "Fecha de inicio inválida en reserva" });
    }
    // Calcular fechaFin sumando cantidad_noches
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + (reserva.cantidad_noches || 0));

    // Crear bloqueo para esas fechas
    const nuevoBloqueo = new Bloqueo({
      id_propiedad: reserva.id_propiedad,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    });
    await nuevoBloqueo.save();

    // Actualizar estado reserva a aprobada
    reserva.estado = 'aprobada';
    await reserva.save();

    // Emitir evento en vivo para actualizar fechas bloqueadas (usando socket.io)
    const io = req.app.get('io');
    io.emit('bloqueos_actualizados', { id_propiedad: reserva.id_propiedad });

    // Obtener email_cliente de reserva o buscar en Usuario si no existe
    let email_cliente = reserva.email_cliente || '';

    if (!email_cliente && reserva.id_google) {
      try {
        const usuarioDB = await Usuario.findOne({ id_google: reserva.id_google }).lean();
        if (usuarioDB && usuarioDB.email) {
          email_cliente = usuarioDB.email;
        }
      } catch (err) {
        console.error('❌ Error al buscar email en BD:', err);
      }
    }

    if (!email_cliente) {
      console.warn("⚠️ No se encontró email para enviar confirmación");
    }

    const mailOptions = {
      from: 'tudinero.net.verfify.code@gmail.com',
      to: email_cliente,
      subject: '🏠 Reserva aprobada en Maison&State',
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; background-color: #fdfdfd; padding: 32px; border-radius: 20px; max-width: 600px; margin: auto; box-shadow: 0 8px 20px rgba(0,0,0,0.06);">
        <div style="text-align: center; margin-bottom: 16px;">
          <svg width="60" height="60" fill="#007aff" viewBox="0 0 24 24">
            <path d="M12 0C5.37265 0 0 5.37265 0 12C0 18.6274 5.37265 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37265 18.6274 0 12 0ZM10.0002 17.0002L5.50024 12.5002L6.91424 11.0862L10.0002 14.1722L17.0862 7.08624L18.5002 8.50024L10.0002 17.0002Z"/>
          </svg>
        </div>
        <h2 style="color: #007aff; text-align: center; font-weight: 600;">Reserva aprobada</h2>
        <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${reserva.nombre_cliente || 'Cliente'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          Tu reserva ha sido <strong>aprobada</strong>. Aquí están los detalles:
        </p>
        <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 20px;">
          <tbody>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>ID de reserva:</strong></td>
              <td style="padding: 12px;">${reserva.id}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>Fecha de entrada:</strong></td>
              <td style="padding: 12px;">${fechaInicio.toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>Fecha de salida:</strong></td>
              <td style="padding: 12px;">${fechaFin.toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>Total:</strong></td>
              <td style="padding: 12px;">$${reserva.precio.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>Abonado:</strong></td>
              <td style="padding: 12px;">${reserva.porcentaje_pago || 0}%</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size: 14px; margin-top: 24px;">
          Gracias por confiar en <strong>Maison&State</strong>.
        </p>
        <p style="margin-top: 32px; text-align: center; font-weight: 500; color: #4a4a4a;">Maison&State</p>
        <p style="text-align: center; font-size: 12px; color: #b0b0b0;">Este es un mensaje automático. No respondas a este correo.</p>
      </div>
      `
    };

    // Enviar correo (loguear error, no interrumpir flujo)
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Error al enviar correo de aprobación:', error);
      } else {
        console.log('📧 Correo de aprobación enviado:', info.response);
      }
    });

    // Respuesta exitosa al cliente
    res.json({ success: true });

  } catch (err) {
    console.error("Error al aprobar la reserva y bloquear fechas:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
});



// Middleware para validar admin
function soloAdmin(req, res, next) {
  if (!req.session.usuario || req.session.usuario.rol !== 'admin') {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }
  next();
}


app.put('/api/reservas/rechazar/:id', soloAdmin, async (req, res) => {
  try {
    // Validar que el id no esté vacío y sea string
    const reservaId = req.params.id;
    if (!reservaId || typeof reservaId !== 'string' || reservaId.trim() === '') {
      return res.status(400).json({ success: false, message: "ID de reserva inválido" });
    }

    // Buscar reserva limpiando espacios en id
    const reserva = await Reserva.findOne({ id: reservaId.trim() });
    if (!reserva) {
      return res.status(404).json({ success: false, message: "Reserva no encontrada" });
    }

    // Verificar estado actual
    if (reserva.estado === 'rechazada') {
      return res.json({ success: false, message: "Reserva ya está rechazada" });
    }

    // Validar y convertir fecha_inicio a Date
    const fechaInicioOriginal = new Date(reserva.fecha_inicio);
    if (isNaN(fechaInicioOriginal.getTime())) {
      return res.status(400).json({ success: false, message: "Fecha de inicio inválida en reserva" });
    }
    // Sumar 1 día a fechaInicio
    const fechaInicio = new Date(fechaInicioOriginal);
    fechaInicio.setDate(fechaInicio.getDate() + 1);

    // Calcular fechaFin sumando cantidad_noches + 1 día extra
    const cantNoches = Number(reserva.cantidad_noches) || 0;
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + cantNoches + 1);

    // Eliminar bloqueos que coincidan exactamente con esas fechas (revisar si quieres rango o igual)
    await Bloqueo.deleteMany({
      id_propiedad: reserva.id_propiedad,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    });

    // Actualizar estado reserva
    reserva.estado = 'rechazada';
    await reserva.save();

    // Emitir evento en vivo para actualizar bloqueos en clientes conectados
    const io = req.app.get('io');
    io.emit('bloqueos_actualizados', { id_propiedad: reserva.id_propiedad });

    // Obtener email_cliente de reserva o buscar en Usuario si no existe
    let email_cliente = reserva.email_cliente || '';

    if (!email_cliente && reserva.id_google) {
      try {
        const usuarioDB = await Usuario.findOne({ id_google: reserva.id_google }).lean();
        if (usuarioDB && usuarioDB.email) {
          email_cliente = usuarioDB.email;
        }
      } catch (err) {
        console.error('❌ Error al buscar email en BD:', err);
      }
    }

    if (!email_cliente) {
      console.warn("⚠️ No se encontró email para enviar notificación de rechazo");
    }

    // Preparar correo HTML (podrías mover a plantilla externa para mejor mantenimiento)
    const mailOptions = {
      from: 'tudinero.net.verfify.code@gmail.com',
      to: email_cliente,
      subject: '🚫 Reserva rechazada en Maison&State',
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; background-color: #fdfdfd; padding: 32px; border-radius: 20px; max-width: 600px; margin: auto; box-shadow: 0 8px 20px rgba(0,0,0,0.06);">
        <div style="text-align: center; margin-bottom: 16px;">
          <svg width="60" height="60" fill="#ff3b30" viewBox="0 0 24 24">
            <path d="M18.364 5.636l-1.414-1.414L12 9.172 7.05 4.222 5.636 5.636 10.586 10.586 5.636 15.536l1.414 1.414L12 12.828l4.95 4.95 1.414-1.414-4.95-4.95 4.95-4.95z"/>
          </svg>
        </div>
      
        <h2 style="color: #ff3b30; text-align: center; font-weight: 600;">Reserva rechazada</h2>
      
        <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${reserva.nombre_cliente || 'Cliente'}</strong>,</p>
      
        <p style="font-size: 15px; line-height: 1.6;">
          Lamentamos informarte que tu reserva ha sido <strong>rechazada</strong>. 
          Si tenés alguna consulta, por favor contactanos.
        </p>
      
        <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 20px;">
          <tbody>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>ID de reserva:</strong></td>
              <td style="padding: 12px;">${reserva.id}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>Fecha de entrada:</strong></td>
              <td style="padding: 12px;">${fechaInicio.toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>Fecha de salida:</strong></td>
              <td style="padding: 12px;">${fechaFin.toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>Total:</strong></td>
              <td style="padding: 12px;">$${Number(reserva.precio).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 12px; background: #f9f9f9;"><strong>Abonado:</strong></td>
              <td style="padding: 12px;">${reserva.porcentaje_pago || 0}%</td>
            </tr>
          </tbody>
        </table>
      
        <p style="font-size: 14px; margin-top: 24px;">
          Gracias por confiar en <strong>Maison&State</strong>.
        </p>
      
        <p style="margin-top: 32px; text-align: center; font-weight: 500; color: #4a4a4a;">Maison&State</p>
        <p style="text-align: center; font-size: 12px; color: #b0b0b0;">Este es un mensaje automático. No respondas a este correo.</p>
      </div>
      `
    };

    // Enviar mail, registrar error si falla
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Error al enviar correo de rechazo:', error);
      } else {
        console.log('📧 Correo de rechazo enviado:', info.response);
      }
    });

    // Respuesta exitosa
    res.json({ success: true });

  } catch (err) {
    console.error("Error al rechazar la reserva y eliminar bloqueos:", err);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
});



// ==========================================
// Ruta pública para obtener info del usuario (si está logueado)
app.get('/api/user', async (req, res) => {
  try {
    // Si no está autenticado, simplemente devolver false
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.json({
        success: false,
        user: null
      });
    }

    const idGoogle = req.user.id_google;

    if (!idGoogle || typeof idGoogle !== 'string' || idGoogle.trim() === '') {
      return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
    }

    const user = await User.findOne({ id_google: idGoogle.trim() });

    if (!user) {
      return res.json({
        success: false,
        user: null
      });
    }

    res.json({
      success: true,
      user: {
        nombre: user.nombre || '',
        foto: user.foto || '',
        email: user.email || ''
      }
    });

  } catch (error) {
    console.error('Error al obtener los datos del usuario:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

app.post('/api/user/telefono', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const id_google = req.user?.id_google;
    let { telefono } = req.body;

    // Validar id_google
    if (!id_google || typeof id_google !== 'string' || !id_google.trim()) {
      return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
    }

    // Validar teléfono existe, es string y no vacío
    if (!telefono || typeof telefono !== 'string' || !telefono.trim()) {
      return res.status(400).json({ success: false, message: 'Teléfono es requerido' });
    }

    telefono = telefono.trim();

    // Validar formato teléfono (números, espacios, +, -, paréntesis)
    const telefonoRegex = /^[\d\s\+\-\(\)]{7,20}$/;
    if (!telefonoRegex.test(telefono)) {
      return res.status(400).json({ success: false, message: 'Formato de teléfono inválido' });
    }

    // Evitar inyección o caracteres peligrosos (sanitize básico)
    const telefonoSanitizado = telefono.replace(/[<>$]/g, '');

    // Actualizar o crear documento incluyendo id_google en el update
    const actualizado = await TelefonoUsuario.findOneAndUpdate(
      { id_google: id_google.trim() },
      { id_google: id_google.trim(), telefono: telefonoSanitizado },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Teléfono guardado correctamente', telefono: actualizado.telefono });
  } catch (error) {
    console.error('Error al guardar teléfono:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    // Validar sesión y rol admin
    if (!req.session?.usuario) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }
    if (req.session.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado: solo admin' });
    }

    const usuarios = await User.find({}, 'nombre email foto').lean(); // Solo campos necesarios
    res.json({ success: true, usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
  }
});


const router = express.Router();
const testRoutes = require('./routes/testRoutes.js');
app.use('/api', testRoutes); // todas las rutas del router se montan en /api
app.get('/api/estadisticas', async (req, res) => {
  try {
    // Validar autenticación y rol admin
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }
    if (!req.user?.rol || req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado: solo admin' });
    }

    const reservas = await Reserva.find({ estado: 'aprobada' }).lean();

    const ingresosMensuales = Array(12).fill(0);
    let totalAnual = 0;

    reservas.forEach(r => {
      if (!r.fecha_inicio || typeof r.precio !== 'number' || r.precio < 0) return;

      const fecha = new Date(r.fecha_inicio);
      if (isNaN(fecha)) return;

      const mes = fecha.getMonth(); // 0 = enero, 11 = diciembre
      ingresosMensuales[mes] += r.precio;
      totalAnual += r.precio;
    });

    res.json({
      success: true,
      meses: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      ingresosMensuales,
      totalAnual
    });
  } catch (err) {
    console.error('Error al calcular estadísticas:', err);
    res.status(500).json({ success: false, message: 'Error al calcular estadísticas' });
  }
});app.get('/api/reservas-por-mes/:mes', async (req, res) => {
  try {
    // Validar que haya sesión y sea admin
    if (!req.session?.usuario) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }
    if (req.session.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado: solo admin' });
    }

    const mes = parseInt(req.params.mes);
    if (isNaN(mes) || mes < 0 || mes > 11) {
      return res.status(400).json({ success: false, message: 'Mes inválido. Debe ser entre 0 y 11.' });
    }

    const reservas = await Reserva.find({ estado: 'aprobada' }).lean();

    const filtradas = reservas.filter(r => {
      if (!r.fecha_inicio) return false;
      const fecha = new Date(r.fecha_inicio);
      if (isNaN(fecha)) return false;
      return fecha.getMonth() === mes;
    });

    res.json({ success: true, reservas: filtradas });
  } catch (err) {
    console.error('Error al filtrar reservas por mes:', err);
    res.status(500).json({ success: false, message: 'Error al filtrar reservas por mes' });
  }
});

global.emailUserGlobal = null; // 🌍 Variable global




// GET /api/profile - obtener datos del usuario logueado sin JWT, usando req.isAuthenticated()
router.get('/api/profile', async (req, res) => {
  try {
    // Verificar si el usuario está autenticado (por ejemplo con Passport)
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.json({
        success: false,
        user: null,
        mensaje: 'No autenticado'
      });
    }

    // Obtener email desde req.user (que provee Passport)
    const email = req.user.email;

    if (!email) {
      return res.status(400).json({ success: false, mensaje: 'Email no encontrado en sesión' });
    }

    // Buscar usuario por email en la base
    const usuario = await Usuario.findOne({ email }).select('nombre email');

    if (!usuario) {
      return res.json({
        success: false,
        user: null,
        mensaje: 'Usuario no encontrado'
      });
    }

    // Enviar datos del usuario
    res.json({
      success: true,
      user: {
        nombre: usuario.nombre,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error('Error en /api/profile:', error);
    res.status(500).json({ success: false, mensaje: 'Error del servidor' });
  }
});





// Middleware para guardar returnUrl seguro en sesión
function validarReturnUrl(req, res, next) {
  const returnUrl = req.query.returnUrl || '/';
  console.log("[validarReturnUrl] returnUrl recibido:", returnUrl);

  // Guardar sin validar para testear (temporal)
  req.session.returnUrl = returnUrl;
  console.log("[validarReturnUrl] returnUrl guardado en sesión:", req.session.returnUrl);
  next();
}
// /auth/google/redirect — guarda el returnUrl en sesión del backend
app.get('/auth/google/redirect', (req, res, next) => {
  // Leemos desde sessionStorage usando un truco con HTML que redirige
  res.send(`
    <html>
      <body>
        <script>
          const returnUrl = sessionStorage.getItem('returnUrl') || '/';
          // Usamos fetch para guardar en sesión del backend
          fetch('/auth/save-return-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ returnUrl })
          }).then(() => {
            window.location.href = '/auth/google';
          });
        </script>
      </body>
    </html>
  `);
});

// Ruta auxiliar que guarda returnUrl en la sesión del backend
app.post('/auth/save-return-url', express.json(), (req, res) => {
  const { returnUrl } = req.body;
  req.session.returnUrl = returnUrl || '/';
  console.log("[save-return-url] returnUrl guardado en sesión:", req.session.returnUrl);
  res.sendStatus(200);
});

// Login Google
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Callback de Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/registro', failureMessage: true }),
  (req, res) => {
    const returnUrl = req.session.returnUrl || '/';
    delete req.session.returnUrl;

    if (typeof req.user?.email !== 'string') {
      console.warn("[callback] Email inválido recibido.");
      return res.status(400).send("Error al obtener el correo.");
    }

    req.session.userEmail = req.user.email;

    console.log("[callback] Login exitoso con Google para:", req.session.userEmail);
    console.log("[callback] Redirigiendo a:", returnUrl);

    res.redirect(returnUrl);
  }
);



// ===========================
// Ruta para cerrar sesión seguro
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) {
      console.error("❌ Error en logout:", err);
      return next(err);
    }
    req.session.destroy(err => {
      if (err) {
        console.error("❌ Error destruyendo sesión:", err);
        return next(err);
      }
      res.redirect('/');
    });
  });
});



const cloudinaryRoutes = require('./routes/cloudinaryRoutes');

app.use(express.json()); // necesario para leer JSON
app.use(cloudinaryRoutes); // montar las rutas
// Configuración Multer (memoria, límite 5MB, solo imágenes jpeg/png/webp)


// Función para sanitizar texto
function sanitizarTexto(text) {
  return String(text).replace(/[<>"'`;()&]/g, '').trim();
}

// Función para validar URL de Cloudinary
function validarUrlCloudinary(url) {
  // Ajusta el dominio a tu cuenta Cloudinary
  const regex = /^https:\/\/res\.cloudinary\.com\/dfqzk9mnm\/image\/upload\/.+$/;
  return regex.test(url);
}
// Ruta para guardar/comprobar comprobante
app.post('/api/guardar-comprobante', upload.single('comprobante'), async (req, res) => {
  const reservaId = String(req.body.reservaId || '').trim();
  const id_propiedad = String(req.body.id_propiedad || '').trim();
  const { url, public_id } = req.body; // si vienen desde frontend (Cloudinary Widget)

  // Validaciones
if ((!req.file) && (!url || !public_id)) {
    console.warn("⚠️ No se subió archivo ni se recibió URL/public_id");
    return res.status(400).json({ success: false, message: "Faltan datos de comprobante" });
  }
  if (!reservaId || !id_propiedad) {
    console.warn("⚠️ Falta reservaId o id_propiedad");
    return res.status(400).json({ success: false, message: "Faltan datos necesarios" });
  }

  try {
    let comprobanteData = {
      reservaId,
      id_propiedad,
      fecha_subida: new Date(),
    };

    // Si se subió archivo con multer
    if (req.file) {
      comprobanteData.archivo = req.file.filename;
    }

    // Si se envió URL/public_id desde frontend
    if (url && public_id) {
      comprobanteData.url = url;
      comprobanteData.public_id = public_id;

      // Logs para verificar
      console.log("URL del comprobante:", url);
      console.log("Public ID:", public_id);
    }

    // Guardar o actualizar en colección 'comprobantes'
    const coleccionComprobantes = mongoose.connection.db.collection('comprobantes');
    const existente = await coleccionComprobantes.findOne({ reservaId });

    if (existente) {
      await coleccionComprobantes.updateOne({ reservaId }, { $set: comprobanteData });
      console.log("♻️ Comprobante actualizado para reserva:", reservaId);
    } else {
      await coleccionComprobantes.insertOne(comprobanteData);
      console.log("📎 Comprobante insertado para reserva:", reservaId);
    }

    // Actualizar estado de la reserva si existe
// Buscar por reservaId (string personalizado)
let reserva = await Reserva.findOne({ reservaId });

// Si no encuentra, probar con el _id de Mongo
if (!reserva && mongoose.Types.ObjectId.isValid(reservaId)) {
  reserva = await Reserva.findById(reservaId);
}
if (reserva) {
  await Reserva.updateOne(
    { _id: reserva._id }, // aseguramos que use el ObjectId real
    {
      $set: {
        estado: 'en revisión',
        comprobanteArchivo: comprobanteData.archivo || comprobanteData.url,
      },
    }
  );
  console.log("✅ Reserva actualizada a 'en revisión' con comprobante");
} else {
  console.log("⚠️ Reserva no encontrada, solo guardado comprobante");
}


    return res.json({ success: true, data: comprobanteData });

  } catch (err) {
    console.error("Error al guardar o actualizar comprobante:", err);
    return res.status(500).json({ success: false, message: "Error al guardar el comprobante" });
  }
});


// Ruta para eliminar imagen
router.post('/api/eliminar-imagen', async (req, res) => {
  let { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: "URL es requerida y debe ser texto" });
  }

  url = sanitizarTexto(url);

  if (!validarUrlCloudinary(url)) {
    return res.status(400).json({ message: "URL no válida o no autorizada" });
  }

  try {
    const parts = url.split('/');
    const filename = parts.pop().split('.')[0];
    const folder = parts.slice(parts.indexOf('upload') + 1).join('/');
    const public_id = `${folder}/${filename}`;

    await cloudinary.uploader.destroy(public_id);
    res.json({ message: "Imagen eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando imagen en Cloudinary:", error);
    res.status(500).json({ message: "Error eliminando imagen" });
  }
});


// Ruta para subir imagen con public_id personalizado
router.post('/api/subir-imagen', upload.single('archivo'), async (req, res) => {
  let public_id = req.body.public_id;

  if (!req.file) {
    return res.status(400).json({ error: 'Archivo es requerido' });
  }
  if (!public_id || typeof public_id !== 'string') {
    return res.status(400).json({ error: 'public_id es requerido y debe ser texto' });
  }

  public_id = sanitizarTexto(public_id);

  if (!/^[a-zA-Z0-9_\-\/]+$/.test(public_id)) {
    return res.status(400).json({ error: 'public_id contiene caracteres no permitidos' });
  }

  try {
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id,
            overwrite: true,
            resource_type: 'image',
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const result = await streamUpload();
    res.json(result);
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    res.status(500).json({ error: 'Error subiendo imagen' });
  }
});

// ACTUALIZAR propiedad por id_propiedad
router.put('/:id_propiedad', async (req, res) => {
  try {
    const { id_propiedad } = req.params;
    const datosActualizados = req.body;

    const propiedad = await Propiedad.findOneAndUpdate(
      { id_propiedad: id_propiedad },
      { $set: datosActualizados },
      { new: true }
    );

    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json({ propiedad });
  } catch (error) {
    console.error("Error al actualizar propiedad:", error);
    res.status(500).json({ error: 'Error del servidor al actualizar' });
  }
});

// 🛡️ Ruta para actualizar propiedad
app.put('/api/propiedades/:id', [
  // Validar y sanear los campos existentes
  body('id_propiedad').optional().trim().escape(),
  body('baños').optional().trim().escape(),
  body('bienvenida').optional().trim().escape(),
  body('desayuno').optional().trim().escape(),
  body('descripcion').optional().trim().escape(),
  body('dormitorios').optional().trim().escape(),
  body('garage').optional().trim().escape(),
  body('kit_higiene').optional().trim().escape(),
  body('nombre').optional().trim().escape(),
  body('precio').optional().trim().escape(),
  body('superficie').optional().trim().escape(),
  body('tipo').optional().trim().escape(),
  body('capacidad').optional().trim().escape(),

  body('ubicacion').optional().isString(),
  body('ubicacion_mapa').optional().isString(),

  body('imagenes').optional().isArray(),
  body('imagenes.*').optional().isString(),

  // ✅ Validar lat y lng como flotantes válidos
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),

], soloAdmin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ Errores al validar actualización:", errors.array());
    return res.status(400).json({ errores: errors.array() });
  }

  const id = req.params.id;
  const datosActualizar = req.body;

  // ✅ Convertir lat/lng a Number si están presentes
  if (datosActualizar.lat !== undefined) {
    datosActualizar.lat = parseFloat(datosActualizar.lat);
    console.log("📍 Latitud recibida:", datosActualizar.lat);
  }

  if (datosActualizar.lng !== undefined) {
    datosActualizar.lng = parseFloat(datosActualizar.lng);
    console.log("📍 Longitud recibida:", datosActualizar.lng);
  }

  try {
    const propiedad = await Propiedad.findOneAndUpdate(
      { id_propiedad: id },
      datosActualizar,
      { new: true }
    );

    if (!propiedad) return res.status(404).json({ mensaje: "Propiedad no encontrada" });

    await generarHtmlPropiedad(propiedad);

    res.json({ propiedad });
  } catch (error) {
    console.error("❌ Error actualizando propiedad:", error);
    res.status(500).json({ mensaje: "Error actualizando propiedad" });
  }
});
app.get('/api/propiedades-con-coordenadas', async (req, res) => {
  try {
    const propiedades = await Propiedad.find({
      lat: { $exists: true },
      lng: { $exists: true }
    });

    res.json({ propiedades });
  } catch (error) {
    console.error("❌ Error al obtener coordenadas:", error);
    res.status(500).json({ mensaje: "Error al obtener propiedades con coordenadas" });
  }
});


// 🏠 Obtener todas las propiedades sin validaciones porque es solo lectura
app.get("/api/propiedades",async (req, res) => {
  try {
    const propiedades = await Propiedad.find();
    res.json(propiedades);
  } catch (error) {
    console.error("❌ Error al obtener propiedades:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


// 🌐 Ruta para servir HTML estático de cada propiedad
app.get('/propiedades/:tipo/:ubicacion/:nombre', (req, res) => {
  const { tipo, ubicacion, nombre } = req.params;
  const filePath = path.join(__dirname, `../html/propiedades/${tipo}/${ubicacion}/${nombre}.html`);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('❌ Archivo no encontrado:', filePath);
      return res.status(404).send('Página no encontrada');
    }

    res.sendFile(filePath); // 🧾 Enviar HTML generado automáticamente
  });
});


// ==============================
// Ruta protegida para crear inventario
app.post('/api/inventarios', [
  body('propiedadId').trim().notEmpty().withMessage("propiedadId requerido"),
  body('objeto').trim().notEmpty().withMessage("objeto requerido"),
  body('cantidad').isNumeric().withMessage("cantidad debe ser un número"),
], async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    console.warn("❌ Error de validación inventario:", errores.array());
    return res.status(400).json({ errores: errores.array() });
  }

  const { propiedadId, objeto, cantidad } = req.body;
  console.log("📦 Recibido:", { propiedadId, objeto, cantidad });

  try {
    const nuevo = new Inventario({ propiedadId, objeto, cantidad });
    await nuevo.save();
    res.json({ mensaje: "Inventario guardado correctamente" });
  } catch (err) {
    console.error("❌ Error al guardar inventario:", err.message);
    res.status(500).json({ error: "Error al guardar el inventario" });
  }
});

// ==============================
// Ruta protegida para consultar inventarios
app.get('/api/inventarios', [
  // Solo validamos que si viene propiedadId sea string y limpio
  query('propiedadId').optional().trim().escape(),
], async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const { propiedadId } = req.query;
    const filtro = propiedadId ? { propiedadId } : {};
    const inventarios = await Inventario.find(filtro);
    res.json(inventarios);
  } catch (err) {
    console.error("❌ Error al obtener inventarios:", err);
    res.status(500).json({ error: "Error al obtener inventarios" });
  }
});


console.log('URI MONGO =>', process.env.MONGO_URI);

// ==========================================
// Conexión a MongoDB
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conexión a MongoDB exitosa'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));
app.use((req, res, next) => {
  if (req.session.usuario) {
    req.user = req.session.usuario; // lo que guardaste al loguear
  }
  next();
});


// 🛡️ Todas las rutas HTML protegidas del panel admin
const rutasAdmin = [ 
  'clientes.html',
  'dashboard.html',
  'descuentos.html',
  'estadisticas.html',
  'propiedades.html',
  'reservas.html',
  'seguridad.html',
];

rutasAdmin.forEach((archivo) => {
  app.get(`/admin/${archivo.replace('.html', '')}`, (req, res) => {
    console.log(`Entró a /admin/${archivo.replace('.html', '')}`);

    if (!req.isAuthenticated?.() || !req.user?.rol || req.user.rol !== 'admin') {
      console.log('Acceso denegado, guardando retorno:', req.originalUrl);
      req.session.returnTo = req.originalUrl;
      return res.redirect('/adminlog.html');
    }

    console.log(`Autenticado y rol admin confirmado para ${archivo}`);
    res.sendFile(path.join(__dirname, '../admin/secciones', archivo));

  });
});
app.use('/archivos', express.static(path.join(__dirname, '../admin/secciones')));
// Sirvo CSS y JS desde la carpeta correcta (ajusta la ruta si es necesario)
app.use('/css', express.static(path.join(__dirname, '../admin/css')));
app.use('/js', express.static(path.join(__dirname, '../admin/js')));

app.get('/admin/admin.html', (req, res) => {
  console.log('➡️ Entró a /admin/admin.html');

  // Verificar autenticación y rol admin
  if (!req.isAuthenticated?.() || !req.user?.rol || req.user.rol !== 'admin') {
    console.log('⛔ Acceso denegado, redirigiendo a login');
    req.session.returnTo = req.originalUrl;
    return res.redirect('/adminlog.html');
  }

  // Si está autenticado y es admin, enviar archivo protegido
  const rutaAbsoluta = path.join(__dirname, '../admin/admin.html');
  res.sendFile(rutaAbsoluta);
});
// Página de login admin
app.get('/adminlog.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/adminlog.html'));
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});


// Ruta POST con validaciones
app.post('/enviarFormulario', [
  body('nombre').trim().notEmpty().escape(),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('telefono').trim().escape(),
  body('ubicacion').trim().escape(),
  body('mensaje').trim().escape()
], (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    console.log('❌ Errores en el formulario:', errores.array());
    return res.status(400).send('Datos inválidos en el formulario.');
  }

  const { nombre, email, telefono, ubicacion, mensaje } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,  // Usar variable segura
    to: 'maisonstate@gmail.com',
    subject: 'Nuevo mensaje desde el formulario',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; padding: 20px; border-radius: 8px; width: 600px; margin: auto;">
        <h2 style="text-align: center; color: #A57A5A;">Nuevo Mensaje desde el Formulario</h2>
        <p style="font-size: 16px; line-height: 1.6;">
          <strong style="color: #8B644D;">Nombre:</strong> ${nombre}<br>
          <strong style="color: #8B644D;">Email:</strong> ${email}<br>
          <strong style="color: #8B644D;">Teléfono:</strong> ${telefono}<br>
          <strong style="color: #8B644D;">Ubicación:</strong> ${ubicacion}<br>
          <strong style="color: #8B644D;">Mensaje:</strong><br>
          <p style="background-color: #fff; padding: 15px; border-radius: 5px; margin-top: 10px; font-style: italic;">
            ${mensaje}
          </p>
        </p>
        <hr style="border-top: 2px solid #A57A5A; margin: 20px 0;">
        <p style="font-size: 14px; text-align: center; color: #888;">Este mensaje fue enviado desde el formulario de contacto en Maison&State.</p>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('❌ Error al enviar correo:', error);
      return res.status(500).send('Hubo un error al enviar el mensaje.');
    }
    console.log('📨 Correo enviado correctamente:', info.response);
    res.send('Gracias por tu mensaje, nos pondremos en contacto contigo pronto.');
  });
});

// Ruta POST para calcular noches entre dos fechas
app.post('/calcular', [
  body('fecha')
    .trim()
    .notEmpty().withMessage('La fecha es obligatoria')
    .matches(/^\d{2}-\d{2}-\d{4}\s+to\s+\d{2}-\d{2}-\d{4}$/)
    .withMessage("El formato debe ser 'dd-mm-yyyy to dd-mm-yyyy'")
], (req, res) => {
  // Validar errores
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    console.warn('❌ Error en fecha recibida:', errores.array());
    return res.status(400).json({ errores: errores.array() });
  }

  const { fecha } = req.body;
  console.log('📆 Fecha recibida:', fecha);

  // Separar fecha de inicio y fin
  const [fecha_inicio_str, fecha_fin_str] = fecha.split(' to ');

  // Función que convierte fecha tipo 'dd-mm-yyyy' a 'yyyy-mm-dd'
  function convertirFecha(fechaStr) {
    const [dia, mes, anio] = fechaStr.split('-');
    return `${anio}-${mes}-${dia}`;
  }

  const inicio = new Date(convertirFecha(fecha_inicio_str));
  const fin = new Date(convertirFecha(fecha_fin_str));

  // Validar que las fechas sean correctas
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return res.status(400).send("❌ Fechas inválidas. Verifica el formato.");
  }

  const diferenciaDias = Math.round((fin - inicio) / (1000 * 3600 * 24));

  if (diferenciaDias <= 0) {
    return res.status(400).send("⚠️ La fecha de salida debe ser posterior a la de entrada.");
  }

  console.log('✅ Días calculados:', diferenciaDias);
  res.json({ noches: diferenciaDias });
});



// GET para /login: simplemente responde que la ruta está activa
app.get("/login", (req, res) => {
  res.send("Ruta de login activa");
});

// POST para /login: proceso de inicio de sesión
app.post("/login", async (req, res) => {
  // Extraemos email y password desde el cuerpo de la petición
  const { email, password } = req.body;

  // Validación simple: verificar que existan ambos datos
  if (!email || !password) {
    // Responder con error si falta alguno
    return res.status(400).json({ success: false, message: "Faltan datos" });
  }

  try {
    // Buscar usuario en la base de datos por email
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      // Si no existe, enviar error 404
      return res.status(404).json({ success: false, message: "Usuario no registrado" });
    }

    // Comparar password ingresado con el hash almacenado
    const passwordValido = await bcrypt.compare(password, usuario.password);

    if (!passwordValido) {
      // Si no coincide, enviar error 401 (no autorizado)
      return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
    }

    // Si todo ok, devolver datos del usuario (sin password)
    res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      users: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        foto: usuario.foto,
        termsAcceptedAt: usuario.termsAcceptedAt,
      },
    });
  } catch (error) {
    // En caso de error interno, mostrar en consola y responder 500
    console.error("Error en login:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

const mercadopago = require('mercadopago');

mercadopago.configurations = {
  access_token: 'TEST-8902375059177492-062014-47c298b4319c7371be9a3549f5ba730b-445763134'
};
// Función para crear preferencia de pago
async function crearPreferencia(monto) {
  const preference = {
    items: [
      {
        title: 'Reserva MaisonState',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: monto
      }
    ],
    back_urls: {
      success: 'https://tuweb.com/success',
      failure: 'https://tuweb.com/failure',
      pending: 'https://tuweb.com/pending'
    },
    auto_return: 'approved'
  };

  const respuesta = await mercadopago.preferences.create(preference);
  return respuesta.body.init_point; // URL para redirigir a Mercado Pago
}

// Ruta para crear preferencia
app.get('/crear-preferencia', async (req, res) => {
  try {
    const urlPago = await crearPreferencia(700000); // monto fijo $700,000
    res.json({ init_point: urlPago });
  } catch (error) {
    console.error('❌ Error al crear preferencia:', error);
    res.status(500).json({ error: 'Error al crear preferencia' });
  }
});

function esTemporadaActualValida(tipo) {
  // Obtiene el mes actual (0-11) y le suma 1 para que sea 1-12
  const mes = new Date().getMonth() + 1;

  // Si el tipo es 'alta', valida que el mes esté en [12, 1, 2, 7]
  if (tipo === 'alta') return [12, 1, 2, 7].includes(mes);

  // Si el tipo es 'baja', valida que el mes esté en [3,4,5,6,8,9,10,11]
  if (tipo === 'baja') return [3, 4, 5, 6, 8, 9, 10, 11].includes(mes);

  // Si no es ninguno de esos tipos, devuelve falso
  return false;
}

// Middleware para parsear JSON en las peticiones
app.use(express.json());

// Definición del esquema Mongoose para "Descuento"
const descuentoSchema = new mongoose.Schema({
  nombre: String,                // Nombre del descuento
  porcentaje: Number,            // Porcentaje de descuento
  aplicacion: String,            // Puede ser: "todas", "zona", "temporada", "individual"
  zona: { type: String, default: null },     // Zona a la que aplica (opcional)
  temporada: { type: String, default: null },// Temporada a la que aplica (opcional)
  ids: { type: [String], default: [] },      // IDs individuales a los que aplica (array de strings)
  fecha_inicio: Date,            // Fecha de inicio de validez
  fecha_fin: Date,               // Fecha de fin de validez
  fecha_creacion: { type: Date, default: Date.now } // Fecha de creación automática
});

// Modelo Mongoose "Descuento" basado en el esquema anterior
const Descuento = mongoose.model('Descuento', descuentoSchema);
/// === POST: Aplicar descuento (por zona, temporada, todas o por ID) ===
app.post('/api/descuentos', [
  body('porcentaje').isFloat({ gt: 0 }).withMessage('Porcentaje debe ser un número mayor a 0'),
  body('zona').optional().isString().trim().escape(),
  body('temporada').optional().isIn(['alta', 'baja']),
  body('ids').optional().isArray(),
  body('ids.*').optional().isString().trim().escape(),
  body('nombre').optional().isString().trim().escape(),
  body('fecha_inicio').optional().isISO8601(),
  body('fecha_fin').optional().isISO8601()
], soloAdmin,async (req, res) =>  {
  try {
    console.log("📡 [POST] /api/descuentos llamado con body:", req.body);

    // Extraer datos del body
const ids = Array.isArray(req.body.ids) ? req.body.ids.map(id => String(id).trim()) : [];
    const porcentaje = parseFloat(req.body.porcentaje) || 0;
    const temporada = req.body.temporada || null;
    const zona = req.body.zona || null;
const fechaInicio = req.body.fecha_inicio ? new Date(req.body.fecha_inicio) : null;
const fechaFin = req.body.fecha_fin ? new Date(req.body.fecha_fin) : null;

if ((fechaInicio && isNaN(fechaInicio.getTime())) || (fechaFin && isNaN(fechaFin.getTime()))) {
  return res.status(400).json({ mensaje: 'Fechas inválidas' });
}

    const nombre = req.body.nombre || '';
    
    console.log("📊 Datos recibidos:", { ids, porcentaje, temporada, zona, fechaInicio, fechaFin, nombre });

    if (porcentaje <= 0) {
      console.warn("⚠️ Porcentaje inválido:", porcentaje);
      return res.status(400).json({ mensaje: 'Porcentaje inválido.' });
    }

    // Guardar registro del descuento en la colección descuentos
    const nuevoDescuento = new Descuento({
      nombre,
      porcentaje,
      aplicacion: zona === "__ALL__" ? 'todas' : temporada ? 'temporada' : (ids.length > 0 ? 'individual' : zona ? 'zona' : ''),
      zona: zona === "__ALL__" ? null : zona,
      temporada,
      ids: Array.isArray(ids) ? ids : [ids],
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    });

    await nuevoDescuento.save();
    console.log("✅ Registro de descuento guardado:", nuevoDescuento);

    // === TODAS LAS PROPIEDADES ===
    if (zona === "__ALL__") {
      console.log("🌐 Aplicando descuento a TODAS las propiedades");
      const propiedades = await Propiedad.find();
      console.log(`📦 ${propiedades.length} propiedades encontradas`);

      for (const prop of propiedades) {
        const precioOriginal = parseFloat(prop.precio);
        if (!prop.precio_original || prop.precio_original === 0) {
          prop.precio_original = precioOriginal;
        }
        const nuevoPrecio = precioOriginal - (precioOriginal * (porcentaje / 100));
        prop.precio = Math.round(nuevoPrecio);
        await prop.save();
        console.log(`💸 ${prop.nombre} → $${prop.precio}`);
      }

      if (fechaFin) {
        const ms = fechaFin.getTime() - Date.now();
        console.log(`⏳ Restaurar en ${ms}ms (${fechaFin.toISOString()})`);
        if (ms > 0) {
          setTimeout(async () => {
            const todas = await Propiedad.find({ precio_original: { $gt: 0 } });
            for (const prop of todas) {
              prop.precio = prop.precio_original;
              prop.precio_original = 0;
              await prop.save();
              console.log(`🔄 Restaurado ${prop.nombre}`);
            }
            console.log("✅ Restaurados precios de TODAS las propiedades");
          }, ms);
        }
      }

      return res.json({ mensaje: `Descuento aplicado a todas las propiedades`, cantidad: propiedades.length });
    }

    // === POR ZONA ===
    if (zona && zona !== "__ALL__") {
      console.log("📍 Aplicando descuento a zona:", zona);
      const propiedades = await Propiedad.find({ ubicacion: new RegExp(zona, 'i') });
      console.log(`🔎 Encontradas ${propiedades.length} propiedades en zona.`);

      if (!propiedades.length) {
        return res.status(404).json({ mensaje: 'No se encontraron propiedades en esa zona.' });
      }

      for (const prop of propiedades) {
        const precioOriginal = parseFloat(prop.precio);
        if (!prop.precio_original || prop.precio_original === 0) {
          prop.precio_original = precioOriginal;
        }
        const nuevoPrecio = precioOriginal - (precioOriginal * (porcentaje / 100));
        prop.precio = Math.round(nuevoPrecio);
        await prop.save();
        console.log(`🏠 ${prop.nombre} actualizado a $${prop.precio}`);
      }

      if (fechaFin) {
        const ms = fechaFin.getTime() - Date.now();
        console.log(`⏳ Restaurar zona "${zona}" en ${ms}ms`);

        if (ms > 0) {
          setTimeout(async () => {
            const restaurar = await Propiedad.find({ ubicacion: new RegExp(zona, 'i') });
            for (const prop of restaurar) {
              if (prop.precio_original) {
                prop.precio = prop.precio_original;
                prop.precio_original = 0;
                await prop.save();
                console.log(`🔄 Restaurado ${prop.nombre}`);
              }
            }
            console.log(`✅ Restaurados precios de zona "${zona}"`);
          }, ms);
        }
      }

      return res.json({ mensaje: `Descuento aplicado a zona ${zona}`, cantidad: propiedades.length });
    }

    // === POR TEMPORADA ===
    if (temporada) {
      console.log("📆 Verificando temporada y día de aplicación:", temporada);

      const fechaActual = new Date();
      const dia = fechaActual.getDate();
      const mes = fechaActual.getMonth() + 1; // 1-12

      const alta = [12, 1, 2, 7];
      const baja = [3, 4, 5, 6, 8, 9, 10, 11];

      // Aplicar solo si hoy es el primer día del mes y el mes corresponde a la temporada
      const esMesValido = (temporada === "alta" && alta.includes(mes)) || (temporada === "baja" && baja.includes(mes));

      if (!(dia === 1 && esMesValido)) {
        console.warn(`❌ Hoy no es el primer día del mes o la temporada no coincide (día: ${dia}, mes: ${mes})`);
        return res.status(400).json({ mensaje: 'El descuento por temporada solo se aplica el primer día del mes correspondiente.' });
      }

      const propiedades = await Propiedad.find();
      console.log(`📦 ${propiedades.length} propiedades afectadas por temporada`);

      for (const prop of propiedades) {
        const precioOriginal = parseFloat(prop.precio);
        if (!prop.precio_original || prop.precio_original === 0) {
          prop.precio_original = precioOriginal;
        }
        const nuevoPrecio = precioOriginal - (precioOriginal * (porcentaje / 100));
        prop.precio = Math.round(nuevoPrecio);
        await prop.save();
        console.log(`🏖️ ${prop.nombre} → $${prop.precio}`);
      }

      if (fechaFin) {
        const ms = fechaFin.getTime() - Date.now();
        console.log(`⏳ Restaurar temporada en ${ms}ms`);

        if (ms > 0) {
          setTimeout(async () => {
            const restaurar = await Propiedad.find({ precio_original: { $gt: 0 } });
            for (const prop of restaurar) {
              prop.precio = prop.precio_original;
              prop.precio_original = 0;
              await prop.save();
              console.log(`🔄 Restaurado ${prop.nombre}`);
            }
            console.log(`✅ Restaurados precios de temporada "${temporada}"`);
          }, ms);
        }
      }

      return res.json({ mensaje: `Descuento aplicado por temporada ${temporada}`, cantidad: propiedades.length });
    }

    // === POR ID (Aplicar descuento real) ===
    if (ids && ids.length > 0) {
      // Aseguramos que ids sea un array
      const listaIds = Array.isArray(ids) ? ids : [ids];

      console.log("🎯 Aplicando descuento a propiedades con IDs:", listaIds);

      const propiedades = await Propiedad.find({ id_propiedad: { $in: listaIds } });

      if (!propiedades.length) {
        return res.status(404).json({ mensaje: 'No se encontraron propiedades con esos IDs.' });
      }

      for (const prop of propiedades) {
        const precioOriginal = parseFloat(prop.precio);
        if (!prop.precio_original || prop.precio_original === 0) {
          prop.precio_original = precioOriginal;
        }
        const nuevoPrecio = precioOriginal - (precioOriginal * (porcentaje / 100));
        prop.precio = Math.round(nuevoPrecio);
        await prop.save();
        console.log(`🏠 ${prop.nombre} actualizado a $${prop.precio}`);
      }

      return res.json({ mensaje: `Descuento aplicado a propiedades individuales`, cantidad: propiedades.length });
    }

    console.warn("⚠️ Ningún parámetro válido fue enviado");
    return res.status(400).json({ mensaje: 'Faltan parámetros válidos.' });

  } catch (error) {
    console.error('💥 Error aplicando descuento:', error);
    res.status(500).json({ mensaje: 'Error del servidor.' });
  }
});


// === CRON para restaurar descuentos vencidos ===
cron.schedule('* * * * *', async () => {

  try {
    // Buscar descuentos vencidos
    const descuentosVencidos = await Descuento.find({ fecha_fin: { $lt: new Date() } });

    for (const descuento of descuentosVencidos) {
      console.log(`🔄 Restaurando descuento: ${descuento.nombre} (${descuento._id})`);

      if (descuento.aplicacion === 'todas') {
        // Restaurar todas las propiedades con precio_original > 0
        const propiedades = await Propiedad.find({ precio_original: { $gt: 0 } });
        for (const prop of propiedades) {
          prop.precio = prop.precio_original;
          prop.precio_original = 0;
          await prop.save();
          console.log(`✔️ Restaurado ${prop.nombre}`);
        }

      } else if (descuento.aplicacion === 'zona' && descuento.zona) {
        // Sanitizar zona para RegExp
        const zonaSegura = descuento.zona.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const propiedades = await Propiedad.find({ ubicacion: new RegExp(zonaSegura, 'i'), precio_original: { $gt: 0 } });
        for (const prop of propiedades) {
          prop.precio = prop.precio_original;
          prop.precio_original = 0;
          await prop.save();
          console.log(`✔️ Restaurado ${prop.nombre}`);
        }

      } else if (descuento.aplicacion === 'temporada') {
        const propiedades = await Propiedad.find({ precio_original: { $gt: 0 } });
        for (const prop of propiedades) {
          prop.precio = prop.precio_original;
          prop.precio_original = 0;
          await prop.save();
          console.log(`✔️ Restaurado ${prop.nombre}`);
        }

      } else if (descuento.aplicacion === 'individual' && descuento.ids.length > 0) {
        // Sanitizar ids asegurando array de strings limpios
        const idsSeguros = Array.isArray(descuento.ids) 
          ? descuento.ids.map(id => String(id).trim()) 
          : [];

        const propiedades = await Propiedad.find({ id_propiedad: { $in: idsSeguros }, precio_original: { $gt: 0 } });
        for (const prop of propiedades) {
          prop.precio = prop.precio_original;
          prop.precio_original = 0;
          await prop.save();
          console.log(`✔️ Restaurado ${prop.nombre}`);
        }
      }

      // Eliminar descuento para no repetir restauración
      await Descuento.findByIdAndDelete(descuento._id);
      console.log(`🗑️ Descuento ${descuento.nombre} eliminado tras restaurar`);
    }

  } catch (error) {
    console.error('❌ Error en tarea cron de restauración:', error);
  }
});


const adminRoutes = require('./routes/admin/ninja-tuna');
app.use('/admin', adminRoutes);
const authAdmin = require('./middlewares/authAdmin.js'); // ruta según donde guardes el middleware

// Ruta protegida para los archivos de secciones del admin
app.get('/admin/:seccion', (req, res) => {
  // 🔐 Verificación de sesión y rol admin
  if (!req.isAuthenticated?.() || !req.user || req.user.rol !== 'admin') {
    console.log('🚫 Acceso no autorizado, redirigiendo al login...');
    return res.redirect('/adminlog.html');
  }

  // Nombre de la página sin extensión
  const pagina = req.params.seccion;

  // Ruta absoluta segura al archivo HTML
  const archivo = path.resolve(__dirname, '../admin/secciones', `${pagina}.html`);

  // Verificar existencia del archivo
  if (!fs.existsSync(archivo)) {
    console.log('❌ Archivo no encontrado:', archivo);
    return res.status(404).send('Archivo no encontrado');
  }

  // ✅ Enviar el archivo HTML si está autorizado y existe
  res.sendFile(archivo);
});
// 📍 GET /api/propiedades/por-zona?zona=Tanti&id_excluir=123
// ✅ Ruta que devuelve propiedades similares por zona
app.get('/api/propiedades/por-zona', async (req, res) => {
  const { zona, id_excluir } = req.query;

  try {
    const propiedades = await Propiedad.find({
      ubicacion: new RegExp(zona, 'i'),
      id_propiedad: { $ne: id_excluir }
    }).limit(4);

    res.json(propiedades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al buscar propiedades por zona" });
  }
});


const sanitize = require('sanitize-html'); // O cualquier función que uses para sanitizar



app.get('/api/filtrar', [
  query('ubicacion').optional().trim().escape(),
  query('checkin').optional().isISO8601().toDate(),
  query('checkout').optional().isISO8601().toDate(),
  query('personas').optional().isInt({ min: 1 }).toInt(),
  query('tipos').optional().trim(),
  query('precioMin').optional().isFloat({ min: 0 }).toFloat(),
  query('precioMax').optional().isFloat({ min: 0 }).toFloat(),
  query('dormitorios').optional().isInt({ min: 0 }).toInt(),
  query('banos').optional().isInt({ min: 0 }).toInt(),
  query('servicios').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }

  const ubicacion = req.query.ubicacion ? req.query.ubicacion.trim() : null;
  const personas = req.query.personas || null;
  const tipos = req.query.tipos ? sanitize(req.query.tipos).toLowerCase().split(',').map(t => t.trim()).filter(t => t) : [];
  const dormitorios = req.query.dormitorios || 0;
  const banos = req.query.banos || 0;
  const servicios = req.query.servicios ? sanitize(req.query.servicios).toLowerCase().split(',').map(s => s.trim()).filter(s => s) : [];

  let precioMin = req.query.precioMin || 0;
  let precioMax = req.query.precioMax || Number.MAX_SAFE_INTEGER;
  if (!precioMax || precioMax <= 0 || precioMax < precioMin) precioMax = Number.MAX_SAFE_INTEGER;

  const checkin = req.query.checkin ? new Date(req.query.checkin) : null;
  const checkout = req.query.checkout ? new Date(req.query.checkout) : null;

  try {
    const filtro = {};
    const exprFilters = [];

    if (ubicacion) {
      filtro.ubicacion = { $regex: new RegExp(ubicacion, 'i') };
    }
    if (personas) exprFilters.push({ $gte: [{ $toInt: "$capacidad" }, personas] });
    if (tipos.length > 0) filtro.tipo = { $in: tipos };
    if (precioMin >= 0) filtro.precio = { $gte: precioMin, $lte: precioMax };
    if (dormitorios > 0) exprFilters.push({ $gte: [{ $toInt: "$dormitorios" }, dormitorios] });
    if (banos > 0) exprFilters.push({ $gte: [{ $toInt: "$baños" }, banos] });
    if (servicios.length > 0) filtro.servicios = { $all: servicios };

    if (exprFilters.length === 1) filtro.$expr = exprFilters[0];
    else if (exprFilters.length > 1) filtro.$expr = { $and: exprFilters };

    // Buscar propiedades iniciales
    let propiedadesFiltradas = await Propiedad.find(filtro);

    // --- FILTRO POR FECHAS BLOQUEADAS ---
    if (checkin && checkout) {
      const bloqueos = await Bloqueo.find({
        fecha_inicio: { $lte: checkout },
        fecha_fin: { $gte: checkin }
      }).lean();

      const propiedadesBloqueadas = new Set(bloqueos.map(b => b.id_propiedad));
      propiedadesFiltradas = propiedadesFiltradas.filter(p => !propiedadesBloqueadas.has(p.id_propiedad));
    }

    res.json(propiedadesFiltradas);

  } catch (error) {
    console.error('Error al filtrar propiedades:', error);
    res.status(500).json({ error: 'Error al filtrar propiedades' });
  }
});
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // La clave la guardas en variables de entorno (seguridad)
});

// ========================
// Ruta del chatbot
// ========================
// ----------------------------
// Ruta mejorada del chatbot
// ----------------------------
// Ruta mejorada del chatbot
// ----------------------------
// ----------------------------
// Cache temporal
// ----------------------------


const cache = {};

// ----------------------------
// Rate limiter para /chat
// ----------------------------
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20,             // máximo 20 requests por IP por minuto
  message: "⚠️ Demasiadas solicitudes. Espera un momento e intenta de nuevo."
});

// ========================
// Endpoint del chatbot protegido
// ========================
app.post("/chat", chatLimiter, async (req, res) => {
  try {
    let { message, userId } = req.body;

    // ----------------------------
    // Sanitización estricta
    // ----------------------------
    message = String(message || "").trim().substring(0, 300);
    if (!message) return res.status(400).json({ reply: "Por favor, escribe un mensaje válido." });

    // ----------------------------
    // Revisar cache
    // ----------------------------
    if (cache[message]) return res.json({ reply: cache[message] });

    // ----------------------------
    // Detectar propiedad mencionada
    // ----------------------------
    const propiedadesDB = await Propiedad.find({}).limit(100); // todas para búsqueda por nombre
    let propiedad = null;
    for (let p of propiedadesDB) {
      if (message.toLowerCase().includes(p.nombre.toLowerCase())) {
        propiedad = p;
        break;
      }
    }

    // ----------------------------
    // Responder según lo solicitado
    // ----------------------------
    let reply = "";
    if (propiedad) {
      // Intento de detectar qué pide el usuario
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("servicios") || lowerMsg.includes("incluye")) {
        reply = `Servicios de ${propiedad.nombre}:
Wifi: ${propiedad.wifi || "No"}
Pileta: ${propiedad.pileta || "No"}
Cochera: ${propiedad.cochera || "No"}
Aire acondicionado: ${propiedad.aireAcondicionado || "No"}
Desayuno incluido: ${propiedad.desayuno || "No"}`;
      } else if (lowerMsg.includes("objetos") || lowerMsg.includes("electrodomésticos") || lowerMsg.includes("muebles")) {
        reply = `Objetos de ${propiedad.nombre}:
Cafetera: ${propiedad.cafetera || "No"}
Microondas: ${propiedad.microondas || "No"}
Heladera: ${propiedad.heladera || "No"}
Lavarropas: ${propiedad.lavarropas || "No"}
Televisión: ${propiedad.tv || "No"}`;
      } else if (lowerMsg.includes("precio")) {
        reply = `Precio por día de ${propiedad.nombre}: $${propiedad.precio || "Consultar"}`;
      } else if (lowerMsg.includes("capacidad")) {
        reply = `Capacidad de ${propiedad.nombre}: ${propiedad.capacidad || "No especificada"} personas`;
      } else if (lowerMsg.includes("dormitorios")) {
        reply = `Dormitorios de ${propiedad.nombre}: ${propiedad.dormitorios || "No especificado"}`;
      } else if (lowerMsg.includes("baños") || lowerMsg.includes("banos")) {
        reply = `Baños de ${propiedad.nombre}: ${propiedad.baños || "No especificado"}`;
      } else if (lowerMsg.includes("garage") || lowerMsg.includes("cochera")) {
        reply = `Garage de ${propiedad.nombre}: ${propiedad.garage || "No"}`;
      } else if (lowerMsg.includes("superficie")) {
        reply = `Superficie de ${propiedad.nombre}: ${propiedad.superficie || "No especificada"}`;
      } else {
        // Respuesta general corta
        reply = `${propiedad.nombre}
Ubicación: ${propiedad.ubicacion}
Precio: $${propiedad.precio || "Consultar"}
Capacidad: ${propiedad.capacidad || "No especificada"} personas
Dormitorios: ${propiedad.dormitorios || "No especificado"}
Baños: ${propiedad.baños || "No especificado"}
Garage: ${propiedad.garage || "No"}`;
      }
    } else {
      reply = "No encontré la propiedad que mencionas. Intenta con el nombre exacto.";
    }

    // ----------------------------
    // Guardar en cache temporal
    // ----------------------------
    cache[message] = reply;
    setTimeout(() => delete cache[message], 1000 * 60 * 5);

    // ----------------------------
    // Enviar respuesta
    // ----------------------------
    res.json({ reply });

  } catch (error) {
    console.error("Error chatbot:", error);
    res.status(500).json({
      reply: "Lo siento, ahora no puedo responder. Intenta nuevamente en unos segundos."
    });
  }
});






// Inicializamos el cliente con la API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
// Ruta para procesar búsqueda IA
// Ruta para procesar búsqueda IA
app.post('/buscarIA', async (req, res) => {
  const { descripcion } = req.body;

  if (!descripcion) {
    console.warn("⚠️ No hay descripción enviada");
    return res.status(400).json({ error: "No hay descripción" });
  }

  try {
    // -------- Llamada a la API de OpenAI --------
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `Extrae las palabras clave importantes de la frase en formato JSON válido.
Convierte números escritos en palabras a números (ejemplo: 'dos baños' → '2 baños').
Si hay fechas, devuélvelas como 'checkin' y 'checkout' en formato YYYY-MM-DD.
IMPORTANTE: Las fechas deben ser **posteriores a septiembre de 2025**, incluso si el texto menciona fechas anteriores.
Si se menciona un precio, determina:
- precioMin: si dice "desde X pesos" o "mínimo X"
- precioMax: si dice "hasta Y pesos" o "máximo Y"

Clasifica correctamente:
- "servicios": wifi, pileta, cochera, aire acondicionado, desayuno incluido, etc.
- "objetos": electrodomésticos o muebles como lavarropas, microondas, heladera, cafetera, televisión, etc.

Estructura del JSON:
{
  "ubicacion": "...",
  "banos": numero,
  "personas": numero,
  "servicios": ["..."],
  "objetos": ["..."],
  "checkin": "YYYY-MM-DD",
  "checkout": "YYYY-MM-DD",
  "precioMin": numero,
  "precioMax": numero
}
`
          },
          { role: "user", content: descripcion }
        ],
        temperature: 0
      });
    } catch (apiError) {
      console.error("💥 Error llamando a OpenAI:", apiError);
      return res.json({ data: {}, url: `properties.html` });
    }

    // -------- Parseamos el JSON que devuelve la IA --------
    let data = {};
    try {
      data = JSON.parse(response.choices[0].message.content.trim());
    } catch (parseError) {
      console.warn("⚠️ IA devolvió JSON inválido:", response.choices[0].message.content);
      data = {};
    }
const normalizarNumero = (valor, fallback = null) => {
  if (valor === null || valor === undefined) return fallback;
  const num = parseInt(valor, 10);
  return isNaN(num) ? fallback : num;
};

const personas = normalizarNumero(data.personas);
const banos = normalizarNumero(data.banos);

    const precioMin = data.precioMin ? parseInt(data.precioMin, 10) : undefined;
    const precioMax = data.precioMax ? parseInt(data.precioMax, 10) : undefined;

// -------- Fechas tal cual las devuelve la IA --------
let checkin = data.checkin || "";
let checkout = data.checkout || "";

if (checkin) {
  const fechaIn = new Date(checkin);
  console.log("📅 Checkin:", checkin, "→ Día de la semana:", fechaIn.toLocaleDateString('es-AR', { weekday: 'long' }));
}

if (checkout) {
  const fechaOut = new Date(checkout);
  console.log("📅 Checkout:", checkout, "→ Día de la semana:", fechaOut.toLocaleDateString('es-AR', { weekday: 'long' }));
}

    // -------- Mapear ubicación a localidades válidas --------
    const localidades = [
      "Villa Carlos Paz",
      "Cabalango",
      "Tanti",
      "Villa Parque Siquiman",
      "Villa General Belgrano"
    ];

    const mapLocalidad = (input) => {
      if (!input) return "";
      input = input.toLowerCase();
      const match = localidades.find(loc => loc.toLowerCase().includes(input) || input.includes(loc.toLowerCase()));
      return match || "";
    };
    data.ubicacion = mapLocalidad(data.ubicacion);

    // -------- Construimos la URL con parámetros --------
    const urlParams = new URLSearchParams();
if (data.ubicacion) urlParams.set("ubicacion", data.ubicacion);
if (personas != null) urlParams.set("personas", personas);
if (banos != null) urlParams.set("banos", banos);
if (precioMin != null) urlParams.set("precioMin", precioMin);
if (precioMax != null) urlParams.set("precioMax", precioMax);
if (checkin) urlParams.set("checkin", checkin);
if (checkout) urlParams.set("checkout", checkout);


    const url = `properties.html?${urlParams.toString()}`;

    console.log("🔹 Palabras clave estructuradas:", data);
    console.log("🌐 URL generada:", url);

    res.json({ data, url });

  } catch (error) {
    console.error("💥 Error procesando búsqueda IA:", error);
    res.json({ data: {}, url: "properties.html" });
  }
});


// ==========================================
// Iniciar servidor
server.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});