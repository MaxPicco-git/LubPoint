/* Genera la línea SQL para crear un usuario del panel con la contraseña cifrada.
   Uso:  node crear-usuario.js <usuario> "<Nombre>" <dueno|soporte> <contraseña>
   Después pegar la salida en:  npx wrangler d1 execute lubpoint --remote --command "..."  */
const crypto = require("crypto");
const [usuario, nombre, rol, clave] = process.argv.slice(2);
if (!usuario || !nombre || !rol || !clave) {
  console.error('Uso: node crear-usuario.js <usuario> "<Nombre>" <dueno|soporte> <contraseña>');
  process.exit(1);
}
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.pbkdf2Sync(clave, salt, 100000, 32, "sha256").toString("hex");
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
console.log(`INSERT INTO usuarios (usuario, nombre, rol, hash, salt) VALUES (${q(usuario.toLowerCase())}, ${q(nombre)}, ${q(rol)}, '${hash}', '${salt}');`);
