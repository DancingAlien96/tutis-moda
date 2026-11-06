import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { api, money, PAYMENT_LABELS, STATUS_LABELS, waLink } from '../lib.js';
import { LuCircleCheck, LuLandmark } from 'react-icons/lu';
import { FaWhatsapp } from 'react-icons/fa6';

export default function OrderDone() {
  const { code } = useParams();
  const { meta } = useStore();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api(`/orders/${code}`).then(setOrder).catch((e) => setError(e.message)); }, [code]);

  if (error) return <div className="container section empty"><p>{error}</p><Link className="btn" to="/">Ir al inicio</Link></div>;
  if (!order) return <div className="container section"><div className="skeleton-block" /></div>;

  const s = meta.settings;
  const msg = [
    `¡Hola Tuti's! Acabo de hacer el pedido *${order.code}* 🛍️`,
    ...order.items.map((i) => `• ${i.qty} x ${i.name} — talla ${i.size}`),
    `Total: ${money(order.total)} (${PAYMENT_LABELS[order.payment]})`,
    order.delivery === 'envio' ? `Envío a: ${order.address}, ${order.municipality ? order.municipality + ', ' : ''}${order.department}` : 'Recojo en tienda',
  ].join('\n');

  return (
    <div className="container section narrow">
      <div className="panel done">
        <LuCircleCheck size={52} strokeWidth={1.5} className="done-icon" />
        <h1>¡Gracias, {order.customer_name.split(' ')[0]}!</h1>
        <p>Recibimos tu pedido <b className="code">{order.code}</b>. Te escribiremos al <b>{order.phone}</b> para confirmarlo.</p>
        <span className={`status status-${order.status}`}>{STATUS_LABELS[order.status]}</span>

        <ul className="sum-list left">
          {order.items.map((i, idx) => (
            <li key={idx}><span className="grow">{i.qty} × {i.name} <span className="muted">· talla {i.size}</span></span><span>{money(i.price * i.qty)}</span></li>
          ))}
        </ul>
        <div className="row-between"><span>Envío</span><span>{order.shipping ? money(order.shipping) : 'Gratis'}</span></div>
        <div className="row-between total"><span>Total</span><b>{money(order.total)}</b></div>

        {order.payment === 'transferencia' && s.bank_info && (
          <div className="bank">
            <b className="with-icon"><LuLandmark /> Datos para tu transferencia</b>
            <p>{s.bank_info}</p>
            <p className="small muted">Envía la foto de tu comprobante por WhatsApp indicando el código {order.code}.</p>
          </div>
        )}

        <div className="done-actions">
          {s.whatsapp && <a className="btn" href={waLink(s.whatsapp, msg)} target="_blank" rel="noreferrer"><FaWhatsapp size={18} /> Enviar pedido por WhatsApp</a>}
          <Link className="btn btn-ghost" to="/">Seguir comprando</Link>
        </div>
      </div>
    </div>
  );
}
