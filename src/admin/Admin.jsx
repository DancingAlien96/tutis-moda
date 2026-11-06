import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, IS_DEMO, storage } from '../lib.js';
import { Hearts } from '../components/Logo.jsx';
import { LuArrowLeft, LuExternalLink, LuLayoutDashboard, LuLogOut, LuMenu, LuReceipt, LuSettings, LuShirt, LuX } from 'react-icons/lu';
import Tablero from './Tablero.jsx';
import Products from './Products.jsx';
import Orders from './Orders.jsx';
import Settings from './Settings.jsx';

const AdminCtx = createContext(null);
export const useAdmin = () => useContext(AdminCtx);

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { token } = await api('/admin/login', { method: 'POST', body: { password } });
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-login">
      <form className="panel" onSubmit={submit}>
        <Hearts size={26} />
        <h1>Panel de administración</h1>
        <p className="muted small">Tuti's Moda Colombiana</p>
        <label>Contraseña<input type="password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {IS_DEMO && <p className="demo-hint small">Versión demo · contraseña: <b>tutis2026</b></p>}
        {error && <p className="alert">{error}</p>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <Link to="/" className="small center with-icon"><LuArrowLeft /> Volver a la tienda</Link>
      </form>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => storage.get('tutis-admin', null));
  const logout = useCallback(() => { storage.set('tutis-admin', null); setToken(null); }, []);
  const login = (t) => { storage.set('tutis-admin', t); setToken(t); };

  // Llamadas autenticadas: si la sesión expira, regresa al login.
  const call = useCallback(async (path, opts = {}) => {
    try {
      return await api(`/admin${path}`, { ...opts, token });
    } catch (e) {
      if (e.status === 401) logout();
      throw e;
    }
  }, [token, logout]);

  if (!token) return <Login onLogin={login} />;

  return (
    <AdminCtx.Provider value={{ call, logout }}>
      <AdminShell call={call} logout={logout} />
    </AdminCtx.Provider>
  );
}

const SECTIONS = [
  { to: '/admin', end: true, icon: LuLayoutDashboard, label: 'Tablero' },
  { to: '/admin/pedidos', icon: LuReceipt, label: 'Pedidos', badge: 'pending' },
  { to: '/admin/productos', icon: LuShirt, label: 'Productos' },
  { to: '/admin/ajustes', icon: LuSettings, label: 'Ajustes' },
];

function AdminShell({ call, logout }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);

  // Cierra el menú del celular al navegar y refresca el contador de pedidos por confirmar.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { call('/stats').then((s) => setPending(s.pending)).catch(() => {}); }, [call, pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const current = SECTIONS.find((s) => (s.end ? pathname.replace(/\/$/, '').endsWith('/admin') : pathname.includes(s.to))) || SECTIONS[0];

  return (
    <div className={`admin ${open ? 'menu-open' : ''}`}>
      <header className="admin-topbar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}><LuMenu size={22} /></button>
        <span className="topbar-title">{current.label}</span>
        <Hearts size={14} />
      </header>
      <div className="admin-scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className="admin-side" aria-label="Menú del administrador">
        <div className="admin-brand">
          <Hearts size={18} />
          <span><b>TUTI'S</b><small>Panel de administración</small></span>
          <button className="icon-btn side-close" onClick={() => setOpen(false)} aria-label="Cerrar menú"><LuX size={20} /></button>
        </div>
        <nav>
          <span className="side-group">Negocio</span>
          {SECTIONS.map(({ to, end, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon /> <span className="grow">{label}</span>
              {badge === 'pending' && pending > 0 && <span className="side-badge" title={`${pending} por confirmar`}>{pending}</span>}
            </NavLink>
          ))}
          <span className="side-group">Tienda</span>
          <Link to="/" target="_blank"><LuExternalLink /> <span className="grow">Ver tienda</span></Link>
        </nav>
        <div className="admin-side-foot">
          <div className="side-user">
            <span className="avatar">TM</span>
            <span><b>Tuti's Moda</b><br /><small>{IS_DEMO ? 'Modo demo' : 'Administradora'}</small></span>
          </div>
          <button className="side-logout" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><LuLogOut /></button>
        </div>
      </aside>

      <section className="admin-main">
        <Routes>
          <Route index element={<Tablero />} />
          <Route path="productos" element={<Products />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="ajustes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </section>
    </div>
  );
}
