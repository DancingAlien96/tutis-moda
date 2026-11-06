import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { api, asset, waLink } from '../lib.js';
import ProductCard from '../components/ProductCard.jsx';
import { LuArrowRight, LuHeart, LuMapPin, LuPlane, LuSearchX, LuSlidersHorizontal, LuStar, LuTruck } from 'react-icons/lu';
import { FaFacebook, FaWhatsapp } from 'react-icons/fa6';
import { BRANDS, REVIEWS, RESELLER_CITIES, STATS, STORES, TIMELINE } from '../content.js';

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="script">Jeans colombianos</span>
          <h1>Calidad y estilo colombiano, importados directo de fábrica</h1>
          <p>5 marcas auténticas reconocidas por su diseño y confort: Fazined, Kabuky, Seven 7, L&amp;L y D'eluxe. Push up, control de abdomen y las tendencias de cada temporada.</p>
          <div className="hero-cta">
            <a href="#catalogo" className="btn">Ver catálogo <LuArrowRight /></a>
            <a href="#mayoreo" className="btn btn-ghost">Comprar por mayor</a>
          </div>
          <ul className="perks">
            <li><LuPlane /> Importación directa desde Colombia</li>
            <li><LuTruck /> Envíos a toda Guatemala</li>
            <li><LuHeart /> +13 mil seguidores</li>
          </ul>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="blob blob-y" />
          <div className="blob blob-b" />
          <div className="blob blob-r" />
          <img src={asset('/marca/hero-modelos.webp')} alt="" className="hero-models" />
        </div>
      </div>
    </section>
  );
}

function Brands() {
  return (
    <section className="section brands" id="marcas">
      <div className="container">
        <div className="section-head center-head">
          <div>
            <span className="script">Marcas actuales</span>
            <h2>Las 5 fábricas que traemos de Colombia</h2>
            <p className="muted">Renovamos la colección con los catálogos de temporada de cada fábrica.</p>
          </div>
        </div>
        <div className="brand-grid">
          {BRANDS.map((b) => (
            <Link key={b.name} to={`/?brand=${encodeURIComponent(b.name)}#catalogo`} className="brand-card">
              <img src={asset(b.img)} alt={`Catálogo ${b.name}`} loading="lazy" />
              <span>{b.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Filters({ meta, params, setParam, toggleSize, clear, activeCount }) {
  const sizes = (params.get('sizes') || '').split(',').filter(Boolean);
  return (
    <aside className="filters">
      <div className="filters-head">
        <h3 className="with-icon"><LuSlidersHorizontal size={18} /> Filtrar</h3>
        {activeCount > 0 && <button className="link-btn" onClick={clear}>Limpiar ({activeCount})</button>}
      </div>

      <div className="filter-group">
        <h4>Talla</h4>
        <div className="size-grid">
          {meta.sizes.map((s) => (
            <button key={s} className={`chip ${sizes.includes(s) ? 'on' : ''}`} aria-pressed={sizes.includes(s)} onClick={() => toggleSize(s)}>
              {s}
            </button>
          ))}
        </div>
        <p className="muted small">Solo mostramos jeans con existencia en tu talla.</p>
      </div>

      <div className="filter-group">
        <h4>Estilo</h4>
        <div className="pill-row">
          <button className={`pill ${!params.get('style') ? 'on' : ''}`} onClick={() => setParam('style', '')}>Todos</button>
          {meta.styles.map((s) => (
            <button key={s} className={`pill ${params.get('style') === s ? 'on' : ''}`} onClick={() => setParam('style', s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h4>Marca</h4>
        <select value={params.get('brand') || ''} onChange={(e) => setParam('brand', e.target.value)}>
          <option value="">Todas las marcas</option>
          {meta.brands.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
    </aside>
  );
}

function Catalog() {
  const { meta } = useStore();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  const query = params.toString();
  useEffect(() => {
    let alive = true;
    setError('');
    api(`/products?${query}`)
      .then((p) => alive && setProducts(p))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [query]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const sizes = (params.get('sizes') || '').split(',').filter(Boolean);
  const toggleSize = (s) => {
    const next = sizes.includes(s) ? sizes.filter((x) => x !== s) : [...sizes, s];
    setParam('sizes', meta.sizes.filter((x) => next.includes(x)).join(','));
  };
  const clear = () => setParams({}, { replace: true, preventScrollReset: true });
  const activeCount = ['sizes', 'brand', 'style', 'q'].filter((k) => params.get(k)).length;

  const title = useMemo(() => {
    const q = params.get('q');
    return q ? `Resultados para “${q}”` : params.get('brand') || params.get('style') || 'Todo el catálogo';
  }, [params]);

  return (
    <section className="section" id="catalogo">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="script">Nuestra colección</span>
            <h2>{title}</h2>
          </div>
          <div className="sort">
            <label htmlFor="sort" className="muted small">Ordenar</label>
            <select id="sort" value={params.get('sort') || ''} onChange={(e) => setParam('sort', e.target.value)}>
              <option value="">Destacados</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
            </select>
          </div>
        </div>

        <div className="catalog">
          <Filters meta={meta} params={params} setParam={setParam} toggleSize={toggleSize} clear={clear} activeCount={activeCount} />
          <div>
            {error && <p className="alert">{error}</p>}
            {!products && !error && <div className="grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="card skeleton" />)}</div>}
            {products && (
              <>
                <p className="muted small results">{products.length} {products.length === 1 ? 'producto' : 'productos'}</p>
                {products.length === 0 ? (
                  <div className="empty">
                    <LuSearchX size={40} strokeWidth={1.4} className="empty-icon" />
                    <p>No encontramos jeans con esos filtros.</p>
                    <button className="btn btn-ghost" onClick={clear}>Ver todo</button>
                  </div>
                ) : (
                  <div className="grid">
                    {products.map((p) => <ProductCard key={p.id} product={p} highlightSizes={sizes} />)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section about" id="nosotros">
      <div className="container about-grid">
        <div className="about-media">
          <img src={asset('/marca/modelo-espalda.webp')} alt="Jean push up colombiano" loading="lazy" />
        </div>
        <div>
          <span className="script">Sobre nosotros</span>
          <h2>Más que vender jeans, inspiramos confianza</h2>
          <p>Somos una tienda de jeans de moda colombiana con una selección exclusiva de 5 marcas auténticas, donde la calidad y el estilo se encuentran en cada prenda. Nuestra misión es inspirar confianza y empoderamiento a través de la moda.</p>
          <p>Cumplimos con todos los requisitos legales para operar en Guatemala e importamos directamente desde Colombia, garantizando la autenticidad de cada pieza. Te asesoramos de forma personalizada para que encuentres el jean perfecto para tu estilo.</p>
          <div className="stats">
            {STATS.map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}
          </div>
        </div>
      </div>
      <div className="container">
        <h3 className="timeline-title">Nuestra historia</h3>
        <ol className="timeline">
          {TIMELINE.map(([date, text]) => (
            <li key={date}><span className="t-date">{date}</span><p>{text}</p></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Stores() {
  return (
    <section className="section stores" id="sucursales">
      <div className="container">
        <div className="section-head center-head">
          <div>
            <span className="script">Visítanos</span>
            <h2>Sucursales y puntos de venta</h2>
            <p className="muted">Pruébate tu jean con asesoría personalizada en cualquiera de nuestras tiendas.</p>
          </div>
        </div>
        <div className="store-grid">
          {STORES.map((st) => (
            <article key={st.name} className={`store-card ${st.soon ? 'soon' : ''}`}>
              <div className="store-img">
                <img src={asset(st.img)} alt={`Tienda ${st.name}`} loading="lazy" />
                {st.soon && <span className="badge badge-pink">Próximamente</span>}
              </div>
              <div className="store-body">
                <b>{st.name}</b>
                <span className="muted small with-icon"><LuMapPin /> {st.place}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section className="section reviews">
      <div className="container">
        <div className="section-head center-head">
          <div>
            <span className="script">Nuestras reseñas</span>
            <h2>Recomendado por el 100% de nuestras clientas</h2>
          </div>
        </div>
        <div className="review-grid">
          {REVIEWS.map((r) => (
            <figure key={r.name} className="review">
              <div className="stars" aria-label="5 estrellas">{Array.from({ length: 5 }, (_, i) => <LuStar key={i} />)}</div>
              <blockquote>“{r.text}”</blockquote>
              <figcaption>
                <span className="avatar">{r.name.split(' ').map((w) => w[0]).join('')}</span>
                <span><b>{r.name}</b><br /><span className="muted small with-icon"><FaFacebook /> Opinión en Facebook</span></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { meta } = useStore();
  const wa = meta.settings.whatsapp;
  return (
    <>
      <Hero />
      <Brands />
      <Catalog />
      <About />
      <Stores />
      <Reviews />
      <section className="section mayoreo" id="mayoreo">
        <div className="container mayoreo-box">
          <div>
            <span className="script">Por mayor y revendedoras</span>
            <h2>Emprende con jeans colombianos</h2>
            <p>Vendemos por unidad y por mayor, con paquetes surtidos de tallas. Buscamos revendedoras en todo el país:</p>
            <ul className="city-chips">{RESELLER_CITIES.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          {wa && (
            <a className="btn btn-light" href={waLink(wa, '¡Hola Tuti\'s! Me interesa comprar por mayor o ser revendedora. ¿Me envían el catálogo mayorista?')} target="_blank" rel="noreferrer">
              <FaWhatsapp size={18} /> Quiero ser revendedora
            </a>
          )}
        </div>
      </section>
    </>
  );
}
