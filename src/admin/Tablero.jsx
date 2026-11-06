import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuArrowRight, LuCircleAlert, LuCircleCheck, LuClock, LuMinus, LuPackageCheck, LuTable2, LuTrendingDown, LuTrendingUp, LuTruck,
} from 'react-icons/lu';
import { useAdmin } from './Admin.jsx';
import { money, STATUS_LABELS } from '../lib.js';
import { BarList, ColumnChart, compactQ, SegmentedBar, TrendChart } from './charts.jsx';

const RANGES = [[7, '7 días'], [30, '30 días'], [90, '90 días'], [365, '12 meses']];
const units = (n) => `${n.toLocaleString('es-GT')} ${n === 1 ? 'prenda' : 'prendas'}`;
const ordersFmt = (n) => `${n.toLocaleString('es-GT')} ${n === 1 ? 'pedido' : 'pedidos'}`;
const fmtDate = (iso) => iso.split('-').reverse().join('/');

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function Delta({ cur, prev, label }) {
  if (!prev) return <span className="delta muted">{cur ? 'Sin datos del período anterior' : '—'}</span>;
  const pct = ((cur - prev) / prev) * 100;
  const flat = Math.abs(pct) < 0.5;
  const up = pct > 0;
  const Icon = flat ? LuMinus : up ? LuTrendingUp : LuTrendingDown;
  return (
    <span className={`delta ${flat ? 'flat' : up ? 'up' : 'down'}`}>
      <Icon aria-hidden="true" />
      {flat ? 'Igual' : `${up ? '+' : '−'}${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`}
      <span className="muted"> vs {label}</span>
    </span>
  );
}

/** Pedidos que requieren acción, con ícono + texto (el color nunca va solo). */
function ToDo({ byStatus }) {
  const rows = [
    ['pendiente', LuClock, 'Por confirmar', 'Escríbeles por WhatsApp para confirmar'],
    ['confirmado', LuPackageCheck, 'Por enviar', 'Empacar y despachar'],
    ['enviado', LuTruck, 'En camino', 'Marcar como entregados al llegar'],
  ];
  const total = rows.reduce((a, [k]) => a + (byStatus[k] || 0), 0);
  return (
    <section className="panel todo">
      <div className="row-between">
        <h3>Por atender</h3>
        <Link to="/admin/pedidos" className="small with-icon">Pedidos <LuArrowRight /></Link>
      </div>
      {total === 0 ? (
        <p className="muted small with-icon"><LuCircleCheck /> Todo al día</p>
      ) : (
        <ul className="todo-list">
          {rows.map(([k, Icon, title, hint]) => (
            <li key={k}>
              <span className={`todo-icon status-${k}`}><Icon /></span>
              <span className="grow"><b>{title}</b><br /><span className="muted small">{hint}</span></span>
              <b className="todo-count">{byStatus[k] || 0}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Tablero() {
  const { call } = useAdmin();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState('revenue');
  const [showTable, setShowTable] = useState(false);
  const [data, setData] = useState(null);
  const [ops, setOps] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    call(`/analytics?days=${days}`).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [call, days]);
  useEffect(() => { call('/stats').then(setOps).catch(() => {}); }, [call]);

  const rangeName = RANGES.find(([d]) => d === days)[1];
  const prevLabel = days === 365 ? 'el mismo período del año anterior' : `los ${days} días anteriores`;
  const t = data?.totals;
  const p = data?.previous;
  const per = data?.range.bucket === 'month' ? 'mes' : 'día';
  const series = (data?.series || []).map((s) => ({
    label: s.label,
    value: metric === 'revenue' ? s.revenue : s.orders,
    note: (metric === 'revenue' ? ordersFmt(s.orders) : money(s.revenue)) + (s.partial ? ' · mes en curso' : ''),
    partial: s.partial,
  }));

  return (
    <div className="stats-page tablero">
      <header className="admin-head">
        <div>
          <h1>Tablero</h1>
          <p className="muted small">
            {greeting()} 👋 · así va el negocio
            {data && <> · del {fmtDate(data.range.from)} al {fmtDate(data.range.to)}</>}
          </p>
        </div>
        <div className="seg-control" role="group" aria-label="Período">
          {RANGES.map(([d, label]) => (
            <button key={d} className={d === days ? 'on' : ''} aria-pressed={d === days} onClick={() => setDays(d)}>{label}</button>
          ))}
        </div>
      </header>

      {error && <p className="alert">{error}</p>}
      {!data && !error && <div className="skeleton-block" />}

      {data && (
        <>
          <section className="stat-tiles">
            <div className="stat-tile hero">
              <span className="st-label">Ventas · {rangeName}</span>
              <b className="st-value">{money(t.revenue)}</b>
              <Delta cur={t.revenue} prev={p.revenue} label={prevLabel} />
            </div>
            <div className="stat-tile">
              <span className="st-label">Pedidos</span>
              <b className="st-value">{t.orders.toLocaleString('es-GT')}</b>
              <Delta cur={t.orders} prev={p.orders} label={prevLabel} />
            </div>
            <div className="stat-tile">
              <span className="st-label">Ticket promedio</span>
              <b className="st-value">{money(t.aov)}</b>
              <Delta cur={t.aov} prev={p.aov} label={prevLabel} />
            </div>
            <div className="stat-tile">
              <span className="st-label">Prendas vendidas</span>
              <b className="st-value">{t.units.toLocaleString('es-GT')}</b>
              <Delta cur={t.units} prev={p.units} label={prevLabel} />
            </div>
          </section>

          <div className="tablero-top">
            <section className="panel chart-panel">
              <div className="chart-head">
                <div>
                  <h3>{metric === 'revenue' ? 'Ventas' : 'Pedidos'} por {per}</h3>
                  <p className="muted small">Pasa el mouse o toca la gráfica para ver cada {per}.{per === 'mes' && ' La línea punteada es el mes en curso.'}</p>
                </div>
                <div className="chart-actions">
                  <div className="seg-control sm" role="group" aria-label="Métrica">
                    <button className={metric === 'revenue' ? 'on' : ''} onClick={() => setMetric('revenue')}>Ventas (Q)</button>
                    <button className={metric === 'orders' ? 'on' : ''} onClick={() => setMetric('orders')}>Pedidos</button>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
                    <LuTable2 /> {showTable ? 'Ocultar tabla' : 'Ver tabla'}
                  </button>
                </div>
              </div>
              <TrendChart data={series} format={metric === 'revenue' ? compactQ : (n) => String(n)} describe={`${metric === 'revenue' ? 'Ventas' : 'Pedidos'} por ${per}, ${rangeName}`} />
              {showTable && (
                <div className="table-wrap viz-table">
                  <table className="table">
                    <thead><tr><th>{per === 'mes' ? 'Mes' : 'Día'}</th><th className="right">Pedidos</th><th className="right">Ventas</th></tr></thead>
                    <tbody>
                      {[...data.series].reverse().map((s) => (
                        <tr key={s.key}><td>{s.label}</td><td className="right num">{s.orders}</td><td className="right num">{money(s.revenue)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            {ops ? <ToDo byStatus={ops.byStatus} /> : <section className="panel todo"><p className="muted">Cargando…</p></section>}
          </div>

          <div className="chart-grid">
            <section className="panel chart-panel">
              <div className="row-between"><h3>Pedidos recientes</h3><Link to="/admin/pedidos" className="small with-icon">Ver todos <LuArrowRight /></Link></div>
              {!ops ? <p className="muted small">Cargando…</p> : ops.recent.length === 0 ? <p className="muted small">Aún no hay pedidos.</p> : (
                <ul className="recent-list">
                  {ops.recent.map((o) => (
                    <li key={o.id}>
                      <span className="grow"><b>{o.customer_name}</b><br /><span className="muted small">{o.code}</span></span>
                      <span className="right"><b>{money(o.total)}</b><br /><span className={`status status-${o.status}`}>{STATUS_LABELS[o.status]}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="panel chart-panel">
              <div className="row-between"><h3>Tallas por agotarse</h3><Link to="/admin/productos" className="small with-icon">Inventario <LuArrowRight /></Link></div>
              {!ops ? <p className="muted small">Cargando…</p> : ops.lowStock.length === 0 ? (
                <p className="muted small with-icon"><LuCircleCheck /> Todo con buena existencia</p>
              ) : (
                <ul className="low-list small">
                  {ops.lowStock.map((l) => (
                    <li key={`${l.id}-${l.size}`}>
                      <span>{l.name}</span>
                      <span className={`tag with-icon ${l.qty === 0 ? 'tag-red' : 'tag-yellow'}`}>
                        {l.qty === 0 && <LuCircleAlert />}T{l.size}: {l.qty === 0 ? 'agotada' : `queda ${l.qty}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel chart-panel">
              <h3>Ventas por marca</h3>
              <BarList items={data.byBrand.map((b) => ({ name: b.name, value: b.revenue, note: units(b.units) }))} format={compactQ} />
            </section>
            <section className="panel chart-panel">
              <h3>Tallas más vendidas</h3>
              <p className="muted small">Prendas vendidas por talla — útil para decidir qué pedir a las fábricas.</p>
              <ColumnChart items={data.bySize.map((s) => ({ name: s.name, value: s.units }))} format={(n) => String(n)} describe="Prendas vendidas por talla" />
            </section>
            <section className="panel chart-panel">
              <h3>Jeans más vendidos</h3>
              <BarList items={data.topProducts.map((x) => ({ name: x.name, value: x.units, note: money(x.revenue) }))} format={units} />
            </section>
            <section className="panel chart-panel">
              <h3>Estilos</h3>
              <BarList items={data.byStyle.map((x) => ({ name: x.name, value: x.units, note: money(x.revenue) }))} format={units} />
            </section>
            <section className="panel chart-panel">
              <h3>¿De dónde compran?</h3>
              <BarList items={data.byDepartment.map((x) => ({ name: x.name, value: x.orders }))} format={ordersFmt} />
            </section>
            <section className="panel chart-panel">
              <h3>Cómo pagan</h3>
              <SegmentedBar parts={data.byPayment.map((x) => ({ name: x.name, value: x.orders }))} />
              <h3 className="mt">Cómo reciben</h3>
              <SegmentedBar parts={data.byDelivery.map((x) => ({ name: x.name, value: x.orders }))} />
            </section>
          </div>
          {t.cancelled > 0 && <p className="muted small center mt">No se cuentan {t.cancelled} pedidos cancelados en este período.</p>}
        </>
      )}
    </div>
  );
}
