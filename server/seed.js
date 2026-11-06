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

// `npm run seed:sample`: además agrega ~2 años de pedidos de muestra para ver las estadísticas.
if (process.argv.includes('--sample')) {
  const { generateSampleOrders } = await import('./analytics.js');
  const { SIZES } = await import('./shared.js');
  const saved = db.prepare('SELECT id, name, brand, price, wash, image, featured FROM products').all();
  const orders = generateSampleOrders(saved, SIZES);
  const ins = db.prepare(`
    INSERT INTO orders (code, access_token, customer_name, phone, email, delivery, department, municipality, address, notes,
      payment, items, subtotal, shipping, total, status, created_at)
    VALUES (:code, :access_token, :customer_name, :phone, :email, :delivery, :department, :municipality, :address, :notes,
      :payment, :items, :subtotal, :shipping, :total, :status, :created_at)
  `);
  db.exec('BEGIN');
  for (const o of orders) ins.run({ ...o, items: JSON.stringify(o.items) });
  db.exec('COMMIT');
  console.log(`✔ ${orders.length} pedidos de muestra cargados`);
}
