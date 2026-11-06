import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { api, money, SIZE_GUIDE, waLink } from '../lib.js';
import ProductImage from '../components/ProductImage.jsx';
import { LuBadgeCheck, LuBanknote, LuMinus, LuPlus, LuRuler, LuShoppingBag, LuTruck } from 'react-icons/lu';
import { FaWhatsapp } from 'react-icons/fa6';

export default function Product() {
  const { id } = useParams();
  const { meta, addToCart, cart } = useStore();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    setProduct(null); setSize(''); setQty(1); setError('');
    api(`/products/${id}`).then(setProduct).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="container section empty">
        <p>{error}</p>
        <Link to="/#catalogo" className="btn">Volver al catálogo</Link>
      </div>
    );
  }
  if (!product) return <div className="container section"><div className="pdp skeleton-block" /></div>;

  const available = size ? Number(product.stock[size] || 0) : 0;
  const inCart = cart.find((i) => i.key === `${product.id}-${size}`)?.qty || 0;
  const canAdd = size && available - inCart >= qty;
  const soldOut = product.totalStock === 0;
  const wa = meta.settings.whatsapp;

  return (
    <div className="container section">
      <nav className="crumbs small"><Link to="/">Inicio</Link> / <Link to={`/?style=${encodeURIComponent(product.style)}#catalogo`}>{product.style}</Link> / <span>{product.name}</span></nav>
      <div className="pdp">
        <div className="pdp-media">
          <ProductImage product={product} />
        </div>
        <div className="pdp-info">
          <span className="eyebrow">{product.brand} · {product.style}</span>
          <h1>{product.name}</h1>
          <div className="price big">
            <b>{money(product.price)}</b>
            {product.compare_price && <s>{money(product.compare_price)}</s>}
          </div>
          <p className="desc">{product.description}</p>

          <div className="row-between">
            <h4>Elige tu talla</h4>
            <button className="link-btn with-icon" onClick={() => setGuide((g) => !g)}><LuRuler /> {guide ? 'Ocultar guía' : 'Guía de tallas'}</button>
          </div>
          {guide && (
            <table className="guide small">
              <thead><tr><th>Talla</th><th>Cintura (cm)</th><th>Cadera (cm)</th></tr></thead>
              <tbody>{SIZE_GUIDE.map(([t, c, h]) => <tr key={t} className={t === size ? 'on' : ''}><td>{t}</td><td>{c}</td><td>{h}</td></tr>)}</tbody>
            </table>
          )}
          <div className="size-grid lg">
            {meta.sizes.map((s) => {
              const q = Number(product.stock[s] || 0);
              return (
                <button key={s} className={`chip ${size === s ? 'on' : ''}`} disabled={!q} onClick={() => { setSize(s); setQty(1); }} aria-pressed={size === s}>
                  {s}
                  {q > 0 && q <= 2 && <small>¡Últimas {q}!</small>}
                </button>
              );
            })}
          </div>
          {soldOut && <p className="alert">Este modelo está agotado por ahora. Escríbenos y te avisamos cuando vuelva.</p>}

          {!soldOut && (
            <div className="buy-row">
              <div className="qty lg">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos"><LuMinus /></button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} disabled={!size || qty >= available - inCart} aria-label="Más"><LuPlus /></button>
              </div>
              <button className="btn grow" disabled={!canAdd} onClick={() => addToCart(product, size, qty)}>
                {!size ? 'Selecciona una talla' : canAdd ? <><LuShoppingBag /> Agregar al carrito</> : 'Ya tienes todas en el carrito'}
              </button>
            </div>
          )}
          {wa && (
            <a className="btn btn-ghost btn-block" target="_blank" rel="noreferrer"
              href={waLink(wa, `¡Hola! Me interesa el ${product.name} (${product.brand})${size ? ` en talla ${size}` : ''}. ¿Está disponible?`)}>
              <FaWhatsapp size={18} /> Consultar por WhatsApp
            </a>
          )}
          <ul className="pdp-perks small">
            <li><LuTruck /> Envío a toda Guatemala · gratis desde {money(meta.settings.free_shipping_from)}</li>
            <li><LuBanknote /> Paga contra entrega, por transferencia o en tienda</li>
            <li><LuBadgeCheck /> Jean colombiano original</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
