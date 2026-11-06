import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store.jsx';
import ShopLayout from './components/ShopLayout.jsx';
import Home from './pages/Home.jsx';
import Product from './pages/Product.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderDone from './pages/OrderDone.jsx';
import Admin from './admin/Admin.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <StoreProvider>
        <Routes>
          <Route element={<ShopLayout />}>
            <Route index element={<Home />} />
            <Route path="producto/:id" element={<Product />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="pedido/:code" element={<OrderDone />} />
            <Route path="*" element={<Home />} />
          </Route>
          <Route path="admin/*" element={<Admin />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
