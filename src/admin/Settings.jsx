import { useEffect, useState } from 'react';
import { useAdmin } from './Admin.jsx';
import { useStore } from '../store.jsx';
import { IS_DEMO } from '../lib.js';

const FIELDS = [
  ['store_name', 'Nombre de la tienda'],
  ['announcement', 'Mensaje de la barra superior'],
  ['whatsapp', 'WhatsApp (con código de país, ej. 50232574216)'],
  ['shipping_cost', 'Costo de envío (Q)', 'number'],
  ['free_shipping_from', 'Envío gratis desde (Q)', 'number'],
  ['bank_info', 'Datos bancarios para transferencias', 'textarea'],
  ['address', 'Dirección(es) de las tiendas', 'textarea'],
  ['phones', 'Teléfonos visibles en la tienda'],
  ['email', 'Correo de contacto', 'email'],
  ['instagram', 'Usuario de Instagram (sin @)'],
];

export default function Settings() {
  const { call } = useAdmin();
  const { meta, loadMeta } = useStore();
  const [form, setForm] = useState(meta.settings);
  const [msg, setMsg] = useState('');
  useEffect(() => setForm(meta.settings), [meta.settings]);

  const resetDemoData = async () => {
    if (!confirm('¿Restablecer productos, pedidos y ajustes de la demo a su estado inicial?')) return;
    const { resetDemo } = await import('../demo.js');
    resetDemo();
    await loadMeta();
    setMsg('✔ Demo restablecida');
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await call('/settings', { method: 'PUT', body: form });
      await loadMeta();
      setMsg('✔ Cambios guardados');
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <>
      <header className="admin-head"><h1>Ajustes de la tienda</h1></header>
      <form className="panel form-grid settings" onSubmit={save}>
        {FIELDS.map(([k, label, type]) => (
          <label key={k} className={type === 'textarea' ? 'span-2' : ''}>
            {label}
            {type === 'textarea'
              ? <textarea rows="2" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              : <input type={type || 'text'} min="0" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
          </label>
        ))}
        <div className="span-2 row-between">
          <span className="small">{msg}</span>
          <button className="btn">Guardar cambios</button>
        </div>
      </form>
      {IS_DEMO && (
        <div className="panel demo-reset">
          <div>
            <b>Datos de la demo</b>
            <p className="muted small">En esta demo los productos, pedidos y ajustes se guardan solo en este navegador.</p>
          </div>
          <button className="btn btn-ghost" onClick={resetDemoData}>Restablecer demo</button>
        </div>
      )}
    </>
  );
}
