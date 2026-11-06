// Ilustración vectorial de un jean, coloreada según el lavado del producto.
// Se usa cuando el producto aún no tiene foto.
const FITS = {
  'Skinny':   { kO: 58, kI: 94, bO: 64, bI: 91 },
  'Push up':  { kO: 56, kI: 95, bO: 62, bI: 92 },
  'Wide leg': { kO: 42, kI: 97, bO: 30, bI: 97 },
  'Campana':  { kO: 58, kI: 94, bO: 34, bI: 98 },
  'Mom':      { kO: 51, kI: 96, bO: 54, bI: 94 },
};

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

export default function JeanArt({ wash = '#3b5b8c', style = 'Skinny', className = '' }) {
  const id = `g${wash.slice(1)}${style.replace(/\W/g, '')}`;
  const light = parseInt(wash.slice(1), 16) > 0xb0b0b0;
  const seam = light ? shade(wash, -60) : shade(wash, -35);
  const stitch = light ? '#b98a2e' : '#e0ad4a';

  let leg;
  if (style === 'Short') {
    leg = 'M50 36 L46 122 L97 128 L100 104 L100 36 Z';
  } else {
    const f = FITS[style] || FITS.Skinny;
    leg = `M50 36 Q${f.kO - 4} 110 ${f.kO} 170 L${f.bO} 246 L${f.bI} 246 L${f.kI} 170 Q${f.kI + 3} 130 100 106 L100 36 Z`;
  }

  return (
    <svg className={`jean-art ${className}`} viewBox="0 0 200 260" role="img" aria-label={`Jean ${style}`}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={shade(wash, -25)} />
          <stop offset="0.35" stopColor={shade(wash, 22)} />
          <stop offset="0.5" stopColor={wash} />
          <stop offset="0.65" stopColor={shade(wash, 22)} />
          <stop offset="1" stopColor={shade(wash, -25)} />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke={seam} strokeWidth="1.2">
        <path d={leg} />
        <path d={leg} transform="translate(200 0) scale(-1 1)" />
        <rect x="49" y="18" width="102" height="19" rx="3" />
      </g>
      <g fill="none" stroke={stitch} strokeWidth="1.1" strokeDasharray="3 2.5">
        <path d="M52 22 H148" />
        <path d="M52 33 H148" />
        <path d="M57 40 Q66 64 86 40" />
        <path d="M143 40 Q134 64 114 40" />
        <path d="M100 38 V84 Q100 96 90 98" />
      </g>
      <g fill={seam}>
        <rect x="62" y="15" width="5" height="24" rx="1.5" />
        <rect x="133" y="15" width="5" height="24" rx="1.5" />
      </g>
      <circle cx="100" cy="27.5" r="4.2" fill="#d9a441" stroke="#9c6f1c" strokeWidth="1" />
      <circle cx="61" cy="44" r="1.6" fill="#d9a441" />
      <circle cx="139" cy="44" r="1.6" fill="#d9a441" />
    </svg>
  );
}
