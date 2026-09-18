# LUBPOINT · Sistema

> Para publicar todo (sistema + web) paso a paso, mirá **PUBLICAR.md** en la carpeta principal.

Panel de administración + API, sobre Cloudflare (plan gratuito).

- **Base de datos**: D1 (SQLite). Tablas: productos, movimientos, pedidos, pedido_items, turnos, usuarios, sesiones, config.
- **API**: `/api/publico/*` para la web (sin login) y `/api/*` para el panel (con login).
- **Panel**: carpeta `panel/`, se sirve desde el mismo Worker.

## Puesta en marcha (una sola vez)

```bash
cd sistema
npm install
npx wrangler login                      # abre el navegador y conecta tu cuenta de Cloudflare
npx wrangler d1 create lubpoint          # copiar el database_id que devuelve
# pegar ese id en wrangler.jsonc (campo database_id)

npx wrangler d1 execute lubpoint --remote --file=schema.sql             # crea las tablas
npx wrangler d1 execute lubpoint --remote --file=seed-productos.sql     # los 65 productos del Excel
npx wrangler d1 execute lubpoint --remote --file=productos-nuevos.sql   # los 4 que salieron de las fotos

# crear el usuario del dueño (acceso completo)
node crear-usuario.js dueno "Nombre del dueño" dueno "CONTRASEÑA"
# copiar la línea que imprime y ejecutarla:
npx wrangler d1 execute lubpoint --remote --command "INSERT INTO usuarios ..."

npx wrangler deploy                      # publica el sistema
```

Queda en `https://lubpoint-sistema.TU-SUBDOMINIO.workers.dev`.

## Usuarios

- `dueno`: acceso completo (precios, stock, pedidos, turnos, ventas, usuarios).
- `soporte`: solo lectura, para revisar sin poder modificar (Máximo).

Para crear más: `node crear-usuario.js usuario "Nombre" soporte "clave"` y ejecutar la línea,
o desde el panel en **Ajustes → Usuarios**.

## Probar en la computadora, sin publicar

```bash
npx wrangler d1 execute lubpoint --local --file=./schema.sql
npx wrangler d1 execute lubpoint --local --file=./seed-productos.sql
npm run dev            # queda en http://127.0.0.1:8787
```

## Conectar la web

En `index.html` (la web) está la configuración:

```html
<script>window.LUBPOINT = { whatsapp: "...", api: "https://lubpoint-sistema.TU-SUBDOMINIO.workers.dev" };</script>
```

Con `api` cargada, la tienda muestra los productos y el stock reales, y los pedidos y turnos
entran al sistema. Sin `api`, la web sigue funcionando con los productos de ejemplo.

## Cómo funciona el stock

- **Pago recibido**: descuenta las unidades y queda registrado como venta del día.
- **Pendiente de pago**: reserva las unidades por 2 horas (se configura en Ajustes). Si no se paga,
  la reserva vence sola y el stock vuelve a estar disponible. Se puede renovar con un botón.
- **Compra cancelada**: libera todo, sin descontar.
- Cambiar cantidades de un pedido ajusta el stock y recalcula el total.
- Todo movimiento queda en el historial con fecha, motivo y usuario.


## Fotos de productos y catálogo de la web

Las fotos que sacó el cliente (carpeta `assets/STOCK WEB LUBPOINT`) eran HEIC de iPhone, que el
navegador no muestra. Están convertidas a `.webp` en `assets/productos/` (90 imágenes, 2,8 MB).

El archivo `js/catalogo.js` une cada foto con su producto del sistema **por nombre comercial**,
NO por el número del archivo: los códigos de las fotos no coinciden con los de la planilla
(por ejemplo, la foto 104 es agua rosa y en el sistema el 104 es líquido de frenos).

Cada tarjeta de la tienda lleva el código del producto en el sistema. Si el cliente elige una
variante (fragancia, modelo de calcomanía), el pedido guarda "Producto · Variante" pero descuenta
el stock del producto real.

Para regenerar el catálogo si llegan fotos nuevas: nombrar los archivos
`codigo_A_NOMBRE-COMERCIAL.jpg` y avisarme, o editar `js/catalogo.js` a mano (es una lista simple).

Los productos que estaban en las fotos pero faltaban en la planilla se cargan con
`npx wrangler d1 execute lubpoint --remote --file=productos-nuevos.sql` (entran con stock y precio en 0).


## Marcar un producto sin stock

En **Productos** hay una casilla **Sin stock**. Sirve para cuando alguien pasa por el local y se
lleva las últimas unidades y no llegás a cargar la venta: la tildás y la web lo muestra como
"Sin stock" al instante, sin dejar comprarlo. El número de stock real no se toca, así que después
podés acomodarlo con el botón Stock.

Se destilda sola cuando cargás un ingreso de mercadería de ese producto.

Si tu base ya estaba creada, hay que agregarle la columna una sola vez:
`npx wrangler d1 execute lubpoint --remote --file=migracion-agotado.sql`
(las bases nuevas ya la traen en `schema.sql`).
