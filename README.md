# Tuti's Moda Colombiana — tienda en línea

Tienda de jeans colombianos (Fazined, Kabuky, Seven 7, L&L, D'eluxe) con catálogo, filtro por tallas,
carrito, checkout sencillo y panel de administrador.

**Stack:** React 18 + Vite (frontend) · Express + SQLite nativo de Node 22 (`node:sqlite`, sin compilar nada).

## Arrancar en local

```bash
npm install
cp .env.example .env   # y cambia ADMIN_PASSWORD
npm run dev
```

- Tienda: http://localhost:5180
- Administrador: http://localhost:5180/admin (contraseña = `ADMIN_PASSWORD` del `.env`)
- API: http://localhost:4180

La primera vez se cargan 6 productos con fotos reales de la tienda (en `public/catalogo/`) y precios de referencia.
`npm run seed` **borra productos y pedidos** y recarga ese catálogo inicial.

## Qué incluye

**Tienda**
- Inicio con hero, marcas, catálogo y sección de venta por mayor (WhatsApp).
- Filtros por talla colombiana (4–16, solo muestra jeans con existencia en esa talla), estilo, marca, búsqueda y orden por precio. Los filtros quedan en la URL (se pueden compartir).
- Agregar rápido por talla desde la tarjeta, o desde el detalle con guía de tallas.
- Carrito lateral guardado en el navegador, con barra de "te faltan Q… para envío gratis".
- Checkout de una página: datos → entrega (envío a domicilio o recoger en tienda) → pago (contra entrega, transferencia o en tienda).
- Confirmación con código de pedido y botón para enviar el pedido por WhatsApp.

**Administrador**
- Resumen: ventas, pedidos pendientes, más vendidos y tallas por agotarse.
- Productos: crear/editar/eliminar, subir foto, existencias por talla, ocultar/mostrar, destacar.
- Pedidos: filtrar por estado, ver detalle, cambiar estado y escribir al cliente por WhatsApp.
  Cancelar un pedido devuelve las prendas al inventario.
- Ajustes: WhatsApp, costo de envío, monto para envío gratis, datos bancarios, direcciones, etc.

Los productos sin foto se muestran con una ilustración del jean en el color de lavado elegido.

## Producción

```bash
npm run build
npm start        # Express sirve el API y la carpeta dist/ en el mismo puerto
```

Datos en `server/data/tienda.db` y fotos en `server/uploads/` — respáldalos.

`npm start` corre con `NODE_ENV=production` y **no arranca** si en `.env` falta `ADMIN_PASSWORD`
(mín. 12 caracteres y distinta a `tutis2026`, que es la clave pública de la demo) o `SESSION_SECRET` (mín. 32 caracteres).
Detrás de nginx u otro proxy, agrega `TRUST_PROXY=1` para que el freno del login use la IP real de cada visitante (actívalo solo si la app no es accesible directamente sin pasar por el proxy). Para más protección, limita `/admin` por IP en nginx.
Genera un secreto con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Seguridad incluida: login con freno progresivo por cliente (IPv6 agrupada por /64) y freno global: con 20+ fallos en 15 min, un intento a la vez en todo el servidor con 8 s de espera (la clave correcta sigue entrando), pedidos consultables solo
con su enlace privado (token de 192 bits), fotos guardadas con extensión según su tipo real y servidas con
`nosniff`, y validación de rutas de imagen para evitar borrar archivos fuera de `server/uploads/`.

## Pendiente de confirmar con la tienda
- Datos bancarios reales para transferencias (ahora hay un texto de ejemplo).
- Qué foto corresponde a cada sucursal (asignadas a criterio desde la presentación de la marca).
- Precios y existencias (inventados), y la marca de los modelos con pedrería y Ref. 1951 (se puso Fazined).
- Costo de envío (Q35) y monto para envío gratis (Q600) — se editan en Ajustes.

## Contenido de marca
Logo, paleta (rosa #d74279, rosa claro, gris, negro), historia, sucursales, reseñas y revendedores salen de la
presentación "Invierte en Moda Colombiana en Guatemala". Los textos están en `src/content.js` y las imágenes en `public/marca/`.
La propuesta de inversión de esa presentación **no** se publicó en la tienda.

## Demo en GitHub Pages
Cada push a `main` publica una **demo estática** (sin servidor) con el workflow `.github/workflows/pages.yml`:
`npm run build:demo` compila con `VITE_DEMO=1`, y `src/demo.js` reemplaza al API guardando productos,
pedidos y ajustes en el `localStorage` de cada visitante. Admin de la demo: contraseña `tutis2026`
(Ajustes → "Restablecer demo" vuelve al estado inicial). Para probarla localmente:

```bash
npm run build:demo && npm run preview:demo   # http://localhost:5181/tutis-moda/
```
