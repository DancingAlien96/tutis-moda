import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { existsSync, unlink } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

try { process.loadEnvFile(); } catch { /* sin .env: usamos valores por defecto */ }

const { db, tx, SIZES, STYLES, BRANDS, ORDER_STATUSES, getSettings, rowToProduct, rowToOrder, DEFAULT_SETTINGS } =
  await import('./db.js');

if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n === 0) await import('./seed.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS = join(__dirname, 'uploads');
const PORT = Number(process.env.API_PORT || 4180);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'tutis2026';
const SECRET = process.env.SESSION_SECRET || 'dev-secret-cambiar';
if (!process.env.ADMIN_PASSWORD) console.warn('⚠ ADMIN_PASSWORD no definido: usando la clave de desarrollo "tutis2026"');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOADS, { maxAge: '7d' }));

// ---------- utilidades ----------
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const money = (n) => Math.round(Number(n) * 100) / 100;

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  return data.exp > Date.now() ? data : null;
}
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!verify(token)) return bad(res, 'Sesión expirada, vuelve a ingresar', 401);
  next();
}

// ---------- tienda pública ----------
app.get('/api/meta', (_req, res) => {
  res.json({ sizes: SIZES, styles: STYLES, brands: BRANDS, settings: getSettings() });
});

app.get('/api/products', (req, res) => {
  let rows = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY featured DESC, created_at DESC, id DESC').all().map(rowToProduct);
  const sizes = str(req.query.sizes).split(',').filter(Boolean);
  const brand = str(req.query.brand);
  const style = str(req.query.style);
  const q = str(req.query.q).toLowerCase();
  if (sizes.length) rows = rows.filter((p) => sizes.some((s) => Number(p.stock[s]) > 0));
  if (brand) rows = rows.filter((p) => p.brand === brand);
  if (style) rows = rows.filter((p) => p.style === style);
  if (q) rows = rows.filter((p) => `${p.name} ${p.brand} ${p.style}`.toLowerCase().includes(q));
  const sort = str(req.query.sort);
  if (sort === 'price_asc') rows.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') rows.sort((a, b) => b.price - a.price);
  res.json(rows);
});

app.get('/api/products/:id', (req, res) => {
  const p = rowToProduct(db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(Number(req.params.id)));
  if (!p) return bad(res, 'Producto no encontrado', 404);
  res.json(p);
});

app.post('/api/orders', (req, res) => {
  const b = req.body || {};
  const customer_name = str(b.customer_name, 120);
  const phone = str(b.phone, 30);
  const delivery = b.delivery === 'tienda' ? 'tienda' : 'envio';
  const payment = ['contra_entrega', 'transferencia', 'tienda'].includes(b.payment) ? b.payment : null;
  if (!customer_name) return bad(res, 'Escribe tu nombre');
  if (!/^[\d\s+-]{8,}$/.test(phone)) return bad(res, 'Escribe un teléfono válido');
  if (!payment) return bad(res, 'Elige un método de pago');
  if (delivery === 'envio' && (!str(b.department) || !str(b.address))) return bad(res, 'Completa departamento y dirección');
  if (!Array.isArray(b.items) || b.items.length === 0) return bad(res, 'Tu carrito está vacío');

  const settings = getSettings();
  try {
    const order = tx(() => {
      const items = [];
      for (const it of b.items.slice(0, 50)) {
        const qty = Math.max(1, Math.min(20, Math.floor(Number(it.qty) || 0)));
        const size = String(it.size);
        const row = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(Number(it.productId));
        if (!row) throw new Error('Uno de los productos ya no está disponible');
        const p = rowToProduct(row);
        const available = Number(p.stock[size] || 0);
        if (available < qty) {
          throw new Error(available ? `Solo quedan ${available} de "${p.name}" talla ${size}` : `"${p.name}" talla ${size} se agotó`);
        }
        p.stock[size] = available - qty;
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(JSON.stringify(p.stock), p.id);
        items.push({ productId: p.id, name: p.name, brand: p.brand, size, qty, price: p.price, wash: p.wash, image: p.image });
      }
      const subtotal = money(items.reduce((a, i) => a + i.price * i.qty, 0));
      const shipping = delivery === 'tienda' || subtotal >= Number(settings.free_shipping_from) ? 0 : Number(settings.shipping_cost);
      const code = 'TM-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const info = db.prepare(`
        INSERT INTO orders (code, customer_name, phone, email, delivery, department, municipality, address, notes, payment, items, subtotal, shipping, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(code, customer_name, phone, str(b.email, 120), delivery, str(b.department, 60), str(b.municipality, 80),
        str(b.address, 300), str(b.notes, 500), payment, JSON.stringify(items), subtotal, shipping, money(subtotal + shipping));
      return rowToOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid));
    });
    res.status(201).json(order);
  } catch (e) {
    bad(res, e.message, 409);
  }
});

app.get('/api/orders/:code', (req, res) => {
  const o = rowToOrder(db.prepare('SELECT * FROM orders WHERE code = ?').get(str(req.params.code, 20)));
  if (!o) return bad(res, 'Pedido no encontrado', 404);
  res.json(o);
});

// ---------- administrador ----------
app.post('/api/admin/login', (req, res) => {
  const pass = String(req.body?.password || '');
  const ok = pass.length === ADMIN_PASSWORD.length &&
    crypto.timingSafeEqual(Buffer.from(pass), Buffer.from(ADMIN_PASSWORD));
  if (!ok) return bad(res, 'Contraseña incorrecta', 401);
  res.json({ token: sign({ role: 'admin', exp: Date.now() + 1000 * 60 * 60 * 12 }) });
});

const admin = express.Router();
admin.use(requireAdmin);

admin.get('/stats', (_req, res) => {
  const orders = db.prepare('SELECT * FROM orders').all().map(rowToOrder);
  const valid = orders.filter((o) => o.status !== 'cancelado');
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length]));
  const products = db.prepare('SELECT * FROM products').all().map(rowToProduct);
  const lowStock = products
    .flatMap((p) => SIZES.filter((s) => p.active && p.stock[s] !== undefined && Number(p.stock[s]) <= 1)
      .map((s) => ({ id: p.id, name: p.name, size: s, qty: Number(p.stock[s]) })))
    .slice(0, 12);
  const sold = {};
  for (const o of valid) for (const i of o.items) sold[i.name] = (sold[i.name] || 0) + i.qty;
  const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
  res.json({
    revenue: money(valid.reduce((a, o) => a + o.total, 0)),
    orders: orders.length,
    pending: byStatus.pendiente,
    products: products.filter((p) => p.active).length,
    units: products.reduce((a, p) => a + p.totalStock, 0),
    byStatus,
    lowStock,
    top,
    recent: orders.sort((a, b) => b.id - a.id).slice(0, 6),
  });
});

admin.get('/products', (_req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(rowToProduct));
});

function readProduct(b) {
  const name = str(b.name, 120);
  const price = Number(b.price);
  if (!name) throw new Error('El nombre es obligatorio');
  if (!(price > 0)) throw new Error('El precio debe ser mayor a 0');
  const stock = {};
  for (const s of SIZES) stock[s] = Math.max(0, Math.floor(Number(b.stock?.[s]) || 0));
  const compare = Number(b.compare_price);
  return {
    name, price: money(price),
    brand: str(b.brand, 60) || BRANDS[0],
    style: str(b.style, 60) || STYLES[0],
    description: str(b.description, 2000),
    compare_price: compare > price ? money(compare) : null,
    wash: /^#[0-9a-f]{6}$/i.test(b.wash) ? b.wash : '#3b5b8c',
    image: str(b.image, 300) || null,
    stock: JSON.stringify(stock),
    featured: b.featured ? 1 : 0,
    active: b.active === false ? 0 : 1,
  };
}

admin.post('/products', (req, res) => {
  try {
    const p = readProduct(req.body || {});
    const info = db.prepare(`
      INSERT INTO products (name, brand, style, description, price, compare_price, wash, image, stock, featured, active)
      VALUES (:name, :brand, :style, :description, :price, :compare_price, :wash, :image, :stock, :featured, :active)
    `).run(p);
    res.status(201).json(rowToProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid)));
  } catch (e) { bad(res, e.message); }
});

admin.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const prev = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!prev) return bad(res, 'Producto no encontrado', 404);
  try {
    const p = readProduct(req.body || {});
    db.prepare(`
      UPDATE products SET name=:name, brand=:brand, style=:style, description=:description, price=:price,
        compare_price=:compare_price, wash=:wash, image=:image, stock=:stock, featured=:featured, active=:active
      WHERE id = :id
    `).run({ ...p, id });
    if (prev.image && prev.image !== p.image) removeUpload(prev.image);
    res.json(rowToProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)));
  } catch (e) { bad(res, e.message); }
});

admin.delete('/products/:id', (req, res) => {
  const prev = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id));
  if (!prev) return bad(res, 'Producto no encontrado', 404);
  db.prepare('DELETE FROM products WHERE id = ?').run(prev.id);
  if (prev.image) removeUpload(prev.image);
  res.json({ ok: true });
});

function removeUpload(url) {
  if (!url.startsWith('/uploads/')) return;
  const file = join(UPLOADS, url.replace('/uploads/', ''));
  if (existsSync(file)) unlink(file, () => {});
}

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|avif)$/.test(file.mimetype)),
});
admin.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return bad(res, 'Sube una imagen JPG, PNG o WEBP de máximo 5 MB');
  res.json({ url: `/uploads/${req.file.filename}` });
});

admin.get('/orders', (req, res) => {
  const status = str(req.query.status);
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  res.json(rows.map(rowToOrder));
});

admin.patch('/orders/:id', (req, res) => {
  const status = str(req.body?.status);
  if (!ORDER_STATUSES.includes(status)) return bad(res, 'Estado inválido');
  const order = rowToOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id)));
  if (!order) return bad(res, 'Pedido no encontrado', 404);
  tx(() => {
    // Al cancelar se devuelve el inventario; al reactivar un cancelado se vuelve a descontar.
    const delta = status === 'cancelado' && order.status !== 'cancelado' ? 1
      : order.status === 'cancelado' && status !== 'cancelado' ? -1 : 0;
    if (delta) {
      for (const i of order.items) {
        const row = db.prepare('SELECT stock FROM products WHERE id = ?').get(i.productId);
        if (!row) continue;
        const stock = JSON.parse(row.stock);
        stock[i.size] = Math.max(0, Number(stock[i.size] || 0) + delta * i.qty);
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(JSON.stringify(stock), i.productId);
      }
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
  });
  res.json(rowToOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)));
});

admin.put('/settings', (req, res) => {
  const up = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (req.body?.[key] !== undefined) up.run(str(String(req.body[key]), 500), key);
  }
  res.json(getSettings());
});

app.use('/api/admin', admin);
app.use('/api', (_req, res) => bad(res, 'Ruta no encontrada', 404));

// En producción el mismo servidor entrega el frontend compilado.
const DIST = join(__dirname, '..', 'dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(join(DIST, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  bad(res, err.code === 'LIMIT_FILE_SIZE' ? 'La imagen pesa más de 5 MB' : 'Error interno', 500);
});

app.listen(PORT, () => console.log(`API de Tuti's Moda en http://localhost:${PORT}`));
