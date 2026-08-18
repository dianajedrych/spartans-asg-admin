import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ReviewListRow, ReviewStatus } from '../../lib/types';
import { REVIEW_STATUS_LABELS } from '../../lib/types';

type FilterKey = 'all' | ReviewStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'Oczekujące' },
  { key: 'all', label: 'Wszystkie' },
  { key: 'published', label: 'Opublikowane' },
  { key: 'hidden', label: 'Ukryte' },
];

function Stars({ rating }: { rating: number }) {
  return <span style={{ color: 'var(--accent)', letterSpacing: 1 }}>{'★'.repeat(rating) + '☆'.repeat(5 - rating)}</span>;
}

export function ReviewsList() {
  const [reviews, setReviews] = useState<ReviewListRow[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmHideId, setConfirmHideId] = useState<string | null>(null);

  async function load() {
    setError(false);
    const { data, error: err } = await supabase
      .from('reviews')
      .select('id, rating, title, body, author_name, is_verified_purchase, status, created_at, products ( name )')
      .order('created_at', { ascending: false });
    if (err) { setError(true); return; }
    setReviews((data as unknown as ReviewListRow[]) || []);
  }

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reviews?.length || 0 };
    (reviews || []).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [reviews]);

  const filtered = useMemo(() => {
    if (!reviews) return [];
    return filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);
  }, [reviews, filter]);

  async function setStatus(id: string, status: ReviewStatus) {
    setBusyId(id);
    const { error: err } = await supabase.from('reviews').update({ status }).eq('id', id);
    setBusyId(null);
    if (err) { alert('Nie udało się zapisać zmiany. Spróbuj ponownie.'); return; }
    setConfirmHideId(null);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="heading" style={{ fontSize: 26 }}>Opinie</h1>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="btn"
            style={{
              padding: '8px 14px',
              fontSize: 13,
              background: filter === f.key ? 'var(--accent-soft)' : 'transparent',
              color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
              border: '1px solid ' + (filter === f.key ? 'var(--accent)' : 'var(--border)'),
            }}
          >
            {f.label}{counts[f.key] ? ' — ' + counts[f.key] : ''}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>Nie udało się wczytać opinii. Odśwież stronę.</p>}
      {!error && reviews === null && <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>}

      {reviews !== null && filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {filter === 'pending' ? 'Brak opinii oczekujących na moderację.' : 'Brak opinii spełniających kryteria.'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((r) => (
            <div key={r.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.products?.name || 'Produkt usunięty'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {r.author_name || 'Klient'}{r.is_verified_purchase ? ' · ✓ zweryfikowany zakup' : ''} · {new Date(r.created_at).toLocaleString('pl-PL')}
                  </div>
                </div>
                <span className="badge badge-neutral">{REVIEW_STATUS_LABELS[r.status]}</span>
              </div>
              <Stars rating={r.rating} />
              {r.title && <div style={{ fontWeight: 500 }}>{r.title}</div>}
              {r.body && <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{r.body}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {r.status !== 'published' && (
                  <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} disabled={busyId === r.id} onClick={() => setStatus(r.id, 'published')}>
                    OPUBLIKUJ
                  </button>
                )}
                {r.status !== 'hidden' && confirmHideId !== r.id && (
                  <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }} disabled={busyId === r.id} onClick={() => setConfirmHideId(r.id)}>
                    UKRYJ
                  </button>
                )}
                {confirmHideId === r.id && (
                  <>
                    <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Ukryć tę opinię?</span>
                    <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => setConfirmHideId(null)}>Nie</button>
                    <button className="btn btn-danger" style={{ padding: '8px 12px', fontSize: 13 }} disabled={busyId === r.id} onClick={() => setStatus(r.id, 'hidden')}>Tak, ukryj</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
