// Carga el catálogo inicial. `npm run seed` borra productos y pedidos y vuelve a cargar.
// Las fotos viven en public/catalogo (se sirven tal cual por Vite y en producción desde dist/).
import { db } from './db.js';
import { SEED_PRODUCTS as products } from './shared.js';

const reset = process.argv.includes('--reset');
const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;

if (reset) {
  db.exec('DELETE FROM orders; DELETE FROM products; DELETE FROM sqlite_sequence;');
} else if (count > 0) {
  process.exit(0);
}


const insert = db.prepare(`
  INSERT INTO products (name, brand, style, description, price, compare_price, wash, image, stock, featured)
  VALUES (:name, :brand, :style, :description, :price, :compare_price, :wash, :image, :stock, :featured)
`);
for (const p of products) insert.run(p);

console.log(`✔ ${products.length} productos cargados`);
