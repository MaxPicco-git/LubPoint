# Publicar LUBPOINT

Todo va en **Cloudflare**, plan gratuito. No hace falta Supabase, Neon ni ningún otro servicio:
la base de datos (D1) ya está incluida.

| Parte | Dónde vive | Dirección que queda |
|---|---|---|
| La web (lo que ve el cliente) | Cloudflare **Pages** | `https://lubpoint.pages.dev` |
| El sistema (panel + API + base) | Cloudflare **Workers + D1** | `https://lubpoint-sistema.TU-CUENTA.workers.dev` |

Límites del plan gratuito: 100.000 pedidos por día al sistema, 5 GB de base de datos y visitas
ilimitadas a la web. Para un lubricentro sobra.

---

## Antes de publicar (importante)

En `index.html` hay datos de ejemplo que hay que reemplazar por los reales:

- **WhatsApp del dueño**: línea `whatsapp: "5493420000000"` (país + área + número, sin `+`, espacios ni guiones).
- **Teléfono y mail** de la sección Contacto y del pie: hoy dicen `+54 9 342 000-0000` y `hola@lubpoint.com.ar`.
- **Los precios** de los productos se cargan desde el panel, no acá.

---

## 1) Publicar el sistema

```bash
cd D:\LUBPOINT\sistema
npm install
npx wrangler login
```

`login` abre el navegador: entrá con la cuenta de Cloudflare (crearla es gratis y pide solo un mail).

```bash
npx wrangler d1 create lubpoint
```

Devuelve un `database_id`. Copialo y pegalo en `wrangler.jsonc`, reemplazando
`PEGAR_ACA_EL_ID_QUE_DEVUELVE_WRANGLER`.

```bash
npx wrangler d1 execute lubpoint --remote --file=schema.sql             # crea las tablas
npx wrangler d1 execute lubpoint --remote --file=seed-productos.sql     # los 65 productos del Excel
npx wrangler d1 execute lubpoint --remote --file=productos-nuevos.sql   # los 4 que aparecieron en las fotos
```

Usuarios (elegí contraseñas de verdad, no las de prueba):

```bash
node crear-usuario.js dueno "Dueño LUBPOINT" dueno "LA-CLAVE-DEL-DUENO"
node crear-usuario.js maximo "Máximo" soporte "MI-CLAVE"
```

Cada comando imprime una línea `INSERT INTO usuarios ...`. Ejecutá cada una así:

```bash
npx wrangler d1 execute lubpoint --remote --command "INSERT INTO usuarios ..."
```

Y publicá:

```bash
npx wrangler deploy
```

Anotá la dirección que devuelve, por ejemplo `https://lubpoint-sistema.maximo.workers.dev`.
Entrando ahí ya funciona el panel.

---

## 2) Publicar la web

En `index.html`, poné la dirección del sistema que te quedó:

```html
api: "https://lubpoint-sistema.TU-CUENTA.workers.dev"
```

Después:

```bash
cd D:\LUBPOINT
node preparar-web.js
npx wrangler pages deploy publicar --project-name lubpoint
```

`preparar-web.js` arma la carpeta `publicar/` con lo que va a la web (unos 5 MB): deja afuera el
sistema, las fotos originales del cliente y las versiones pesadas de las imágenes.

Queda en `https://lubpoint.pages.dev`.

---

## 3) Conectar los dos

El panel solo acepta pedidos desde la dirección de tu web. En `sistema/wrangler.jsonc`:

```jsonc
"vars": { "SITIO": "https://lubpoint.pages.dev" }
```

Y volvé a publicar el sistema:

```bash
cd D:\LUBPOINT\sistema
npx wrangler deploy
```

---

## 4) Probar que quedó todo bien

1. Abrí la web: la tienda tiene que mostrar los productos reales (no los de ejemplo) y el stock.
2. Hacé un pedido de prueba desde la tienda.
3. Entrá al panel y fijate que el pedido aparezca en **Pedidos**. Cancelalo.
4. Pedí un turno desde la web y confirmá que aparezca en **Turnos**.
5. Cargá un precio en **Productos** y mirá que cambie en la web.

---

## Actualizar más adelante

- Cambiaste algo de la web → `node preparar-web.js` y `npx wrangler pages deploy publicar --project-name lubpoint`
- Cambiaste algo del sistema → `cd sistema` y `npx wrangler deploy`
- La base de datos NO se toca al publicar: los productos, pedidos y ventas quedan como están.

---

## Dominio propio (opcional)

Si más adelante comprás `lubpoint.com.ar`, se conecta desde el panel de Cloudflare
(Pages → tu proyecto → Custom domains). Ahí hay que actualizar `SITIO` con el dominio nuevo.

---

## ¿Hace falta git?

No. Se publica directo con los comandos de arriba.

Sirve igual como **respaldo y control de cambios**: si querés, `git init`, y con el `.gitignore`
que está en el proyecto no se suben `node_modules`, la base local ni la carpeta `publicar/`.
Nunca subas contraseñas: `crear-usuario.js` recibe la clave por parámetro, no la guarda en ningún archivo.
