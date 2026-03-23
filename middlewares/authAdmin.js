function authAdmin(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.rol === 'admin') {
    next();
  } else {
    res.redirect('/adminlog.html'); // redirige al login si no está autenticado
  }
}

module.exports = authAdmin;
