/* Crea un usuario del panel con la contraseña cifrada (PBKDF2, 100.000 vueltas).
   La contraseña no se guarda en ningún lado: solo viaja su huella.

   Cargarlo directo en la base publicada (lo más simple):
     node crear-usuario.js dueno "Dueño LUBPOINT" dueno "la-clave" --publicar

   O en la base local, para probar:
     node crear-usuario.js dueno "Dueño LUBPOINT" dueno "la-clave" --local

   Sin ninguna de las dos opciones, imprime la línea SQL para ejecutarla a mano. */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const args = process.argv.slice(2);
const publicar = args.includes("--publicar");
const local = args.includes("--local");
const [usuario, nombre, rol, clave] = args.filter(a => !a.startsWith("--"));

if (!usuario || !nombre || !rol || !clave) {
  console.error('Uso: node crear-usuario.js <usuario> "<Nombre>" <dueno|soporte> <contraseña> [--publicar|--local]');
  process.exit(1);
}
if (!["dueno", "soporte"].includes(rol)) {
  console.error('El rol tiene que ser "dueno" (acceso completo) o "soporte" (solo lectura).');
  process.exit(1);
}
if (String(clave).length < 8) {
  console.error("Poné una contraseña de 8 caracteres o más.");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.pbkdf2Sync(clave, salt, 100000, 32, "sha256").toString("hex");
const comilla = s => "'" + String(s).replace(/'/g, "''") + "'";
const sql = "INSERT INTO usuarios (usuario, nombre, rol, hash, salt) VALUES (" +
  [comilla(usuario.toLowerCase()), comilla(nombre), comilla(rol), comilla(hash), comilla(salt)].join(", ") + ");";

if (!publicar && !local) {
  console.log(sql);
  console.log("\n(agregá --publicar para cargarlo directo en la base ya publicada)");
  process.exit(0);
}

// La sentencia va por archivo temporal: en Windows, pasarla entre comillas se rompe.
const destino = publicar ? "--remote" : "--local";
const temporal = path.join(__dirname, ".usuario-temp.sql");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

try {
  fs.writeFileSync(temporal, sql + "\n");
  // shell: true es necesario en Windows para invocar npx.cmd; el SQL ya viaja en un archivo,
  // así que acá no hay comillas que se puedan romper.
  execFileSync(npx, ["wrangler", "d1", "execute", "lubpoint", destino, "-y", "--file", JSON.stringify(temporal)],
    { stdio: ["ignore", "pipe", "pipe"], shell: true, cwd: __dirname });
  console.log(`Usuario "${usuario.toLowerCase()}" creado (${rol}) en la base ${publicar ? "publicada" : "local"}.`);
} catch (e) {
  const salida = String(e.stdout || "") + String(e.stderr || "");
  if (/UNIQUE constraint failed/i.test(salida)) {
    console.error(`Ya existe un usuario "${usuario.toLowerCase()}". Borralo primero o elegí otro nombre.`);
  } else {
    console.error("No se pudo crear el usuario:\n" + salida.split("\n").filter(Boolean).slice(-4).join("\n"));
  }
  process.exitCode = 1;
} finally {
  try { fs.unlinkSync(temporal); } catch (e) { /* ya no estaba */ }
}
