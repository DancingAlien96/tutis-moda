import { Link } from 'react-router-dom';
import { asset } from '../lib.js';

// Corazones del logo oficial (amarillo, azul, rojo).
export function Hearts({ size = 18 }) {
  return <img className="hearts" src={asset('/marca/logo-corazones.png')} alt="" aria-hidden="true" style={{ height: size * 1.4, width: 'auto' }} />;
}

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="Tuti's Moda Colombiana, inicio">
      <Hearts size={26} />
      <span className="logo-text">
        <span className="logo-name">TUTI'S</span>
        <span className="logo-sub">Moda Colombiana</span>
      </span>
    </Link>
  );
}
