// Datos compartidos entre el servidor (Node) y la demo estática (navegador).
// No importar nada de Node aquí.

// Tallaje colombiano de dama.
export const SIZES = ['4', '6', '8', '10', '12', '14', '16'];
export const STYLES = ['Push up', 'Skinny', 'Bota recta', 'Campana', 'Wide leg', 'Balón', 'Mom', 'Short'];
export const BRANDS = ['Fazined', 'Kabuky', 'Seven 7', 'L&L', "D'eluxe"];
export const ORDER_STATUSES = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

export const DEFAULT_SETTINGS = {
  store_name: "Tuti's Moda Colombiana",
  whatsapp: '50232574216',
  shipping_cost: '35',
  free_shipping_from: '600',
  announcement: 'Importación directa desde Colombia 🇨🇴 · Envíos a toda Guatemala · Ventas por unidad y por mayor',
  bank_info: 'Banrural · Cuenta monetaria 0000000000 · A nombre de Tuti\'s Moda Colombiana',
  address: 'Centra Norte zona 17 y Metamercado Mixco (Ciudad de Guatemala) · Zacapa cabecera · Gualán, Zacapa',
  phones: '+502 4089-2837 · +502 3257-4216',
  email: 'modacolombianatutis@gmail.com',
  instagram: 'jeanscolombianos_tutismoda',
};

// Existencias en el orden de SIZES: 4, 6, 8, 10, 12, 14, 16
const stock = (...qty) => JSON.stringify(Object.fromEntries(SIZES.map((s, i) => [s, qty[i] ?? 0])));

export const SEED_PRODUCTS = [
  {
    name: 'Jean Push Up 4 Botones Ref. 311', brand: 'Kabuky', style: 'Push up', price: 485, compare_price: 540,
    wash: '#1f3a6b', image: '/catalogo/kabuky-ref-311.webp', featured: 1, stock: stock(2, 3, 5, 5, 4, 2, 1),
    description: 'Pretina alta con 4 botones metálicos y borla decorativa. Bota tubo, horma levanta cola y tela strech de alta recuperación. Acabado de lujo.',
  },
  {
    name: 'Jean Skinny Push Up Negro Ref. 1951', brand: 'Fazined', style: 'Push up', price: 450, compare_price: 495,
    wash: '#1c1d22', image: '/catalogo/push-up-ref-1951.webp', featured: 1, stock: stock(0, 0, 4, 5, 4, 3, 2),
    description: 'Skinny push up de tiro alto con cinturón en denim y hebilla metálica. Negro profundo que no destiñe. Horma colombiana que realza la figura.',
  },
  {
    name: 'Jean Recto Push Up con Pedrería', brand: 'Fazined', style: 'Bota recta', price: 520, compare_price: null,
    wash: '#243f73', image: '/catalogo/push-up-recto-pedreria.webp', featured: 1, stock: stock(0, 0, 3, 4, 3, 2, 1),
    description: 'Bota recta con detalle lateral de pedrería y cinturón incluido. Push up con horma colombiana, tono azul oscuro.',
  },
  {
    name: 'Jean Flare 4 Botones', brand: 'Seven 7', style: 'Campana', price: 425, compare_price: null,
    wash: '#2c4f86', image: '/catalogo/seven7-flare-botones.webp', featured: 0, stock: stock(1, 3, 4, 4, 3, 2, 0),
    description: 'Bota campana con cierre de 4 botones a la vista y bolsillos traseros clásicos. Ideal con plataforma o botín.',
  },
  {
    name: 'Jean Palazzo Tiro Alto', brand: 'Seven 7', style: 'Wide leg', price: 465, compare_price: 510,
    wash: '#34507c', image: '/catalogo/seven7-palazzo.webp', featured: 0, stock: stock(1, 2, 4, 3, 3, 1, 0),
    description: 'Pierna amplia tipo palazzo con costuras curvas decorativas y ruedo con detalle. Lavado azul medio vintage.',
  },
  {
    name: 'Pantalón Balón con Botones', brand: 'Seven 7', style: 'Balón', price: 395, compare_price: null,
    wash: '#1f2d4d', image: '/catalogo/seven7-balon.webp', featured: 0, stock: stock(1, 2, 3, 3, 2, 1, 0),
    description: 'Fit balón de tiro alto con pinzas, cierre frontal con botón dorado y puños abotonados en el tobillo. Denim azul noche.',
  },
];
