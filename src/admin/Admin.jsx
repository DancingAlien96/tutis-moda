import { createContext, useCallback, useContext, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api, IS_DEMO, storage } from '../lib.js';
import { Hearts } from '../components/Logo.jsx';
import { LuArrowLeft, LuChartColumn, LuExternalLink, LuLayoutDashboard, LuLogOut, LuReceipt, LuSettings, LuShirt } from 'react-icons/lu';
import Dashboard from './Dashboard.jsx';
import Stats from './Stats.jsx';
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
      <div className="admin">
        <aside className="admin-side">
          <div className="admin-brand"><Hearts size={16} /> <b>Tuti's</b> <span className="muted small">admin</span></div>
          <nav>
            <NavLink end to="/admin"><LuLayoutDashboard /> Resumen</NavLink>
            <NavLink to="/admin/estadisticas"><LuChartColumn /> Estadísticas</NavLink>
            <NavLink to="/admin/productos"><LuShirt /> Productos</NavLink>
            <NavLink to="/admin/pedidos"><LuReceipt /> Pedidos</NavLink>
            <NavLink to="/admin/ajustes"><LuSettings /> Ajustes</NavLink>
          </nav>
          <div className="admin-side-foot">
            <Link to="/" target="_blank" className="with-icon"><LuExternalLink /> Ver tienda</Link>
            <button className="link-btn with-icon" onClick={logout}><LuLogOut /> Cerrar sesión</button>
          </div>
        </aside>
        <section className="admin-main">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="estadisticas" element={<Stats />} />
            <Route path="productos" element={<Products />} />
            <Route path="pedidos" element={<Orders />} />
            <Route path="ajustes" element={<Settings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </section>
      </div>
    </AdminCtx.Provider>
  );
}
