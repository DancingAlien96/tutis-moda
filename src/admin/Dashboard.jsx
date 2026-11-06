import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from './Admin.jsx';
import { money, STATUS_LABELS } from '../lib.js';
import { LuBanknote, LuCircleCheck, LuClock, LuPackage, LuReceipt } from 'react-icons/lu';

export default function Dashboard() {
  const { call } = useAdmin();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { call('/stats').then(setS).catch((e) => setError(e.message)); }, [call]);

  if (error) return <p className="alert">{error}</p>;
  if (!s) return <p className="muted">Cargando…</p>;

  const maxStatus = Math.max(1, ...Object.values(s.byStatus));
  return (
    <>
      <header className="admin-head"><h1>Resumen</h1></header>
      <div className="kpis">
        <div className="kpi"><span className="with-icon"><LuBanknote /> Ventas (sin cancelados)</span><b>{money(s.revenue)}</b></div>
        <div className="kpi"><span className="with-icon"><LuReceipt /> Pedidos</span><b>{s.orders}</b></div>
        <div className="kpi accent"><span className="with-icon"><LuClock /> Pendientes por confirmar</span><b>{s.pending}</b></div>
        <div className="kpi"><span className="with-icon"><LuPackage /> Productos activos</span><b>{s.products}</b><small>{s.units} unidades en inventario</small></div>
      </div>

      <div className="admin-cols">
        <div className="panel">
          <div className="row-between"><h3>Pedidos recientes</h3><Link to="/admin/pedidos" className="small">Ver todos</Link></div>
          {s.recent.length === 0 ? <p className="muted">Aún no hay pedidos.</p> : (
            <table className="table">
              <tbody>
                {s.recent.map((o) => (
                  <tr key={o.id}>
                    <td><b>{o.code}</b><br /><span className="muted small">{o.customer_name}</span></td>
                    <td className="right">{money(o.total)}</td>
                    <td className="right"><span className={`status status-${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <h3>Pedidos por estado</h3>
          <div className="bars">
            {Object.entries(s.byStatus).map(([k, v]) => (
              <div key={k} className="bar-row">
                <span className="small">{STATUS_LABELS[k]}</span>
                <div className="bar"><span className={`status-bg-${k}`} style={{ width: `${(v / maxStatus) * 100}%` }} /></div>
                <b className="small">{v}</b>
              </div>
            ))}
          </div>
          <h3 className="mt">Más vendidos</h3>
          {s.top.length === 0 ? <p className="muted small">Sin ventas todavía.</p> : (
            <ol className="small top-list">{s.top.map((t) => <li key={t.name}>{t.name} <b>· {t.qty}</b></li>)}</ol>
          )}
        </div>

        <div className="panel">
          <div className="row-between"><h3>Tallas por agotarse</h3><Link to="/admin/productos" className="small">Inventario</Link></div>
          {s.lowStock.length === 0 ? <p className="muted small"><LuCircleCheck className="inline-icon" /> Todo con buena existencia</p> : (
            <ul className="low-list small">
              {s.lowStock.map((l) => (
                <li key={`${l.id}-${l.size}`}>
                  <span>{l.name}</span>
                  <span className={`tag ${l.qty === 0 ? 'tag-red' : 'tag-yellow'}`}>T{l.size}: {l.qty === 0 ? 'agotada' : l.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
