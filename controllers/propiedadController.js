// admin/controllers/propiedadController.js

const fs = require('fs');
const path = require('path');

// Ruta donde se guardarán los archivos HTML individuales por propiedad (carpeta html a la par de backend)
const RUTA_BASE = path.join(__dirname, '../../html/propiedades');

// Ruta al archivo que contiene la grilla donde insertar las tarjetas
const RUTA_PROPERTIES_HTML = path.join(__dirname, '../../html/properties.html');

// Línea donde querés insertar las nuevas tarjetas
const LINEA_INSERCION = 332;


// Crear nueva propiedad
const crearPropiedad = async (req, res) => {
  try {
    const datos = req.body;
    const nuevaPropiedad = new Propiedad(datos);
    await nuevaPropiedad.save();
    await generarHtmlPropiedad(nuevaPropiedad.toObject());
    res.status(201).json({ mensaje: '✅ Propiedad creada y HTML generado' });
  } catch (error) {
    console.error('❌ Error al crear propiedad:', error);
    res.status(500).json({ mensaje: 'Error al crear propiedad' });
  }
};

// Actualizar propiedad existente
const actualizarPropiedad = async (req, res) => {
  try {
    const id = req.params.id;
    const nuevosDatos = req.body;
    const propiedadActualizada = await Propiedad.findOneAndUpdate(
      { id_propiedad: id },
      nuevosDatos,
      { new: true }
    );

    if (!propiedadActualizada) {
      return res.status(404).json({ mensaje: 'Propiedad no encontrada' });
    }

    await generarHtmlPropiedad(propiedadActualizada.toObject());
    res.status(200).json({ mensaje: '✅ Propiedad actualizada', propiedad: propiedadActualizada });
  } catch (error) {
    console.error('❌ Error al actualizar propiedad:', error);
    res.status(500).json({ mensaje: 'Error al actualizar propiedad' });
  }
};
// Función para limpiar strings para rutas y nombres de archivo
function limpiarString(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generarHtmlPropiedad(propiedad) {
  const {
    _id,
    id_propiedad,
    baños,
    bienvenida,
    desayuno,
    descripcion,
    dormitorios,
    garage,
    imagenes = [],
    kit_higiene,
    nombre,
    precio,
    superficie,
    tipo,
    ubicacion,
    ubicacion_mapa,
    capacidad
  } = propiedad;

  const nombre_limpio = limpiarString(nombre);
  const tipo_limpio = limpiarString(tipo);
  const ubicacion_limpio = limpiarString(ubicacion);

  const ruta_html = path.join(RUTA_BASE, tipo_limpio, ubicacion_limpio, `${nombre_limpio}.html`);
  fs.mkdirSync(path.dirname(ruta_html), { recursive: true });

  const imagenes_html = imagenes.map(url => `
    <div class="item">
      <img src="${url}" class="radius-10 mb-24" alt="${nombre}">
    </div>`).join('\n');

  const contenido_html = `<!DOCTYPE html>
<html lang="en">
    
    <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="Maison&State - ${nombre}, ${ubicacion}">
    <title>${nombre} - ${ubicacion}</title>

    <!-- Favicon -->
    <link rel="shortcut icon" type="image/x-icon" href="../../../assets/media/favicon-dark.png">

    <!-- All CSS files -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../../../assets/css/vendor/bootstrap.min.css">
    <link rel="stylesheet" href="../../../assets/css/vendor/font-awesome.css">
    <link rel="stylesheet" href="../../../assets/css/vendor/slick.css">
    <link rel="stylesheet" href="../../../assets/css/vendor/slick-theme.css">
    <link rel="stylesheet" href="../../../assets/css/vendor/sal.css">
    <link rel="stylesheet" href="../../../assets/css/vendor/ionrangeslider.css">
    <link rel="stylesheet" href="../../../assets/css/vendor/classic.date.css">
    <link rel="stylesheet" href="../../../assets/css/vendor/classic.css">
    <link rel="stylesheet" href="../../../assets/css/app.css">
    

    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-266165434-1"></script>

</head>

  <!-- Flatpickr -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/es.js"></script>

  
  


<!-- Flatpickr en el script -->
<script>
  flatpickr("#fechaInicio", {
    dateFormat: "Y-m-d",
    locale: "es", // idioma español
    minDate: "today",
    onChange: function (selectedDates) {
      const finPicker = document.getElementById("fechaFin")._flatpickr;
      finPicker.set("minDate", selectedDates[0]);
      finPicker.open();
    }
  });

  flatpickr("#fechaFin", {
    dateFormat: "Y-m-d",
    locale: "es",
    minDate: "today"
  });
  </script>
  

    <body class="ui-smooth-scroll">

        
        <!-- Back To Top Start -->
        <a href="#main-wrapper" id="backto-top" class="back-to-top">
            <i class="fas fa-angle-up"></i>
        </a>
        <!-- Main Wrapper Start -->
        <div id="main-wrapper" class="main-wrapper overflow-hidden">
            <div id="scroll-container">
                <!-- Header Area Start -->
                <header class="header st-1">
                    <div class="container"> 
                        <nav class="navbar navbar-expand-xl align-items-xl-center align-items-start p-0">
                            
                            <div class="col-xl-3 ">
                                <a class="navbar-brand" href="/"><img alt=""  src="../../../assets/media/logo.png"></a>
                            </div>
                            <div class="col-xl-6 text-end">
                                <button class="navbar-toggler " type="button" data-bs-toggle="collapse" data-bs-target="#mynavbar">
                                    <i class="fas fa-bars"></i>
                                </button>
                                <div class="collapse navbar-collapse justify-content-center text-start" id="mynavbar">
                                    <ul class="navbar-nav mainmenu m-0">
      <!-- Búsqueda Tradicional -->
<form id="busquedaTradicional" class="busqueda-container">
  <div class="campo">
    <label for="localidad">Lugar</label>
    <div class="dropdown-wrapper">
      <div class="dropdown-display" id="dropdownDisplay">
        <input id="dropdownText" placeholder="¿Adónde?" 
          style="border: none; outline: none; background: transparent; width: 100%; font-size: 1rem;" />
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
      <div class="dropdown-options" id="dropdownOptions">
        <div class="dropdown-option" data-value="Villa Carlos Paz">Villa Carlos Paz</div>
        <div class="dropdown-option" data-value="Cabalango">Cabalango</div>
        <div class="dropdown-option" data-value="Tanti">Tanti</div>
        <div class="dropdown-option" data-value="Villa Parque Siquiman">Villa Parque Siquiman</div>
      </div>
      <!-- ⚡ ESTE es el select que realmente existe -->
      <select name="localidad" id="localidad" class="dropdown-hidden-select">
        <option value="">¿Adónde?</option>
        <option value="Villa Carlos Paz">Villa Carlos Paz</option>
        <option value="Cabalango">Cabalango</option>
        <option value="Tanti">Tanti</option>
        <option value="Villa Parque Siquiman">Villa Parque Siquiman</option>
      </select>
    </div>
  </div>

  <div class="campo">
    <label for="fechaInicio">Desde</label>
    <input type="text" id="fechaInicio" name="fechaInicio" required placeholder="¿Cuándo?">
  </div>

  <div class="campo">
    <label for="fechaFin">Hasta</label>
    <input type="text" id="fechaFin" name="fechaFin" required placeholder="¿Cuándo?">
  </div>

  <div class="campo">
    <label for="personas">Viajeros</label>
    <input type="number" name="personas" id="personas" min="1" placeholder="¿Cuántos?">
  </div>

  <!-- Botón de búsqueda -->
  <button type="submit" class="boton-busqueda" aria-label="Buscar">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" 
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="10" cy="10" r="7"/>
      <line x1="15" y1="15" x2="21" y2="21"/>
    </svg>
  </button>
</form>


                                    </ul>
                                </div>
                            </div>
                            <div class="col-xl-3 d-xl-block d-none text-end">
                                <div id="user-info" style="display: flex; gap: 15px; justify-content: flex-end;">
                                    <!-- Este contenedor será actualizado dinámicamente -->
                                    <a href="/registro" class="auth-link">Registrarse</a>
                                    <a href="/inicio" class="auth-link">Iniciar sesión</a>
                                </div>
                            </div>
                        </nav>
                    </div>
                </header>
                <!-- Header Area end -->

<!-- inner banner Area start -->
<section class="inner-banner" id="innerBanner">
    <div class="container">
        <!-- si querés contenido extra aquí -->
    </div>
</section>
<!-- inner banner Area end -->


                <!-- properties detail Area start -->
                <section class="properties-detail bg-white p-100">
                    <div class="container">
                        <h2 class="fw-6 fs-40 ls-1 color-dark-2 text-uppercase mb-32 ">${nombre}</h2>

                        
<div class="house-detail-slider">
  ${imagenes.map(url => `
    <img 
      src="${url}" 
      alt="${nombre}" 
      style="width: 100%; max-width: 100%; height: auto; border-radius: 10px; object-fit: cover; max-height: 500px;"
    />
  `).join('')}
</div>
<div class="house-detail-slider-nav mb-64" style="white-space: nowrap; overflow-x: auto;">
  ${imagenes.map(url => `
    <img 
      src="${url}" 
      alt="${nombre}" 
      style="width: 120px; height: auto; object-fit: cover; border-radius: 10px; margin-right: 12px; display: inline-block;"
    />
  `).join('')}
</div>




                        <div class="row">
                            <div class="col-xl-4">
                                <div class="contact mb-24">
    <h2 class="fw-5 fs-23 color-dark-2 font-sec mb-16">Reserva aquí</h2>

    <div style="border: 1px solid #ddd; padding: 20px; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); max-width: 400px; margin: auto;">
        <h3 style="margin-bottom: 10px; font-weight: bold;">
            <!-- El contenedor donde aparecerá el valor calculado -->
            <small id="precio-estadia" style="font-weight: normal;"></small>
        </h3>


<!-- Inputs de fechas -->
<div style="display: flex; gap: 10px; margin-bottom: 7px; flex-direction: column;">
  <div style="display: flex; flex-direction: column;">
    <label for="checkin" style="font-size: 14px; margin-bottom: 4px;">Desde</label>
    <input type="text" id="checkin" name="checkin" class="p-2 border rounded w-64" placeholder="Fecha de ingreso">
  </div>
  <div style="display: flex; flex-direction: column;">
    <label for="checkout" style="font-size: 14px; margin-bottom: 4px;">Hasta</label>
    <input type="text" id="checkout" name="checkout" class="p-2 border rounded w-64" placeholder="Fecha de salida">
  </div>
</div>

<!-- Select de viajeros -->
<div style="margin-bottom: 15px;">
  <label style="font-size: 14px;">Viajeros</label>
  <select id="select-viajeros" name="viajeros" required class="form-control" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #ccc;">
  </select>
</div>


<!-- Precio Total -->
<div class="propiedad-detalle" data-id="${id_propiedad}">
  <div class="propiedades-precio" id="precio_${id_propiedad}">
    <!-- El texto se completará con JS -->
  </div>
</div>

 



<script>
  document.addEventListener("DOMContentLoaded", function () {
    // Obtengo el select donde voy a agregar las opciones
    const selectViajeros = document.getElementById("select-viajeros");

    // Capacidad fija, debe venir desde backend y estar definida en el contexto
    const capacidad = ${capacidad}; // Ejemplo: 6, debe estar definida en el entorno de plantillas

    // Llenar el select con opciones desde 1 hasta capacidad
    for (let i = 1; i <= capacidad; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = i + (i > 1 ? " viajeros" : " viajero"); // Texto dinámico plural o singular
      selectViajeros.appendChild(option);
    }

    // Leer valor guardado en sessionStorage (si existe)
    const personas = sessionStorage.getItem('busqueda_personas');

    // Si existe valor, ponerlo seleccionado en el select
    if (personas) {
      selectViajeros.value = personas;
    }

    // Guardar en sessionStorage cada vez que cambie la selección
    selectViajeros.addEventListener("change", function () {
      sessionStorage.setItem("busqueda_personas", this.value);
    });
  });
</script>


<style>
/* Fondo del modal a pantalla completa y centrado */
/* Modal que cubre toda la pantalla y centra su contenido */
/* Modal base centrado a mitad de pantalla */
#modalPago.modal {
  position: fixed;
  top: 50%;               /* Posición vertical */
  left: 50%;              /* Posición horizontal */
  transform: translate(-50%, -50%); /* Centrar exactamente */
  background-color: rgba(0, 0, 0, 0.65); /* Fondo semi-transparente */
  display: none;          /* Se activa con JS */
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

/* Contenedor interior del modal */
#modalPago.modal > div {
  background: white;
  width: 90%;
  max-width: 600px;       /* Más pequeño que el anterior */
  max-height: 80vh;       /* Altura máxima */
  overflow-y: auto;
  border-radius: 12px;
  padding: 24px;
  position: relative;
  box-sizing: border-box;
}


</style>
<!-- Modal de Pago con pasos y barra de progreso estilo Airbnb -->
<div id="modalPago" class="modal" style="display: none; font-family: sans-serif;">
  <input type="hidden" id="propiedadIdSeleccionada" value="">

  <div style="background: white; border-radius: 12px; max-width: 900px; margin: auto; padding: 24px; box-shadow: 0 0 20px rgba(0,0,0,0.1); position: relative;">
    <button onclick="cerrarModalPago()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 20px;">✖</button>

    <!-- Barra de progreso -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
      <div style="flex: 1; text-align: center;">
        <div class="step-circle" id="stepCircle1">1</div>
        <p style="margin: 5px 0 0; font-size: 12px;">Pago</p>
      </div>
      <div style="flex: 1; height: 4px; background: #eee; position: relative;">
        <div id="progressBar" style="height: 4px; background: black; width: 0%; transition: width 0.3s;"></div>
      </div>
      <div style="flex: 1; text-align: center;">
        <div class="step-circle" id="stepCircle2">2</div>
        <p style="margin: 5px 0 0; font-size: 12px;">Método</p>
      </div>
      <div style="flex: 1; text-align: center;">
        <div class="step-circle" id="stepCircle3">3</div>
        <p style="margin: 5px 0 0; font-size: 12px;">Resumen</p>
      </div>
    </div>

    <!-- PASOS -->
<div id="paso1" class="paso" style="display: block;">
  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 24px;">1. Elegí cuándo querés pagar</h2>

  <!-- Opción: Pago completo -->
  <div onclick="seleccionarMonto(100)" 
       style="border: 1px solid #ccc; border-radius: 12px; padding: 20px; margin-bottom: 16px; cursor: pointer; transition: border 0.3s;" 
       onmouseover="this.style.borderColor='#000'" 
       onmouseout="this.style.borderColor='#ccc'">
    <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
      <input type="radio" name="pago" value="100" style="accent-color: black;">
      <div>
        <div style="font-weight: 600; font-size: 16px;">Pagá ahora</div>
        <div style="font-size: 20px; font-weight: bold; color: black; margin-top: 4px;" id="pagoTotalARS">ARS $0</div>
      </div>
    </label>
  </div>

  <!-- Opción: Pago dividido -->
  <div onclick="seleccionarMonto(50)" 
       style="border: 1px solid #ccc; border-radius: 12px; padding: 20px; cursor: pointer; transition: border 0.3s;" 
       onmouseover="this.style.borderColor='#000'" 
       onmouseout="this.style.borderColor='#ccc'">
    <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
      <input type="radio" name="pago" value="50" style="accent-color: black;">
      <div>
        <div style="font-weight: 600; font-size: 16px;">Pagá una parte ahora y otra más adelante</div>
        <div style="font-size: 16px; color: #333; margin-top: 6px;">
          <div>
            <strong>Pagás ahora:</strong> <span id="pagoMitadAhora" style="font-weight: bold;">ARS $0</span>
          </div>
          <div style="margin-top: 4px;">
            <strong>Pagás después:</strong> <span id="pagoMitadLuego" style="font-weight: bold;">ARS $0</span> el <span id="fechaPagoPosterior" style="color: #666;">fecha de check-in</span>
          </div>
        </div>
      </div>
    </label>
  </div>
   <!-- Botón para continuar -->
  <button onclick="validarPaso1()" class="btn-next" style="margin-top: 30px;">Siguiente</button>
</div>

   <div id="paso2" class="paso" style="display: none;">
  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 24px;">2. Agregá un método de pago</h2>

<!-- Botón Transferencia -->
<div style="border: 1px solid #ccc; border-radius: 12px; padding: 20px; margin-bottom: 16px; transition: all 0.3s;"
     onmouseover="this.style.borderColor='#000'" 
     onmouseout="this.style.borderColor='#ccc'">

  <div style="display: flex; align-items: flex-start; gap: 12px;">
    <img src="https://cdn-icons-png.flaticon.com/512/8043/8043733.png" alt="Bank" width="28" height="28" style="margin-top: 4px;">
    
    <div style="flex:1;">
      <div style="font-weight:600; font-size:16px;">Transferencia bancaria (sin costo)</div>
      <div style="font-size:14px; color:#555;">
        Alias: <strong>maisonstate.transfer</strong><br>
        CBU: <strong>0000003100080001234567</strong>
      </div>

      <div id="comprobanteContainer" style="margin-top:10px; display:flex; gap:16px; align-items:flex-start;">
        <!-- Subida -->
        <div style="flex:1;">
          <label style="font-size:14px;">Subí tu comprobante:</label><br>
          <label for="comprobanteTransferencia" style="display:block; font-weight:600; color:#333; margin-bottom:8px;">
            Adjuntar comprobante de pago
          </label>
          <input type="file" id="comprobanteTransferencia" accept="image/*,application/pdf" style="display:block; width:100%; padding:12px; border:1px solid #ccc; border-radius:8px; font-size:15px; background-color:#f9f9f9;">
          <small style="color:#666; font-size:13px; display:block; margin-top:6px;">Formatos permitidos: PDF, JPG, PNG</small>
          <div id="mensajeComprobante" style="margin-top:12px; font-size:14px; font-weight:500; opacity:0; transition:opacity 0.5s;"></div>
        </div>

        <!-- Previsualización -->
        <div id="previewComprobante" style="width:150px; height:120px; border:2px solid black; border-radius:12px; overflow:hidden; display:flex; justify-content:center; align-items:center; font-size:13px; text-align:center;">
          <span>Sin archivo</span>
        </div>
      </div>
    </div>
  </div>
</div>


<script src="https://widget.cloudinary.com/v2.0/global/all.js" type="text/javascript"></script>

<!-- Botón Mercado Pago -->
<div id="botonMercadoPago" 
     style="border: 1px solid #ccc; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; cursor: pointer; transition: all 0.3s;"
     onmouseover="this.querySelector('.mp-logo').style.opacity='1'" 
     onmouseout="this.querySelector('.mp-logo').style.opacity='0'">
  <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
    <img src="https://th.bing.com/th/id/OIP.cFAleQodrrB9OIkvEa67OwHaHa?rs=1&pid=ImgDetMain&cb=idpwebp2&o=7&rm=3" class="mp-logo" 
         style="width: 28px; height: 28px; opacity: 0; transition: opacity 0.5s ease;">
    <div>
      <div style="font-weight: 600; font-size: 16px;">Pagar con Mercado Pago</div>
      <div style="font-size: 14px; color: #555;">Monto: ARS </div>
    </div>
  </label>
</div>

    <!-- Botones navegación -->
    <div style="margin-top: 32px; display: flex; justify-content: space-between; gap: 12px;">
      <!-- Botón Volver -->
      <button onclick="mostrarPaso(1)" class="btn-secondary" style="flex: 1; background: transparent; border: 2px solid #ccc; padding: 10px 20px; border-radius: 8px; font-weight: 500; color: #333; transition: all 0.3s ease;"
              onmouseover="this.style.borderColor='#000'; this.style.color='#000'" 
              onmouseout="this.style.borderColor='#ccc'; this.style.color='#333'">
        Volver
      </button>

<!-- Botón Siguiente -->
<button
  onclick="enviarYContinuar()"
  class="btn-next"
  style="flex: 1; background: black; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 500; transition: background 0.3s ease;"
  onmouseover="this.style.background='#333'"
  onmouseout="this.style.background='black'">
  Siguiente
</button>

    </div>

    </div>


<!-- Paso 3: Revisión de solicitud -->
<div id="paso3" class="paso" style="display: none; font-family: 'Helvetica Neue', sans-serif;">
  <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 24px;">3. Revisá tu solicitud</h2>

  <!-- Contenedor principal en dos columnas -->
  <div style="border: 1px solid #ddd; border-radius: 12px; padding: 24px; background: #fafafa; display: flex; justify-content: space-between; align-items: center; gap: 24px;">
    
    <!-- Columna izquierda: texto del resumen -->
    <div style="max-width: 60%;">
      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;" id="resumenNombrePropiedad">
        ${nombre}
      </h3>

      <p style="margin: 4px 0; font-size: 15px; color: #555;">
        <span id="resumenFechas">Fechas de reserva</span> · <span id="resumenViajeros">X personas</span>
      </p>

      <p style="margin: 10px 0; font-size: 15px; color: #555;">
        <span id="resumenPrecioNoche">Precio estimado por noches</span>
      </p>

      <p style="margin-top: 12px; font-size: 18px; font-weight: bold;">
        Total: <span id="resumenTotalARS" style="color: #000;">ARS $0</span>
      </p>
    </div>

<!-- Columna derecha: solo se muestra la primera imagen -->
<div id="contenedor-imagenes" style="max-width: 35%; display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px;">
    <div class="imagenes">
    ${imagenes.map(url => `
      <img src="${url}" alt="${nombre}" />
    `).join('')}
  </div>
</div>



  </div>

    <div style="margin-top: 28px; display: flex; justify-content: space-between; gap: 12px;">
      <!-- Botón Volver -->
      <button onclick="mostrarPaso(2)" class="btn-secondary" style="flex: 1; background: transparent; border: 2px solid #ccc; padding: 10px 20px; border-radius: 8px; font-weight: 500; color: #333; transition: all 0.3s ease;"
              onmouseover="this.style.borderColor='#000'; this.style.color='#000'" 
              onmouseout="this.style.borderColor='#ccc'; this.style.color='#333'">
        Volver
      </button>


<!-- Botón Confirmar (confirma reserva) -->
<!-- Botón Confirmar dentro del modal -->
<button class="btn-next"
  onclick="confirmarReservaYBloquear()"
  style="flex: 1; background: black; color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 500; transition: background 0.3s ease;"
  onmouseover="this.style.background='#333'" 
  onmouseout="this.style.background='black'">
  Confirmar reserva
</button>

    </div>

</div>

  </div>
</div>

<style>
  .step-circle {
    width: 30px;
    height: 30px;
    line-height: 30px;
    border-radius: 50%;
    background: #ddd;
    display: inline-block;
    text-align: center;
    font-weight: bold;
    color: #333;
    transition: background 0.3s, color 0.3s;
  }
  .step-circle.active {
    background: black;
    color: white;
  }
  .btn-next {
    margin-top: 20px;
    background: black;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
  }
</style>

<script>
  function mostrarPaso(num) {
    // Ocultar todos los pasos
    document.querySelectorAll('.paso').forEach(p => p.style.display = 'none');
    document.getElementById('paso' + num).style.display = 'block';

    // Actualizar barra de progreso
    const progress = document.getElementById('progressBar');
    progress.style.width = ((num - 1) / 2 * 100) + '%';

    // Actualizar círculos
    for (let i = 1; i <= 3; i++) {
      const circle = document.getElementById('stepCircle' + i);
      if (i <= num) {
        circle.classList.add('active');
      } else {
        circle.classList.remove('active');
      }
    }
  }
</script>


<!-- Botón Reservar (inicia reserva) -->
<button type="button" class="form-btn boton-reservar"
  data-id="${id_propiedad}"
  style="width: 100%; background: linear-gradient(to right, #ff2d55, #c33764); color: white; padding: 12px; font-size: 16px; border: none; border-radius: 10px; cursor: pointer;">
  Reservar
</button>



        <p style="text-align: center; font-size: 13px; margin-top: 10px; color: #555;">No vamos a cobrarte ningún cargo</p>
    </div>

    <!-- Alert Message -->
    <div id="_message" class="alert-msg" style="text-align: center; margin-top: 15px;"></div>


</form>


</div>


          
                            </div>
                           <div class="col-xl-8">
  <section class="house-detail">
    <h2 class="house-detail__title">Detalles</h2>
    <ul class="house-detail__list">
      <li class="house-detail__item">
        <img src="../../../assets/media/icon/bed.png" alt="Dormitorios" class="house-detail__icon" />
        <span>${dormitorios} Dormitorios</span>
      </li>
      <li class="house-detail__item">
        <img src="../../../assets/media/icon/toom.png" alt="Baños" class="house-detail__icon" />
        <span>${baños} Baños</span>
      </li>
      <li class="house-detail__item">
        <img src="../../../assets/media/icon/scale.png" alt="Superficie" class="house-detail__icon" />
        <span>${superficie} M²</span>
      </li>
      <li class="house-detail__item">
        <img src="../../../assets/media/icon/garage.png" alt="Garage" class="house-detail__icon" />
        <span>Garage: ${garage}</span>
      </li>
      <li class="house-detail__item">
        <img src="../../../assets/media/icon/home.png" alt="Tipo" class="house-detail__icon" />
        <span>${tipo}</span>
      </li>
      <li class="house-detail__item">
        <img src="../../../assets/media/icon/kit.svg" alt="Kit de higiene" class="house-detail__icon icon--small" />
        <span>Kit de higiene: ${kit_higiene}</span>
      </li>
      <li class="house-detail__item">
        <img src="../../../assets/media/icon/breakfast.svg" alt="Kit Desayuno" class="house-detail__icon icon--small" />
        <span>Kit Desayuno: ${desayuno}</span>
      </li>
      <li class="house-detail__item">
        <img src="../../../assets/media/icon/gift.svg" alt="Bienvenida" class="house-detail__icon icon--small" />
        <span>Bienvenida: ${bienvenida}</span>
      </li>
    </ul>
  </section>
</div>

                            <div class="house-detail">
                                <h2 class="mb-16">Descripcion</h2>
                                <p class="mb-0">${descripcion}</p>
                            </div>

                                
                                <div class="house-detail">
                                    <h2 class="mb-16">Ubicacion</h2>
                                   
                                    <div class="map-responsive">
                                        ${ubicacion_mapa}                               
                                     </div>

                            
                            </div>
                        </div>
                    </div>
                </section>
                <!-- properties detail Area end -->

                <!-- check out Area start -->
                <section class="check-out bg-gray p-100">
                    <!-- 🔴 NUEVA SECCIÓN ESTILO -->
<section class="airbnb-zone-section" style="padding: 40px 20px; background: #f7f7f7;">
  <div class="container" style="max-width: 1200px; margin: auto;">
    <h2 style="font-size: 24px; margin-bottom: 20px;">Propiedades recomendadas</h2>
    <div class="airbnb-slider" style="position: relative; overflow: hidden;">
      <div class="airbnb-content" style="display: flex; gap: 20px; transition: transform 0.3s ease;"></div>
    </div>
    <div style="text-align: center; margin-top: 25px;">
      <button id="airbnb-ver-mas" style="padding: 10px 25px; font-size: 16px; background: black; color: white; border: none; border-radius: 999px; cursor: pointer; transition: background 0.3s ease;">Ver más propiedades</button>
    </div>
  </div>
</section>
<script>
document.addEventListener('DOMContentLoaded', async () => {
const zonaActual = "${ubicacion}";      // Si es texto
const idActual = '${id_propiedad}';       // sin comillas si es número puro

  let offset = 0;
  const limite = 6;
  let todasPropiedades = [];

  const contenedor = document.querySelector('.airbnb-content');
  const btnVerMas = document.getElementById('airbnb-ver-mas');

  async function obtenerPropiedades() {
    try {
      const res = await fetch(\`/api/propiedades/por-zona?zona=\${encodeURIComponent(zonaActual)}&id_excluir=\${idActual}\`);
      todasPropiedades = await res.json();
    } catch (err) {
      console.error("Error obteniendo propiedades:", err);
    }
  }

  async function cargarPropiedades() {
    if (todasPropiedades.length === 0) await obtenerPropiedades();
    const nuevas = todasPropiedades.slice(offset, offset + limite);
    offset += limite;

    if (nuevas.length === 0) {
      btnVerMas.disabled = true;
      btnVerMas.textContent = "No hay más propiedades";
      btnVerMas.style.opacity = "0.6";
      return;
    }

    nuevas.forEach(prop => {
      const card = document.createElement('div');
      card.style.cssText = \`
        min-width: 260px;
        max-width: 260px;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        flex-shrink: 0;
      \`;
      card.innerHTML = \`
        <a href="/propiedades/\${prop.tipo.toLowerCase()}/\${slugify(prop.ubicacion)}/\${slugify(prop.nombre)}.html" style="text-decoration: none; color: inherit;">
          <img src="\${prop.imagenes?.[0] || '/assets/img/sin-imagen.jpg'}" alt="\${prop.nombre}" style="width: 100%; height: 180px; object-fit: cover;">
          <div style="padding: 12px;">
            <h3 style="margin: 0 0 4px; font-size: 16px; font-weight: 600;">\${prop.nombre}</h3>
            <p style="margin: 0 0 6px; color: #666; font-size: 14px;">\${prop.descripcion?.substring(0, 60)}...</p>
            <p style="margin: 0; font-size: 15px;"><strong>$\${parseInt(prop.precio).toLocaleString()}</strong> por noche</p>
          </div>
        </a>
      \`;
      contenedor.appendChild(card);
    });
  }

  btnVerMas.addEventListener('click', cargarPropiedades);
  await cargarPropiedades();

  const slider = document.querySelector('.airbnb-slider');
  let scrollSpeed = 2;

  slider.addEventListener('mousemove', e => {
    const { left, right } = slider.getBoundingClientRect();
    const x = e.clientX;
    if (x - left < 60) {
      contenedor.scrollLeft -= scrollSpeed;
    } else if (right - x < 60) {
      contenedor.scrollLeft += scrollSpeed;
    }
  });

  contenedor.style.overflowX = 'hidden';
  contenedor.style.scrollBehavior = 'smooth';

  function slugify(texto) {
    return texto.toString().toLowerCase().trim()
      .replace(/\\s+/g, '-')
      .replace(/[^\\w\\-]+/g, '')
      .replace(/\\-\\-+/g, '-');
  }
});
</script>
                    <div id="id-propiedad-oculto" data-id="${id_propiedad}" style="display: none;"></div>

                </footer>
                
                
                

                <!-- footer Area end -->
            </div>
        </div>
            <!-- Jquery Js -->
            <script src="../../../assets/js/vendor/jquery-3.6.3.min.js"></script>
            <script src="../../../assets/js/vendor/bootstrap.min.js"></script>
            <script src="../../../assets/js/vendor/slick.min.js"></script>
            <script src="../../../assets/js/vendor/jquery-appear.js"></script>
            <script src="../../../assets/js/vendor/jquery-validator.js"></script>
            <script src="../../../assets/js/vendor/smooth-scrollbar.js"></script>
            <script src="../../../assets/js/vendor/picker.js"></script>
            <script src="../../../assets/js/vendor/picker.date.js"></script>

            <script src="../../../assets/js/date.js"></script>
            <script src="../../../assets/js/app.js" defer></script>
            <script src="/socket.io/socket.io.js"></script>
  <script src="https://widget.cloudinary.com/v2.0/global/all.js" type="text/javascript"></script>

            <script src="../../../assets/js/banz.js" defer></script>
    </body>
        
</html>`;

  // Escribimos el archivo de la propiedad individual
  fs.writeFileSync(ruta_html, contenido_html, 'utf-8');
  console.log(`✅ Página HTML generada: ${ruta_html}`);

  // ACTUALIZAR o INSERTAR en properties.html
  if (fs.existsSync(RUTA_PROPERTIES_HTML)) {
    let contenido = fs.readFileSync(RUTA_PROPERTIES_HTML, 'utf-8');

    const ruta_html_relativa = `./propiedades/${tipo_limpio}/${ubicacion_limpio}/${nombre_limpio}.html`;
    const imagen_principal = imagenes.length ? imagenes[0] : '/assets/media/default.jpg';

const tarjeta_html = `
  <div class="tarjeta-propiedad" id="${id_propiedad}">
    <div class="tarjeta-img-carousel">
      <button class="btn-carousel prev" onclick="cambiarImagen('${id_propiedad}', -1)">&#60;</button>
      <a href="${ruta_html_relativa}">
        <img loading="lazy" id="imagen-${id_propiedad}" src="${imagen_principal}" alt="${nombre}" class="imagen-principal-prop">
      </a>
      <button class="btn-carousel next" onclick="cambiarImagen('${id_propiedad}', 1)">&#62;</button>
    </div>
    <div class="tarjeta-info">
      <a href="${ruta_html_relativa}" class="titulo-propiedad">${nombre}</a>
      <div class="localidad-propiedad">${ubicacion}</div>
      <div class="detalle-propiedad">${dormitorios} Dormitorios · ${baños} Baños · ${superficie} m²</div>
      <div class="precio-propiedad">ARS ${precio} / Total</div>
    </div>
  </div>
`;


    const regexTarjeta = new RegExp(`<div class="propiedades-casa" id="${id_propiedad}">[\\s\\S]*?<\\/div>\\s*<\\/div>`, "g");

/* sacar de ser necesario pero por ahora no sirve ya que es dinamico 
if (contenido.match(regexTarjeta)) {
  // Reemplazar la tarjeta existente
  contenido = contenido.replace(regexTarjeta, tarjeta_html);
  console.log(`🔁 Tarjeta de propiedad actualizada en properties.html`);
} else {
  // Insertar nueva tarjeta si no existía
  const contenido_lines = contenido.split('\n');
  contenido_lines.splice(LINEA_INSERCION, 0, tarjeta_html);
  contenido = contenido_lines.join('\n');
  console.log(`➕ Tarjeta de propiedad insertada en línea ${LINEA_INSERCION}`);
}
*/


    fs.writeFileSync(RUTA_PROPERTIES_HTML, contenido, 'utf-8');
  }
}

module.exports = {
  crearPropiedad,
  actualizarPropiedad,
  generarHtmlPropiedad
};
