-- LUBPOINT · Base de datos del sistema (Cloudflare D1 / SQLite)
-- Todo es editable desde el panel: productos, precios, stock, pedidos, turnos y ventas.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario   TEXT NOT NULL UNIQUE,
  nombre    TEXT NOT NULL,
  rol       TEXT NOT NULL CHECK (rol IN ('dueno', 'soporte')),  -- dueño: todo | soporte: solo lectura
  hash      TEXT NOT NULL,
  salt      TEXT NOT NULL,
  activo    INTEGER NOT NULL DEFAULT 1,
  creado    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sesiones (
  token      TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira     TEXT NOT NULL,
  creado     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- Productos
CREATE TABLE IF NOT EXISTS productos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo        TEXT NOT NULL UNIQUE,             -- 001, 002...
  sku           TEXT NOT NULL UNIQUE,             -- LUB-001
  nombre        TEXT NOT NULL,
  categoria     TEXT NOT NULL,
  marca         TEXT,
  presentacion  TEXT,                             -- 4 L, 1 L, medida...
  precio        REAL NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0,       -- unidades en el local
  reservado     INTEGER NOT NULL DEFAULT 0,       -- unidades comprometidas por pedidos pendientes de pago
  agotado       INTEGER NOT NULL DEFAULT 0,       -- el dueño lo marca a mano: la web lo muestra sin stock
  stock_minimo  INTEGER NOT NULL DEFAULT 0,       -- avisa cuando el stock baja de acá
  foto_archivo  TEXT,                             -- nombre de la foto (001_A_...) para cuando lleguen
  observaciones TEXT,
  visible       INTEGER NOT NULL DEFAULT 1,       -- se muestra en la tienda
  activo        INTEGER NOT NULL DEFAULT 1,       -- baja lógica: nunca se borra
  creado        TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos (categoria);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos (nombre);

-- ---------------------------------------------------------------- Movimientos de stock (auditoría)
CREATE TABLE IF NOT EXISTS movimientos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  tipo        TEXT NOT NULL CHECK (tipo IN ('ingreso', 'venta', 'ajuste', 'reserva', 'liberacion', 'devolucion')),
  cantidad    INTEGER NOT NULL,                   -- + suma stock, - resta stock
  stock_final INTEGER NOT NULL,
  motivo      TEXT,
  pedido_id   INTEGER,
  usuario_id  INTEGER REFERENCES usuarios(id),
  creado      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos (producto_id, creado);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos (creado);

-- ---------------------------------------------------------------- Pedidos y ventas
CREATE TABLE IF NOT EXISTS pedidos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  numero        TEXT NOT NULL UNIQUE,             -- P-000123
  origen        TEXT NOT NULL DEFAULT 'web' CHECK (origen IN ('web', 'mostrador')),
  estado        TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'reservado', 'pagado', 'cancelado')),
  cliente       TEXT NOT NULL,
  telefono      TEXT,
  entrega       TEXT,                             -- retiro en el local / colocación
  total         REAL NOT NULL DEFAULT 0,
  reserva_hasta TEXT,                             -- vencimiento de la reserva de 2 horas
  notas         TEXT,
  creado        TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado   TEXT NOT NULL DEFAULT (datetime('now')),
  pagado_en     TEXT                              -- fecha de la venta (calendario de ventas)
);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos (estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_pagado ON pedidos (pagado_en);
CREATE INDEX IF NOT EXISTS idx_pedidos_reserva ON pedidos (reserva_hasta);

CREATE TABLE IF NOT EXISTS pedido_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id),
  nombre      TEXT NOT NULL,                      -- se guarda el nombre del momento de la compra
  precio      REAL NOT NULL DEFAULT 0,
  cantidad    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_items_pedido ON pedido_items (pedido_id);

-- ---------------------------------------------------------------- Turnos de servicio
CREATE TABLE IF NOT EXISTS turnos (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  servicio TEXT NOT NULL,
  fecha    TEXT NOT NULL,                         -- AAAA-MM-DD
  hora     TEXT NOT NULL,                         -- HH:MM
  cliente  TEXT NOT NULL,
  telefono TEXT,
  estado   TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'hecho', 'cancelado')),
  notas    TEXT,
  creado   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos (fecha, hora);

-- ---------------------------------------------------------------- Configuración editable
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
INSERT OR IGNORE INTO config (clave, valor) VALUES
  ('whatsapp', '5493420000000'),
  ('reserva_horas', '2'),
  ('turnos_desde', '07:00'),
  ('turnos_hasta', '19:00'),
  ('turnos_dias', '1,2,3,4,5,6');
