import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { api, DEPARTMENTS, IS_DEMO, money, storage } from '../lib.js';
import ProductImage from '../components/ProductImage.jsx';
import { LuBanknote, LuCreditCard, LuLandmark, LuLock, LuStore, LuTruck } from 'react-icons/lu';

const EMPTY = { customer_name: '', phone: '', email: '', department: '', municipality: '', address: '', notes: '' };

export default function Checkout() {
  const { cart, totals, clearCart, meta, loadMeta } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...storage.get('tutis-customer', {}) }));
  const [delivery, setDelivery] = useState('envio');
  const [payment, setPayment] = useState('contra_entrega');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const shipping = delivery === 'tienda' ? 0 : totals.shipping;
  const total = totals.subtotal + shipping;

  if (cart.length === 0) {
    return (
      <div className="container section empty">
        <h2>Tu carrito está vacío</h2>
        <Link to="/#catalogo" className="btn">Ver catálogo</Link>
      </div>
    );
  }

  const chooseDelivery = (d) => {
    setDelivery(d);
    if (d === 'envio' && payment === 'tienda') setPayment('contra_entrega');
    if (d === 'tienda' && payment === 'contra_entrega') setPayment('tienda');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: { ...form, delivery, payment, items: cart.map((i) => ({ productId: i.productId, size: i.size, qty: i.qty })) },
      });
      const { notes, ...remember } = form;
      storage.set('tutis-customer', remember);
      clearCart();
      loadMeta();
      navigate(`/pedido/${order.code}?t=${encodeURIComponent(order.access_token)}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container section">
      <h1 className="page-title">Finalizar compra</h1>
      <form className="checkout" onSubmit={submit}>
        <div className="co-main">
          <fieldset className="panel">
            <legend><span className="step">1</span> Tus datos</legend>
            <div className="form-grid">
              <label className="span-2">Nombre completo<input required value={form.customer_name} onChange={set('customer_name')} autoComplete="name" /></label>
              <label>Teléfono / WhatsApp<input required type="tel" inputMode="tel" placeholder="5555 5555" value={form.phone} onChange={set('phone')} autoComplete="tel" /></label>
              <label><span>Correo <span className="muted">(opcional)</span></span><input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
            </div>
          </fieldset>

          <fieldset className="panel">
            <legend><span className="step">2</span> Entrega</legend>
            <div className="options">
              <button type="button" className={`option ${delivery === 'envio' ? 'on' : ''}`} onClick={() => chooseDelivery('envio')}>
                <b className="with-icon"><LuTruck /> Envío a domicilio</b>
                <span className="muted small">{totals.shipping === 0 ? 'Gratis' : money(totals.shipping)} · 1 a 3 días hábiles</span>
              </button>
              <button type="button" className={`option ${delivery === 'tienda' ? 'on' : ''}`} onClick={() => chooseDelivery('tienda')}>
                <b className="with-icon"><LuStore /> Recoger en tienda</b>
                <span className="muted small">Gratis · Gualán, Zacapa o C.C. Tikal Futura</span>
              </button>
            </div>
            {delivery === 'envio' && (
              <div className="form-grid">
                <label>Departamento
                  <select required value={form.department} onChange={set('department')}>
                    <option value="">Selecciona…</option>
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </label>
                <label>Municipio<input value={form.municipality} onChange={set('municipality')} /></label>
                <label className="span-2">Dirección completa<input required placeholder="Calle, número, zona, colonia, referencia" value={form.address} onChange={set('address')} autoComplete="street-address" /></label>
              </div>
            )}
          </fieldset>

          <fieldset className="panel">
            <legend><span className="step">3</span> Pago</legend>
            <div className="options">
              {delivery === 'envio' ? (
                <button type="button" className={`option ${payment === 'contra_entrega' ? 'on' : ''}`} onClick={() => setPayment('contra_entrega')}>
                  <b className="with-icon"><LuBanknote /> Contra entrega</b><span className="muted small">Pagas en efectivo al recibir</span>
                </button>
              ) : (
                <button type="button" className={`option ${payment === 'tienda' ? 'on' : ''}`} onClick={() => setPayment('tienda')}>
                  <b className="with-icon"><LuCreditCard /> Pago en tienda</b><span className="muted small">Efectivo o tarjeta al recoger</span>
                </button>
              )}
              <button type="button" className={`option ${payment === 'transferencia' ? 'on' : ''}`} onClick={() => setPayment('transferencia')}>
                <b className="with-icon"><LuLandmark /> Transferencia o depósito</b><span className="muted small">Te enviamos los datos al confirmar</span>
              </button>
            </div>
            <label><span>Notas para tu pedido <span className="muted">(opcional)</span></span>
              <textarea rows="2" value={form.notes} onChange={set('notes')} placeholder="Ej. horario para recibir, color alternativo…" />
            </label>
          </fieldset>
        </div>

        <aside className="panel co-summary">
          <h3>Resumen</h3>
          <ul className="sum-list">
            {cart.map((i) => (
              <li key={i.key}>
                <span className="sum-thumb"><ProductImage product={i} className="thumb" /><em>{i.qty}</em></span>
                <span className="grow"><b className="small">{i.name}</b><br /><span className="muted small">Talla {i.size}</span></span>
                <span className="small">{money(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="row-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="row-between"><span>Envío</span><span>{shipping === 0 ? 'Gratis' : money(shipping)}</span></div>
          <div className="row-between total"><span>Total</span><b>{money(total)}</b></div>
          {IS_DEMO && <p className="demo-hint small">Versión demo: el pedido se guarda solo en este navegador y no se cobra nada.</p>}
          {error && <p className="alert">{error}</p>}
          <button className="btn btn-block" disabled={sending}>{sending ? 'Enviando pedido…' : <><LuLock /> Confirmar pedido · {money(total)}</>}</button>
          <p className="muted small center">Te contactaremos por WhatsApp para confirmar tu pedido. {meta.settings.store_name}</p>
        </aside>
      </form>
    </div>
  );
}
