import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Login() {
  const { session, isStaff, loading, login, authError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!loading && session && isStaff) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || !password.trim()) {
      setFormError('Podaj e-mail i hasło.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch {
      // authError z useAuth() jest już pokazywany niżej
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 360, padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h1 className="heading" style={{ fontSize: 22 }}>SPARTANS ASG</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Panel administracyjny</p>
        </div>

        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@spartansasg.pl" autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="password">Hasło</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>

        {formError && <span className="field error">{formError}</span>}
        {authError && <span className="field error">{authError}</span>}

        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 4 }}>
          {submitting ? 'Logowanie...' : 'Zaloguj się'}
        </button>
      </form>
    </div>
  );
}
