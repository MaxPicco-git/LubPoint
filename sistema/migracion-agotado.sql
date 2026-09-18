-- Agrega la marca "sin stock" a una base que ya estaba creada.
-- Correr una sola vez:  npx wrangler d1 execute lubpoint --remote --file=migracion-agotado.sql
ALTER TABLE productos ADD COLUMN agotado INTEGER NOT NULL DEFAULT 0;
