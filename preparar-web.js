/* Arma la carpeta "publicar/" con lo que va a la web (Cloudflare Pages).
   Deja afuera el sistema, las fotos originales del cliente y los archivos de trabajo.
   Uso:  node preparar-web.js */
const fs = require("fs");
const path = require("path");

const RAIZ = __dirname;
const DESTINO = path.join(RAIZ, "publicar");
const INCLUIR = ["index.html", "css", "js", "assets"];
const EXCLUIR = ["STOCK WEB LUBPOINT", "fonts-originales", ".DS_Store", "Thumbs.db"];

/* Las fotos originales pesadas (.png/.jpg) que ya tienen su versión .webp no se suben:
   la web usa la liviana. Los íconos y cualquier imagen sin gemelo .webp se copian igual. */
function tieneGemeloWebp(origen) {
  if (!/.(png|jpe?g)$/i.test(origen)) return false;
  if (origen.includes("icons")) return false;
  return fs.existsSync(origen.replace(/.[^.]+$/, ".webp"));
}

function copiar(origen, destino) {
  const nombre = path.basename(origen);
  if (EXCLUIR.includes(nombre)) return { archivos: 0, bytes: 0 };
  if (tieneGemeloWebp(origen)) return { archivos: 0, bytes: 0, ahorrado: fs.statSync(origen).size };
  const info = fs.statSync(origen);
  if (info.isDirectory()) {
    fs.mkdirSync(destino, { recursive: true });
    let archivos = 0, bytes = 0;
    for (const hijo of fs.readdirSync(origen)) {
      const r = copiar(path.join(origen, hijo), path.join(destino, hijo));
      archivos += r.archivos; bytes += r.bytes;
    }
    return { archivos, bytes };
  }
  fs.copyFileSync(origen, destino);
  return { archivos: 1, bytes: info.size };
}

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
let archivos = 0, bytes = 0;
for (const item of INCLUIR) {
  const origen = path.join(RAIZ, item);
  if (!fs.existsSync(origen)) { console.log("falta:", item); continue; }
  const r = copiar(origen, path.join(DESTINO, item));
  archivos += r.archivos; bytes += r.bytes;
}

// Aviso si quedó sin configurar la dirección del sistema
const html = fs.readFileSync(path.join(DESTINO, "index.html"), "utf8");
const api = (html.match(/api:\s*"([^"]*)"/) || [])[1];
console.log(`Carpeta "publicar/" lista: ${archivos} archivos · ${(bytes / 1048576).toFixed(1)} MB`);
console.log(api ? `Sistema conectado en: ${api}` : 'OJO: "api" está vacío en index.html; la tienda va a mostrar productos de ejemplo.');
