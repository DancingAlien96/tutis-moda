import { Link } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { money } from '../lib.js';
import ProductImage from './ProductImage.jsx';

export default function ProductCard({ product, highlightSizes = [] }) {
  const { meta, addToCart } = useStore();
  const soldOut = product.totalStock === 0;
  const off = product.compare_price ? Math.round((1 - product.price / product.compare_price) * 100) : 0;

  return (
    <article className={`card ${soldOut ? 'is-soldout' : ''}`}>
      <Link to={`/producto/${product.id}`} className="card-media">
        <ProductImage product={product} />
        <div className="badges">
          {off > 0 && <span className="badge badge-red">-{off}%</span>}
          {product.featured && !soldOut && <span className="badge badge-yellow">Nuevo</span>}
          {soldOut && <span className="badge badge-dark">Agotado</span>}
        </div>
      </Link>
      <div className="card-body">
        <span className="eyebrow">{product.brand} · {product.style}</span>
        <Link to={`/producto/${product.id}`} className="card-title">{product.name}</Link>
        <div className="price">
          <b>{money(product.price)}</b>
          {product.compare_price && <s>{money(product.compare_price)}</s>}
        </div>
        {!soldOut && (
          <div className="quick-sizes" aria-label="Agregar rápido por talla">
            {meta.sizes.map((s) => {
              const qty = Number(product.stock[s] || 0);
              return (
                <button
                  key={s}
                  className={`qs ${highlightSizes.includes(s) ? 'hl' : ''}`}
                  disabled={qty === 0}
                  title={qty ? `Agregar talla ${s}` : `Talla ${s} agotada`}
                  onClick={() => addToCart(product, s)}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
