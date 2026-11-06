import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useStore } from '../store.jsx';
import { money, waLink } from '../lib.js';
import Logo, { Hearts } from './Logo.jsx';
import ProductImage from './ProductImage.jsx';
import { LuGift, LuMail, LuMapPin, LuPhone, LuMinus, LuPlus, LuSearch, LuShoppingBag, LuTrash2, LuX } from 'react-icons/lu';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa6';

function Header() {
  const { totals, setCartOpen } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e) => {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(q.trim())}#catalogo`);
  };
  return (
    <header className="site-header">
      <div className="container header-row">
        <Logo />
        <nav className="main-nav">
          <Link to="/#catalogo">Catálogo</Link>
          <Link to="/#marcas">Marcas</Link>
          <Link to="/#nosotros">Nosotros</Link>
          <Link to="/#sucursales">Sucursales</Link>
          <Link to="/#mayoreo">Por mayor</Link>
        </nav>
        <form className="search" onSubmit={submit} role="search">
          <LuSearch className="search-icon" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jeans…" aria-label="Buscar" />
        </form>
        <button className="cart-btn" onClick={() => setCartOpen(true)} aria-label={`Abrir carrito, ${totals.count} artículos`}>
          <LuShoppingBag size={20} />
          {totals.count > 0 && <span className="cart-count">{totals.count}</span>}
        </button>
      </div>
    </header>
  );
}

function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateQty, removeItem, totals } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setCartOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCartOpen]);
  const missing = totals.freeFrom - totals.subtotal;

  return (
    <>
      <div className={`overlay ${cartOpen ? 'show' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen} aria-label="Carrito">
        <div className="drawer-head">
          <h2>Tu carrito</h2>
          <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito"><LuX size={20} /></button>
        </div>
        {cart.length === 0 ? (
          <div className="drawer-empty">
            <LuShoppingBag size={40} strokeWidth={1.4} className="empty-icon" />
            <p>Tu carrito está vacío.</p>
            <button className="btn" onClick={() => { setCartOpen(false); navigate('/#catalogo'); }}>Ver catálogo</button>
          </div>
        ) : (
          <>
            {totals.freeFrom > 0 && (
              <div className="free-ship">
                {missing > 0
                  ? <>Te faltan <b>{money(missing)}</b> para envío gratis</>
                  : <><LuGift className="inline-icon" /> ¡Tienes <b>envío gratis</b>!</>}
                <div className="bar"><span style={{ width: `${Math.min(100, (totals.subtotal / totals.freeFrom) * 100)}%` }} /></div>
              </div>
            )}
            <ul className="cart-list">
              {cart.map((i) => (
                <li key={i.key} className="cart-item">
                  <ProductImage product={i} className="thumb" />
                  <div className="ci-info">
                    <Link to={`/producto/${i.productId}`} onClick={() => setCartOpen(false)} className="ci-name">{i.name}</Link>
                    <span className="muted">{i.brand} · Talla {i.size}</span>
                    <div className="qty">
                      <button onClick={() => updateQty(i.key, i.qty - 1)} aria-label="Menos"><LuMinus /></button>
                      <span>{i.qty}</span>
                      <button onClick={() => updateQty(i.key, i.qty + 1)} disabled={i.qty >= i.max} aria-label="Más"><LuPlus /></button>
                    </div>
                  </div>
                  <div className="ci-right">
                    <b>{money(i.price * i.qty)}</b>
                    <button className="link-btn with-icon" onClick={() => removeItem(i.key)}><LuTrash2 /> Quitar</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <div className="row-between"><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
              <p className="muted small">Envío calculado en el siguiente paso.</p>
              <button className="btn btn-block" onClick={() => { setCartOpen(false); navigate('/checkout'); }}>
                Finalizar compra
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Footer() {
  const { meta } = useStore();
  const s = meta.settings;
  return (
    <footer className="site-footer" id="contacto">
      <div className="tricolor" />
      <div className="container footer-grid">
        <div>
          <Logo />
          <p className="script footer-slogan">Jeans colombianos</p>
          <p className="muted">Importamos directo de las fábricas en Colombia. Ventas por unidad y por mayor con envíos a toda Guatemala.</p>
        </div>
        <div>
          <h4>Visítanos</h4>
          <p className="icon-line"><LuMapPin /> <span>{s.address}</span></p>
        </div>
        <div>
          <h4>Contacto</h4>
          {s.whatsapp && <p className="icon-line"><FaWhatsapp /> <a href={waLink(s.whatsapp, '¡Hola Tuti\'s! Quiero información sobre sus jeans 👖')} target="_blank" rel="noreferrer">{s.whatsapp.replace(/^502(\d{4})(\d{4})$/, '+502 $1 $2')}</a></p>}
          {s.phones && <p className="icon-line"><LuPhone /> <span>{s.phones}</span></p>}
          {s.email && <p className="icon-line"><LuMail /> <a href={`mailto:${s.email}`}>{s.email}</a></p>}
          {s.instagram && <p className="icon-line"><FaInstagram /> <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noreferrer">@{s.instagram}</a></p>}
        </div>
      </div>
      <div className="container footer-bottom muted small">
        <span>© {new Date().getFullYear()} {s.store_name || "Tuti's Moda Colombiana"}</span>
        <Hearts size={12} />
      </div>
    </footer>
  );
}

function ScrollManager() {
  const { pathname, hash, search } = useLocation();
  // Página nueva → arriba. Con #ancla → desplazarse a esa sección (también al buscar desde el header).
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
    return () => clearTimeout(t);
  }, [pathname, hash, search]);
  return null;
}

export default function ShopLayout() {
  const { meta, toast } = useStore();
  return (
    <>
      <ScrollManager />
      {meta.settings.announcement && <div className="announce">{meta.settings.announcement}</div>}
      <Header />
      <main><Outlet /></main>
      <Footer />
      <CartDrawer />
      {meta.settings.whatsapp && (
        <a className="wa-float" href={waLink(meta.settings.whatsapp, '¡Hola Tuti\'s! Quiero información 👖')} target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp">
          <FaWhatsapp size={30} color="#fff" aria-hidden="true" />
        </a>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
