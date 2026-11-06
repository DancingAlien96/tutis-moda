import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from './Admin.jsx';
import { useStore } from '../store.jsx';
import { money } from '../lib.js';
import { LuImagePlus, LuPencil, LuPlus, LuSearch, LuStar, LuTrash2, LuX } from 'react-icons/lu';
import ProductImage from '../components/ProductImage.jsx';

const blank = (meta) => ({
  name: '', brand: meta.brands[0] || '', style: meta.styles[0] || '', description: '', price: '', compare_price: '',
  wash: '#3b5b8c', image: '', stock: Object.fromEntries(meta.sizes.map((s) => [s, 0])), featured: false, active: true,
});

function ProductForm({ initial, onClose, onSaved }) {
  const { call } = useAdmin();
  const { meta } = useStore();
  const [p, setP] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setP((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setStock = (s, v) => setP((x) => ({ ...x, stock: { ...x.stock, [s]: v } }));

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    setUploading(true); setError('');
    try {
      const { url } = await call('/upload', { method: 'POST', form });
      setP((x) => ({ ...x, image: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const saved = await call(p.id ? `/products/${p.id}` : '/products', { method: p.id ? 'PUT' : 'POST', body: p });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal panel" onSubmit={save}>
        <div className="row-between">
          <h2>{p.id ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><LuX size={20} /></button>
        </div>
        <div className="pf-grid">
          <div className="pf-media">
            <ProductImage product={p} />
            <label className="btn btn-ghost btn-block file-btn">
              <LuImagePlus /> {uploading ? 'Subiendo…' : p.image ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} hidden />
            </label>
            {p.image && <button type="button" className="link-btn small" onClick={() => setP((x) => ({ ...x, image: '' }))}>Quitar foto (usar ilustración)</button>}
            <label className="color-row">Color de lavado <input type="color" value={p.wash} onChange={set('wash')} /></label>
          </div>
          <div className="form-grid">
            <label className="span-2">Nombre<input required value={p.name} onChange={set('name')} /></label>
            <label>Marca
              <input list="brands" required value={p.brand} onChange={set('brand')} />
              <datalist id="brands">{meta.brands.map((b) => <option key={b} value={b} />)}</datalist>
            </label>
            <label>Estilo
              <select value={p.style} onChange={set('style')}>{meta.styles.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label>Precio (Q)<input required type="number" min="1" step="0.01" value={p.price} onChange={set('price')} /></label>
            <label><span>Precio antes (Q) <span className="muted">· opcional</span></span><input type="number" min="0" step="0.01" value={p.compare_price ?? ''} onChange={set('compare_price')} /></label>
            <label className="span-2">Descripción<textarea rows="3" value={p.description} onChange={set('description')} /></label>
            <div className="span-2">
              <span className="label">Existencias por talla</span>
              <div className="stock-grid">
                {meta.sizes.map((s) => (
                  <label key={s} className="stock-cell">
                    <span>T{s}</span>
                    <input type="number" min="0" value={p.stock[s] ?? 0} onChange={(e) => setStock(s, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
            <label className="check"><input type="checkbox" checked={p.featured} onChange={set('featured')} /> Destacado (“Nuevo”)</label>
            <label className="check"><input type="checkbox" checked={p.active} onChange={set('active')} /> Visible en la tienda</label>
          </div>
        </div>
        {error && <p className="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={busy || uploading}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}

export default function Products() {
  const { call } = useAdmin();
  const { meta } = useStore();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = () => call('/products').then(setList).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [call]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return (list || []).filter((p) => `${p.name} ${p.brand} ${p.style}`.toLowerCase().includes(t));
  }, [list, q]);

  const toggleActive = async (p) => {
    const saved = await call(`/products/${p.id}`, { method: 'PUT', body: { ...p, active: !p.active } }).catch((e) => setError(e.message));
    if (saved) setList((l) => l.map((x) => (x.id === p.id ? saved : x)));
  };
  const remove = async (p) => {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    await call(`/products/${p.id}`, { method: 'DELETE' }).catch((e) => setError(e.message));
    load();
  };

  return (
    <>
      <header className="admin-head">
        <h1>Productos</h1>
        <div className="head-actions">
          <LuSearch className="search-icon" aria-hidden="true" />
          <input className="search-input" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={() => setEditing(blank(meta))}><LuPlus /> Nuevo producto</button>
        </div>
      </header>
      {error && <p className="alert">{error}</p>}
      {!list ? <p className="muted">Cargando…</p> : (
        <div className="panel table-wrap">
          <table className="table">
            <thead>
              <tr><th /><th>Producto</th><th>Precio</th><th>Existencias por talla</th><th>Visible</th><th /></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'dim'}>
                  <td><ProductImage product={p} className="thumb" /></td>
                  <td><b>{p.name}</b><br /><span className="muted small">{p.brand} · {p.style}{p.featured && <> · <LuStar className="inline-icon star" /></>}</span></td>
                  <td>{money(p.price)}</td>
                  <td>
                    <div className="stock-pills">
                      {meta.sizes.map((s) => {
                        const n = Number(p.stock[s] || 0);
                        return <span key={s} className={`sp ${n === 0 ? 'zero' : n <= 1 ? 'low' : ''}`} title={`Talla ${s}`}>{s}<b>{n}</b></span>;
                      })}
                    </div>
                  </td>
                  <td><button className={`switch ${p.active ? 'on' : ''}`} onClick={() => toggleActive(p)} aria-label="Visible en tienda" /></td>
                  <td className="right nowrap">
                    <button className="icon-btn sm" onClick={() => setEditing(p)} title="Editar" aria-label="Editar"><LuPencil /></button>
                    <button className="icon-btn sm danger" onClick={() => remove(p)} title="Eliminar" aria-label="Eliminar"><LuTrash2 /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" className="muted center">Sin productos</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <ProductForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </>
  );
}
