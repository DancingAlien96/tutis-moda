// Gráficas en SVG/HTML simple (sin librerías), siguiendo reglas de visualización:
// marcas delgadas, líneas de 2px, rejilla tenue, una sola escala, texto en tinta neutra
// y tooltip al pasar el mouse.
import { useEffect, useRef, useState } from 'react';

export const VIZ = {
  series: '#d74279', // rosa de la marca (validado: contraste ≥ 3:1 sobre blanco)
  parts: ['#2a78d6', '#eb6834', '#1baf7a'], // 3 tonos categóricos validados (orden fijo)
  grid: '#eeeae6',
  axis: '#d5d0cb',
  muted: '#8f8a8c',
};

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Escala "bonita": 0 · paso · 2 pasos · … con números redondos.
function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export const compactQ = (n) => {
  if (n >= 1e6) return `Q${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1e4) return `Q${Math.round(n / 1e3)}K`;
  return `Q${Math.round(n).toLocaleString('es-GT')}`;
};

/** Tendencia de ventas: área tenue + línea de 2px, con mira y tooltip al pasar el mouse. */
export function TrendChart({ data, format, describe, height = 240 }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { top: 16, right: 16, bottom: 28, left: 52 };
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const x = (i) => (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v) => h - (v / top) * h;

  const pt = (d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`;
  const full = data.map((d, i) => `${i ? 'L' : 'M'}${pt(d, i)}`).join('');
  const area = data.length ? `${full}L${x(data.length - 1)},${h}L${x(0)},${h}Z` : '';
  // Si el último punto es un período incompleto (mes en curso), su tramo va punteado.
  const lastPartial = data.length > 1 && data[data.length - 1].partial;
  const line = lastPartial ? data.slice(0, -1).map((d, i) => `${i ? 'L' : 'M'}${pt(d, i)}`).join('') : full;
  const tail = lastPartial ? `M${pt(data[data.length - 2], data.length - 2)}L${pt(data[data.length - 1], data.length - 1)}` : '';
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(w / 70))));
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left - pad.left;
    const i = Math.round((px / Math.max(1, w)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className="viz" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={describe}
          onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}>
          <g transform={`translate(${pad.left},${pad.top})`}>
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={w} stroke={t === 0 ? VIZ.axis : VIZ.grid} />
                <text x={-10} dy="0.32em" textAnchor="end" className="viz-tick">{compactQ(t)}</text>
              </g>
            ))}
            {data.map((d, i) => ((i % every === 0 && data.length - 1 - i >= every * 0.7) || i === data.length - 1) && (
              <text key={d.label} x={x(i)} y={h + 18} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="viz-tick">{d.label}</text>
            ))}
            <path d={area} fill={VIZ.series} opacity="0.1" />
            <path d={line} fill="none" stroke={VIZ.series} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {tail && <path d={tail} fill="none" stroke={VIZ.series} strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />}
            {data.length > 0 && hover === null && (
              <g>
                <circle cx={x(peak)} cy={y(data[peak].value)} r="4.5" fill={VIZ.series} stroke="#fff" strokeWidth="2" />
                <text x={x(peak)} y={y(data[peak].value) - 10} textAnchor={peak > data.length * 0.8 ? 'end' : peak < data.length * 0.2 ? 'start' : 'middle'} className="viz-label">
                  Mejor: {format(data[peak].value)}
                </text>
              </g>
            )}
            {hover !== null && data[hover] && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y2={h} stroke={VIZ.axis} />
                <circle cx={x(hover)} cy={y(data[hover].value)} r="4.5" fill={VIZ.series} stroke="#fff" strokeWidth="2" />
              </g>
            )}
            <rect width={w} height={h} fill="transparent" />
          </g>
        </svg>
      )}
      {hover !== null && data[hover] && (
        <div className="viz-tip" style={{ left: Math.min(width - 150, Math.max(0, pad.left + x(hover) - 70)) }}>
          <b>{data[hover].label}</b>
          <span>{format(data[hover].value)}</span>
          {data[hover].note && <span className="muted">{data[hover].note}</span>}
        </div>
      )}
    </div>
  );
}

/** Barras horizontales (una serie): nombre, barra y valor en la punta. */
export function BarList({ items, format, empty = 'Sin datos en este período' }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (!items.length || max === 0) return <p className="muted small">{empty}</p>;
  return (
    <ul className="barlist">
      {items.map((it) => (
        <li key={it.name} title={`${it.name}: ${format(it.value)}${it.note ? ` · ${it.note}` : ''}`} tabIndex={0}>
          <span className="bl-name">{it.name}</span>
          <span className="bl-track">
            <span className="bl-bar" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: VIZ.series }} />
            <span className="bl-value">{format(it.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Columnas verticales (una serie) con valor sobre cada columna y tooltip. */
export function ColumnChart({ items, format, describe, height = 200 }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { top: 22, bottom: 26 };
  const h = height - pad.top - pad.bottom;
  const max = Math.max(1, ...items.map((i) => i.value));
  const band = items.length ? width / items.length : 0;
  const barW = Math.min(24, band * 0.55);
  return (
    <div className="viz" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={describe}>
          <g transform={`translate(0,${pad.top})`}>
            <line x2={width} y1={h} y2={h} stroke={VIZ.axis} />
            {items.map((it, i) => {
              const bh = (it.value / max) * h;
              const cx = band * i + band / 2;
              const r = Math.min(4, bh);
              const x0 = cx - barW / 2, y0 = h - bh;
              const path = bh > 0
                ? `M${x0},${h}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + barW - r}Q${x0 + barW},${y0} ${x0 + barW},${y0 + r}V${h}Z`
                : '';
              return (
                <g key={it.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={band * i} y={0} width={band} height={h + pad.bottom} fill="transparent" />
                  {path && <path d={path} fill={VIZ.series} opacity={hover === null || hover === i ? 1 : 0.45} />}
                  <text x={cx} y={y0 - 6} textAnchor="middle" className="viz-label">{format(it.value)}</text>
                  <text x={cx} y={h + 18} textAnchor="middle" className="viz-tick">{it.name}</text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}

/** Barra segmentada alta: un total dividido en partes, con % dentro y leyenda. */
export function SegmentedBar({ parts, unit = 'pedidos' }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return <p className="muted small">Sin datos en este período</p>;
  return (
    <div className="segbar-wrap">
      <div className="segbar" role="img" aria-label={parts.map((p) => `${p.name}: ${p.value} ${unit}`).join(', ')}>
        {parts.filter((p) => p.value > 0).map((p, i) => {
          const share = (p.value / total) * 100;
          return (
            <span key={p.name} className="seg" style={{ flexGrow: p.value, background: VIZ.parts[parts.indexOf(p)] }}
              title={`${p.name}: ${p.value} ${unit} (${Math.round(share)}%)`}>
              {share >= 12 && <span className="seg-label">{Math.round(share)}%</span>}
            </span>
          );
        })}
      </div>
      <ul className="legend">
        {parts.map((p, i) => (
          <li key={p.name}><i style={{ background: VIZ.parts[i] }} />{p.name} <span className="muted">· {p.value}</span></li>
        ))}
      </ul>
    </div>
  );
}

