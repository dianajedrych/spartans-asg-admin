import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV_ITEMS = [
  { to: '/', label: 'Pulpit', icon: '⌂', end: true },
  { to: '/products', label: 'Produkty', icon: '▤' },
  { to: '/orders', label: 'Zamówienia', icon: '⛁' },
  { to: '/customers', label: 'Klienci', icon: '☺' },
  { to: '/events', label: 'Wydarzenia', icon: '◈' },
  { to: '/reviews', label: 'Opinie', icon: '★' },
  { to: '/gallery', label: 'Galeria', icon: '▦' },
  { to: '/settings', label: 'Ustawienia', icon: '⚙' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { logout, session } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 14px',
          gap: 4,
        }}
      >
        <div style={{ padding: '4px 10px 24px' }}>
          <div className="heading" style={{ fontSize: 17, fontWeight: 700 }}>SPARTANS ASG</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Panel administracyjny</div>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--accent)' : 'var(--text)',
              background: isActive ? 'var(--accent-soft)' : 'transparent',
              textDecoration: 'none',
            })}
          >
            <span aria-hidden="true" style={{ width: 18, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 10px 10px', wordBreak: 'break-all' }}>
            {session?.user.email}
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleLogout}>
            Wyloguj się
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1200 }}>{children}</main>
    </div>
  );
}
