// API simulada para la demo estática (GitHub Pages, sin servidor).
// Replica las rutas de server/index.js y guarda todo en el localStorage del visitante.
import { BRANDS, DEFAULT_SETTINGS, ORDER_STATUSES, SEED_PRODUCTS, SIZES, STYLES } from '../server/shared.js';

export const DEMO_PASSWORD = 'tutis2026';
const KEY = 'tutis-demo-db-v1';
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const money = (n) => Math.round(Number(n) * 100) / 100;
const clone = (x) => JSON.parse(JSON.stringify(x));

function fresh() {
  const products = SEED_PRODUCTS.map((p, i) => ({
    id: i + 1, active: 1, created_at: now(), ...p, stock: JSON.parse(p.stock),
  }));
  return { products, orders: [], settings: { ...DEFAULT_SETTINGS }, seq: { products: products.length, orders: 0 } };
}

let memory = null;
function load() {
  if (memory) return memory;
  try { memory = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { memory = fresh(); }
  return memory;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* sin almacenamiento: queda en memoria */ }
}

const view = (p) => ({
  ...p, featured: !!p.featured, active: !!p.active,
  totalStock: Object.values(p.stock).reduce((a, b) => a + Number(b || 0), 0),
});

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, msg) => { throw new HttpError(status, msg); };
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function readProduct(b) {
  const name = str(b.name, 120);
  const price = Number(b.price);
  if (!name) fail(400, 'El nombre es obligatorio');
  if (!(price > 0)) fail(400, 'El precio debe ser mayor a 0');
  const stock = {};
  for (const s of SIZES) stock[s] = Math.max(0, Math.floor(Number(b.stock?.[s]) || 0));
  const compare = Number(b.compare_price);
  return {
    name, price: money(price), brand: str(b.brand, 60) || BRANDS[0], style: str(b.style, 60) || STYLES[0],
    description: str(b.description, 2000), compare_price: compare > price ? money(compare) : null,
    wash: /^#[0-9a-f]{6}$/i.test(b.wash) ? b.wash : '#3b5b8c', image: b.image || null, stock,
    featured: b.featured ? 1 : 0, active: b.active === false ? 0 : 1,
  };
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new HttpError(400, 'No se pudo leer la imagen'));
  r.readAsDataURL(file);
});

async function handle(method, path, body, token, form) {
  const db = load();
  const [pathname, qs = ''] = path.split('?');
  const q = new URLSearchParams(qs);
  const seg = pathname.split('/').filter(Boolean);

  // ---- tienda pública ----
  if (method === 'GET' && pathname === '/meta') return { sizes: SIZES, styles: STYLES, brands: BRANDS, settings: db.settings };

  if (method === 'GET' && pathname === '/products') {
    let rows = db.products.filter((p) => p.active).map(view)
      .sort((a, b) => (b.featured - a.featured) || (b.id - a.id));
    const sizes = (q.get('sizes') || '').split(',').filter(Boolean);
    const text = (q.get('q') || '').toLowerCase();
    if (sizes.length) rows = rows.filter((p) => sizes.some((s) => Number(p.stock[s]) > 0));
    if (q.get('brand')) rows = rows.filter((p) => p.brand === q.get('brand'));
    if (q.get('style')) rows = rows.filter((p) => p.style === q.get('style'));
    if (text) rows = rows.filter((p) => `${p.name} ${p.brand} ${p.style}`.toLowerCase().includes(text));
    if (q.get('sort') === 'price_asc') rows.sort((a, b) => a.price - b.price);
    if (q.get('sort') === 'price_desc') rows.sort((a, b) => b.price - a.price);
    return rows;
  }

  if (method === 'GET' && seg[0] === 'products' && seg[1]) {
    const p = db.products.find((x) => x.id === Number(seg[1]) && x.active);
    return p ? view(p) : fail(404, 'Producto no encontrado');
  }

  if (method === 'POST' && pathname === '/orders') {
    const b = body || {};
    const delivery = b.delivery === 'tienda' ? 'tienda' : 'envio';
    const payment = ['contra_entrega', 'transferencia', 'tienda'].includes(b.payment) ? b.payment : null;
    if (!str(b.customer_name)) fail(400, 'Escribe tu nombre');
    if (!/^[\d\s+-]{8,}$/.test(str(b.phone))) fail(400, 'Escribe un teléfono válido');
    if (!payment) fail(400, 'Elige un método de pago');
    if (delivery === 'envio' && (!str(b.department) || !str(b.address))) fail(400, 'Completa departamento y dirección');
    if (!Array.isArray(b.items) || !b.items.length) fail(400, 'Tu carrito está vacío');

    const draft = clone(db.products);
    const items = b.items.map((it) => {
      const p = draft.find((x) => x.id === Number(it.productId) && x.active);
      if (!p) fail(409, 'Uno de los productos ya no está disponible');
      const qty = Math.max(1, Math.min(20, Math.floor(Number(it.qty) || 0)));
      const size = String(it.size);
      const available = Number(p.stock[size] || 0);
      if (available < qty) fail(409, available ? `Solo quedan ${available} de "${p.name}" talla ${size}` : `"${p.name}" talla ${size} se agotó`);
      p.stock[size] = available - qty;
      return { productId: p.id, name: p.name, brand: p.brand, size, qty, price: p.price, wash: p.wash, image: p.image };
    });
    const subtotal = money(items.reduce((a, i) => a + i.price * i.qty, 0));
    const shipping = delivery === 'tienda' || subtotal >= Number(db.settings.free_shipping_from) ? 0 : Number(db.settings.shipping_cost);
    const order = {
      id: ++db.seq.orders, code: 'TM-' + Math.random().toString(16).slice(2, 10).toUpperCase(),
      access_token: crypto.randomUUID(),
      customer_name: str(b.customer_name, 120), phone: str(b.phone, 30), email: str(b.email, 120), delivery,
      department: str(b.department, 60), municipality: str(b.municipality, 80), address: str(b.address, 300),
      notes: str(b.notes, 500), payment, items, subtotal, shipping, total: money(subtotal + shipping),
      status: 'pendiente', created_at: now(),
    };
    db.products = draft;
    db.orders.push(order);
    save();
    return order;
  }

  if (method === 'GET' && seg[0] === 'orders' && seg[1]) {
    const o = db.orders.find((x) => x.code === seg[1] && x.access_token === q.get('t'));
    return o || fail(404, 'Pedido no encontrado');
  }

  // ---- administrador ----
  if (method === 'POST' && pathname === '/admin/login') {
    if (body?.password !== DEMO_PASSWORD) fail(401, 'Contraseña incorrecta');
    return { token: 'demo' };
  }
  if (seg[0] === 'admin') {
    if (token !== 'demo') fail(401, 'Sesión expirada, vuelve a ingresar');
    const route = `${method} /${seg.slice(1, 2).join('/')}`;
    const id = Number(seg[2]);

    if (route === 'GET /stats') {
      const valid = db.orders.filter((o) => o.status !== 'cancelado');
      const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, db.orders.filter((o) => o.status === s).length]));
      const sold = {};
      for (const o of valid) for (const i of o.items) sold[i.name] = (sold[i.name] || 0) + i.qty;
      return {
        revenue: money(valid.reduce((a, o) => a + o.total, 0)), orders: db.orders.length, pending: byStatus.pendiente,
        products: db.products.filter((p) => p.active).length,
        units: db.products.reduce((a, p) => a + view(p).totalStock, 0), byStatus,
        lowStock: db.products.filter((p) => p.active).flatMap((p) => SIZES.filter((s) => p.stock[s] !== undefined && Number(p.stock[s]) <= 1)
          .map((s) => ({ id: p.id, name: p.name, size: s, qty: Number(p.stock[s]) }))).slice(0, 12),
        top: Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })),
        recent: [...db.orders].sort((a, b) => b.id - a.id).slice(0, 6),
      };
    }
    if (route === 'GET /products') return [...db.products].sort((a, b) => b.id - a.id).map(view);
    if (route === 'POST /products') {
      const p = { id: ++db.seq.products, created_at: now(), ...readProduct(body || {}) };
      db.products.push(p); save(); return view(p);
    }
    if (route === 'PUT /products') {
      const i = db.products.findIndex((p) => p.id === id);
      if (i < 0) fail(404, 'Producto no encontrado');
      db.products[i] = { ...db.products[i], ...readProduct(body || {}) }; save(); return view(db.products[i]);
    }
    if (route === 'DELETE /products') {
      db.products = db.products.filter((p) => p.id !== id); save(); return { ok: true };
    }
    if (route === 'POST /upload') {
      const file = form?.get('image');
      if (!file || !/^image\/(jpeg|png|webp|avif)$/.test(file.type)) fail(400, 'Sube una imagen JPG, PNG o WEBP');
      if (file.size > 1.5 * 1024 * 1024) fail(400, 'En la demo la imagen debe pesar menos de 1.5 MB');
      return { url: await fileToDataUrl(file) };
    }
    if (route === 'GET /orders') {
      const status = q.get('status');
      return [...db.orders].filter((o) => !status || o.status === status).sort((a, b) => b.id - a.id);
    }
    if (route === 'PATCH /orders') {
      const status = body?.status;
      if (!ORDER_STATUSES.includes(status)) fail(400, 'Estado inválido');
      const order = db.orders.find((o) => o.id === id) || fail(404, 'Pedido no encontrado');
      const delta = status === 'cancelado' && order.status !== 'cancelado' ? 1
        : order.status === 'cancelado' && status !== 'cancelado' ? -1 : 0;
      if (delta) {
        for (const i of order.items) {
          const p = db.products.find((x) => x.id === i.productId);
          if (p) p.stock[i.size] = Math.max(0, Number(p.stock[i.size] || 0) + delta * i.qty);
        }
      }
      order.status = status; save(); return order;
    }
    if (route === 'PUT /settings') {
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (body?.[k] !== undefined) db.settings[k] = String(body[k]).slice(0, 500);
      save(); return db.settings;
    }
  }
  fail(404, 'Ruta no encontrada');
}

export async function demoApi(path, { method = 'GET', body, token, form } = {}) {
  await new Promise((r) => setTimeout(r, 120)); // simula la red
  try {
    return clone(await handle(method, path, body, token, form));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e?.name === 'QuotaExceededError') throw new HttpError(400, 'El almacenamiento del navegador está lleno');
    throw new HttpError(500, 'Error en la demo');
  }
}

export function resetDemo() {
  memory = fresh();
  save();
}
