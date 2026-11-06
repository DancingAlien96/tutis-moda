import { Fragment, useEffect, useState } from 'react';
import { useAdmin } from './Admin.jsx';
import { money, PAYMENT_LABELS, STATUS_LABELS, waLink } from '../lib.js';
import { LuMail, LuStickyNote } from 'react-icons/lu';
import { FaWhatsapp } from 'react-icons/fa6';

const fmtDate = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });

export default function Orders() {
  const { call } = useAdmin();
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrders(null);
    call(`/orders${status ? `?status=${status}` : ''}`).then(setOrders).catch((e) => setError(e.message));
  }, [call, status]);

  const change = async (o, next) => {
    if (next === 'cancelado' && !confirm(`¿Cancelar el pedido ${o.code}? Las prendas regresan al inventario.`)) return;
    try {
      const saved = await call(`/orders/${o.id}`, { method: 'PATCH', body: { status: next } });
      setOrders((list) => (status && status !== next ? list.filter((x) => x.id !== o.id) : list.map((x) => (x.id === o.id ? saved : x))));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <header className="admin-head"><h1>Pedidos</h1></header>
      <div className="tabs">
        <button className={!status ? 'on' : ''} onClick={() => setStatus('')}>Todos</button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{v}</button>
        ))}
      </div>
      {error && <p className="alert">{error}</p>}
      {!orders ? <p className="muted">Cargando…</p> : orders.length === 0 ? (
        <div className="panel empty"><p className="muted">No hay pedidos {status ? `en estado “${STATUS_LABELS[status]}”` : 'todavía'}.</p></div>
      ) : (
        <div className="panel table-wrap">
          <table className="table orders">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Entrega / pago</th><th className="right">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr className="clickable" onClick={() => setOpen(open === o.id ? null : o.id)}>
                    <td><b>{o.code}</b><br /><span className="muted small">{fmtDate(o.created_at)}</span></td>
                    <td>{o.customer_name}<br /><span className="muted small">{o.phone}</span></td>
                    <td className="small">{o.delivery === 'envio' ? `Envío · ${o.department}` : 'Recoge en tienda'}<br /><span className="muted">{PAYMENT_LABELS[o.payment]}</span></td>
                    <td className="right"><b>{money(o.total)}</b></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select className={`status-select status-${o.status}`} value={o.status} onChange={(e) => change(o, e.target.value)}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                  {open === o.id && (
                    <tr className="detail-row">
                      <td colSpan="5">
                        <div className="order-detail">
                          <div>
                            <h4>Prendas</h4>
                            <ul className="small">
                              {o.items.map((i, idx) => <li key={idx}>{i.qty} × {i.name} ({i.brand}) · talla <b>{i.size}</b> — {money(i.price * i.qty)}</li>)}
                            </ul>
                            <p className="small">Subtotal {money(o.subtotal)} · Envío {o.shipping ? money(o.shipping) : 'gratis'}</p>
                          </div>
                          <div>
                            <h4>Entrega</h4>
                            {o.delivery === 'envio'
                              ? <p className="small">{o.address}<br />{o.municipality && `${o.municipality}, `}{o.department}</p>
                              : <p className="small">Recoge en tienda</p>}
                            {o.email && <p className="small with-icon"><LuMail /> {o.email}</p>}
                            {o.notes && <p className="small note with-icon"><LuStickyNote /> {o.notes}</p>}
                          </div>
                          <div className="od-actions">
                            <a className="btn btn-sm" target="_blank" rel="noreferrer"
                              href={waLink(o.phone.replace(/\D/g, '').length === 8 ? `502${o.phone}` : o.phone,
                                `¡Hola ${o.customer_name.split(' ')[0]}! Te escribimos de Tuti's Moda Colombiana sobre tu pedido ${o.code} 👖`)}>
                              <FaWhatsapp /> WhatsApp al cliente
                            </a>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
