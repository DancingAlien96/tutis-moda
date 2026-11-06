// Estadísticas del negocio y pedidos de muestra.
// Código puro (sin Node ni navegador): lo usan el servidor y la demo estática.

const GT_OFFSET_MS = -6 * 60 * 60 * 1000; // Guatemala, UTC-6 sin horario de verano
const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const PAYMENT_NAMES = { contra_entrega: 'Contra entrega', transferencia: 'Transferencia', tienda: 'En tienda' };
export const DELIVERY_NAMES = { envio: 'Envío a domicilio', tienda: 'Recoger en tienda' };

const round = (n) => Math.round(n * 100) / 100;
// created_at se guarda en UTC como "YYYY-MM-DD HH:MM:SS".
const toMs = (s) => Date.parse(String(s).replace(' ', 'T') + 'Z');
// Día calendario de Guatemala, como número de días desde 1970 (para agrupar).
const gtDay = (ms) => Math.floor((ms + GT_OFFSET_MS) / DAY);
const dayToDate = (d) => new Date(d * DAY);
const dayLabel = (d) => { const x = dayToDate(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`; };
const monthKey = (d) => { const x = dayToDate(d); return x.getUTCFullYear() * 12 + x.getUTCMonth(); };
const monthLabel = (k) => `${MONTHS[k % 12]} ${String(Math.floor(k / 12)).slice(2)}`;

function totalsOf(orders) {
  const revenue = round(orders.reduce((a, o) => a + o.total, 0));
  const units = orders.reduce((a, o) => a + o.items.reduce((b, i) => b + i.qty, 0), 0);
  return { revenue, orders: orders.length, units, aov: orders.length ? round(revenue / orders.length) : 0 };
}

function rank(map, valueKey = 'value') {
  return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b[valueKey] - a[valueKey]);
}

/**
 * @param {Array} orders   pedidos con items ya parseados
 * @param {Array} products productos (para conocer el estilo de cada prenda)
 * @param {number} days    tamaño del período (7, 30, 90, 365)
 * @param {Array} sizes    orden de tallas
 */
export function computeAnalytics(orders, products, days, sizes, nowMs = Date.now()) {
  const today = gtDay(nowMs);
  const byMonth = days > 90;
  let from, prevFrom, prevTo;
  if (byMonth) {
    // 12 meses calendario completos (el actual va en curso), comparados con las mismas fechas un año antes.
    const k = monthKey(today) - 11;
    const t = dayToDate(today);
    from = Date.UTC(Math.floor(k / 12), k % 12, 1) / DAY;
    prevFrom = Date.UTC(Math.floor(k / 12) - 1, k % 12, 1) / DAY;
    prevTo = Date.UTC(t.getUTCFullYear() - 1, t.getUTCMonth(), t.getUTCDate()) / DAY;
  } else {
    from = today - days + 1;
    prevFrom = from - days;
    prevTo = from - 1;
  }
  const styleById = new Map(products.map((p) => [p.id, p.style]));

  const valid = orders.filter((o) => o.status !== 'cancelado').map((o) => ({ ...o, day: gtDay(toMs(o.created_at)) }));
  const current = valid.filter((o) => o.day >= from && o.day <= today);
  const previous = valid.filter((o) => o.day >= prevFrom && o.day <= prevTo);
  const cancelled = orders.filter((o) => o.status === 'cancelado' && gtDay(toMs(o.created_at)) >= from).length;

  // Serie de ventas: por día hasta 90 días, por mes en el año.
  const buckets = new Map();
  if (byMonth) {
    for (let k = monthKey(from); k <= monthKey(today); k++) {
      const partial = k === monthKey(today);
      buckets.set(k, { key: k, label: monthLabel(k), partial, revenue: 0, orders: 0 });
    }
  } else {
    for (let d = from; d <= today; d++) buckets.set(d, { key: d, label: dayLabel(d), revenue: 0, orders: 0 });
  }
  for (const o of current) {
    const b = buckets.get(byMonth ? monthKey(o.day) : o.day);
    if (b) { b.revenue = round(b.revenue + o.total); b.orders += 1; }
  }

  const brand = new Map(), style = new Map(), size = new Map(sizes.map((s) => [s, { units: 0 }]));
  const dept = new Map(), product = new Map();
  for (const o of current) {
    const place = o.delivery === 'tienda' ? 'Recoge en tienda' : (o.department || 'Sin dato');
    dept.set(place, { orders: (dept.get(place)?.orders || 0) + 1 });
    for (const i of o.items) {
      const amount = i.price * i.qty;
      const b = brand.get(i.brand) || { revenue: 0, units: 0 };
      brand.set(i.brand, { revenue: round(b.revenue + amount), units: b.units + i.qty });
      const st = styleById.get(i.productId) || 'Otro';
      const s = style.get(st) || { revenue: 0, units: 0 };
      style.set(st, { revenue: round(s.revenue + amount), units: s.units + i.qty });
      if (size.has(i.size)) size.get(i.size).units += i.qty;
      const p = product.get(i.name) || { revenue: 0, units: 0 };
      product.set(i.name, { revenue: round(p.revenue + amount), units: p.units + i.qty });
    }
  }

  const split = (names, field) => Object.entries(names).map(([key, name]) => ({
    key, name, orders: current.filter((o) => o[field] === key).length,
  }));

  return {
    range: { days, from: dayToDate(from).toISOString().slice(0, 10), to: dayToDate(today).toISOString().slice(0, 10), bucket: byMonth ? 'month' : 'day' },
    totals: { ...totalsOf(current), cancelled },
    previous: totalsOf(previous),
    series: [...buckets.values()],
    byBrand: rank(brand, 'revenue'),
    byStyle: rank(style, 'units'),
    bySize: sizes.map((s) => ({ name: s, units: size.get(s).units })),
    byDepartment: rank(dept, 'orders').slice(0, 8),
    topProducts: rank(product, 'units').slice(0, 5),
    byPayment: split(PAYMENT_NAMES, 'payment'),
    byDelivery: split(DELIVERY_NAMES, 'delivery'),
  };
}

// ---------- pedidos de muestra (para que las gráficas tengan historia) ----------

function prng(seed) { // mulberry32: mismo resultado en servidor y navegador
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rnd, weighted) => {
  const total = weighted.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [v, w] of weighted) { if ((r -= w) < 0) return v; }
  return weighted[weighted.length - 1][0];
};

const NAMES = ['María', 'Ana', 'Lucía', 'Gabriela', 'Daniela', 'Andrea', 'Fernanda', 'Sofía', 'Valeria', 'Karla', 'Jennifer', 'Paola', 'Alejandra', 'Mónica', 'Claudia', 'Rosa', 'Jessica', 'Brenda', 'Ingrid', 'Marisol'];
const INITIALS = 'ABCDEFGHJLMNOPRSTV';
const DEPTS = [['Guatemala', 34], ['Zacapa', 18], ['Chiquimula', 9], ['Izabal', 7], ['Escuintla', 5], ['Quetzaltenango', 6], ['Jutiapa', 4], ['Alta Verapaz', 4], ['Huehuetenango', 4], ['Petén', 3], ['Sacatepéquez', 4], ['El Progreso', 3]];

/**
 * Genera `days` días de pedidos con tendencia de crecimiento y más ventas en fin de semana y quincena.
 * No descuenta inventario: es historia simulada.
 */
export function generateSampleOrders(products, sizes, { days = 730, seed = 2026, nowMs = Date.now() } = {}) {
  const rnd = prng(seed);
  const orders = [];
  const today = gtDay(nowMs);
  const sizeWeights = sizes.map((s) => [s, { 4: 4, 6: 9, 8: 16, 10: 18, 12: 14, 14: 8, 16: 4 }[s] || 5]);
  const productWeights = products.map((p) => [p, p.featured ? 3 : 2]);

  for (let d = today - days + 1; d <= today; d++) {
    const date = dayToDate(d);
    const dow = date.getUTCDay();
    const dom = date.getUTCDate();
    const growth = 0.55 + 0.75 * ((d - (today - days)) / days); // el negocio crece
    const season = [11, 4, 5].includes(date.getUTCMonth()) ? 1.35 : 1; // diciembre, mayo, junio
    const payday = dom === 15 || dom === 30 || dom === 1 || dom === 14 ? 1.5 : 1;
    const weekend = dow === 5 || dow === 6 ? 1.3 : dow === 0 ? 1.1 : 1;
    const expected = 2.2 * growth * season * payday * weekend;
    const count = Math.max(0, Math.round(expected + (rnd() - 0.5) * 2.4));

    for (let n = 0; n < count; n++) {
      const lines = rnd() < 0.72 ? 1 : rnd() < 0.8 ? 2 : 3;
      const items = [];
      for (let l = 0; l < lines; l++) {
        const p = pick(rnd, productWeights);
        const size = pick(rnd, sizeWeights);
        const existing = items.find((i) => i.productId === p.id && i.size === size);
        if (existing) { existing.qty += 1; continue; }
        items.push({ productId: p.id, name: p.name, brand: p.brand, size, qty: rnd() < 0.08 ? 2 : 1, price: p.price, wash: p.wash, image: p.image });
      }
      const delivery = rnd() < 0.68 ? 'envio' : 'tienda';
      const payment = delivery === 'tienda' ? (rnd() < 0.75 ? 'tienda' : 'transferencia') : (rnd() < 0.62 ? 'contra_entrega' : 'transferencia');
      const subtotal = round(items.reduce((a, i) => a + i.price * i.qty, 0));
      const shipping = delivery === 'tienda' || subtotal >= 600 ? 0 : 35;
      const age = today - d;
      const status = rnd() < 0.05 ? 'cancelado'
        : age > 6 ? 'entregado' : age > 3 ? pick(rnd, [['entregado', 2], ['enviado', 3]]) : age > 1 ? pick(rnd, [['enviado', 2], ['confirmado', 3]]) : pick(rnd, [['confirmado', 1], ['pendiente', 3]]);
      const minutes = Math.floor(8 * 60 + rnd() * 13 * 60); // entre 8:00 y 21:00 hora de Guatemala
      const createdMs = d * DAY + minutes * 60000 - GT_OFFSET_MS;
      const name = NAMES[Math.floor(rnd() * NAMES.length)];
      orders.push({
        code: 'TM-' + Math.floor(rnd() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0'),
        access_token: 'muestra-' + Math.floor(rnd() * 1e12).toString(36),
        customer_name: `${name} ${INITIALS[Math.floor(rnd() * INITIALS.length)]}.`,
        phone: `5${Math.floor(rnd() * 9000000 + 1000000)}`,
        email: '',
        delivery,
        department: delivery === 'envio' ? pick(rnd, DEPTS) : '',
        municipality: '',
        address: delivery === 'envio' ? 'Dirección de muestra' : '',
        notes: '',
        payment, items, subtotal, shipping, total: round(subtotal + shipping), status,
        created_at: new Date(createdMs).toISOString().replace('T', ' ').slice(0, 19),
      });
    }
  }
  return orders;
}
