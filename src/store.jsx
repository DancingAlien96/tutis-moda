import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, storage } from './lib.js';

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [meta, setMeta] = useState({ sizes: [], styles: [], brands: [], settings: {} });
  const [cart, setCart] = useState(() => storage.get('tutis-cart', []));
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const loadMeta = useCallback(() => api('/meta').then(setMeta).catch(() => {}), []);
  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => storage.set('tutis-cart', cart), [cart]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const addToCart = useCallback((product, size, qty = 1) => {
    const max = Number(product.stock?.[size] || 0);
    let capped = false;
    setCart((c) => {
      const key = `${product.id}-${size}`;
      const found = c.find((i) => i.key === key);
      const nextQty = Math.min(max, (found?.qty || 0) + qty);
      capped = nextQty < (found?.qty || 0) + qty;
      const item = {
        key, productId: product.id, size, qty: nextQty, max,
        name: product.name, brand: product.brand, price: product.price, wash: product.wash, image: product.image, style: product.style,
      };
      return found ? c.map((i) => (i.key === key ? item : i)) : [...c, item];
    });
    setToast(capped ? `Solo hay ${max} disponibles en talla ${size}` : `Agregaste ${product.name} · talla ${size}`);
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((key, qty) => {
    setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(i.max || 20, qty)) } : i)));
  }, []);
  const removeItem = useCallback((key) => setCart((c) => c.filter((i) => i.key !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const totals = useMemo(() => {
    const s = meta.settings;
    const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
    const count = cart.reduce((a, i) => a + i.qty, 0);
    const freeFrom = Number(s.free_shipping_from || 0);
    const shippingCost = Number(s.shipping_cost || 0);
    return { subtotal, count, freeFrom, shippingCost, shipping: subtotal >= freeFrom ? 0 : shippingCost };
  }, [cart, meta.settings]);

  const value = { meta, loadMeta, cart, cartOpen, setCartOpen, addToCart, updateQty, removeItem, clearCart, totals, toast, setToast };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
