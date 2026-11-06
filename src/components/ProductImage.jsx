import JeanArt from './JeanArt.jsx';
import { asset } from '../lib.js';

export default function ProductImage({ product, className = '' }) {
  if (product.image) {
    return <img className={`product-photo ${className}`} src={asset(product.image)} alt={product.name} loading="lazy" />;
  }
  return (
    <div className={`product-art ${className}`}>
      <JeanArt wash={product.wash} style={product.style} />
    </div>
  );
}
