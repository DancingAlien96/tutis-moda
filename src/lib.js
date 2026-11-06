// Utilidades compartidas: API, formato de moneda y almacenamiento seguro.

export const money = (n) =>
  'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (value === undefined || value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch { /* modo privado */ }
  },
};

// Demo estática (GitHub Pages): sin servidor, los datos viven en el navegador.
export const IS_DEMO = import.meta.env.VITE_DEMO === '1';

// Rutas absolutas de /public respetando el subdirectorio de publicación (p. ej. /tutis-moda/).
export const asset = (p) =>
  typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? import.meta.env.BASE_URL.replace(/\/$/, '') + p : p;

export async function api(path, opts = {}) {
  if (IS_DEMO) {
    const { demoApi } = await import('./demo.js');
    return demoApi(path, opts);
  }
  const { method = 'GET', body, token, form } = opts;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'No se pudo completar la acción');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const waLink = (phone, text) =>
  `https://wa.me/${String(phone).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

export const DEPARTMENTS = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla', 'Guatemala',
  'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu',
  'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa',
];

export const PAYMENT_LABELS = {
  contra_entrega: 'Pago contra entrega',
  transferencia: 'Transferencia / depósito',
  tienda: 'Pago en tienda',
};

export const STATUS_LABELS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

// Medidas aproximadas del tallaje colombiano de dama (cm).
export const SIZE_GUIDE = [
  ['4', 62, 88], ['6', 66, 92], ['8', 70, 96], ['10', 74, 100], ['12', 78, 104], ['14', 82, 108], ['16', 86, 112],
];
