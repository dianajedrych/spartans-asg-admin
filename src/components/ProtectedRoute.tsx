import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isStaff, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Wczytywanie...
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!isStaff) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, padding: 24, textAlign: 'center' }}>
        <h1 className="heading" style={{ fontSize: 22 }}>Brak dostępu</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 380 }}>
          To konto nie ma uprawnień administratora. Jeśli to pomyłka, poproś administratora o nadanie dostępu.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
