-- Productos que aparecían en las fotos y faltaban en la planilla del cliente.
-- Entran con stock 0 y precio 0: el dueño los carga desde el panel.
INSERT INTO productos (codigo, sku, nombre, categoria, presentacion, precio, stock, stock_minimo, visible, activo)
  SELECT '108', 'LUB-108', 'Agua verde claro desmineralizada con aditivos MATCH 5 L', 'Líquidos y refrigerantes', '5 L', 0, 0, 1, 1, 1
  WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '108');
INSERT INTO productos (codigo, sku, nombre, categoria, presentacion, precio, stock, stock_minimo, visible, activo)
  SELECT '109', 'LUB-109', 'Agua desmineralizada con aditivos MATCH 5 L', 'Líquidos y refrigerantes', '5 L', 0, 0, 1, 1, 1
  WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '109');
INSERT INTO productos (codigo, sku, nombre, categoria, presentacion, precio, stock, stock_minimo, visible, activo)
  SELECT '160', 'LUB-160', 'Lava lustre MATCH 500 cc', 'Limpieza y cuidado', '500 cc', 0, 0, 1, 1, 1
  WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '160');
INSERT INTO productos (codigo, sku, nombre, categoria, presentacion, precio, stock, stock_minimo, visible, activo)
  SELECT '408', 'LUB-408', 'Cadena moto', 'Accesorios moto', '', 0, 0, 1, 1, 1
  WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = '408');
