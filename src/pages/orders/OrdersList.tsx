import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { OrderListRow, OrderStatus } from '../../lib/types';
import { STATUS_LABELS } from '../../lib/types';

const TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'new', label: STATUS_LABELS.new },
  { key: 'processing', label: STATUS_LABELS.processing },
  { key: 'packed', label: STATUS_LABELS.packed },
  { key: 'shipped', label: STATUS_LABELS.shipped },
  { key: 'delivered', label: STATUS_LABELS.delivered },
  { key: 'cancelled', label: STATUS_LABELS.cancelled },
];

export function OrdersList() {
  const [orders, setOrders] = useState<OrderListRow[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('status') as OrderStatus | 'all') || 'all';

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('orders')
        .select('id, order_number, status, total, currency, delivery_method, buyer_snapshot, created_at')
        .order('created_at', { ascending: false });
      if (err) { setError(true); return; }
      setOrders((data as unknown as OrderListRow[]) || []);
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders?.length || 0 };
    (orders || []).forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    let list = orders;
    if (tab !== 'all') list = list.filter((o) => o.status === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const b = o.buyer_snapshot || {};
        return (
          o.order_number.toLowerCase().includes(q) ||
          (b.email || '').toLowerCase().includes(q) ||
          (b.nazwisko || '').toLowerCase().includes(q) ||
          (b.imie || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [orders, tab, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="heading" style={{ fontSize: 26 }}>Zamówienia</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Szukaj po numerze zamówienia, imieniu, nazwisku lub e-mailu..."
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', maxWidth: 420 }}
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearchParams(t.key === 'all' ? {} : { status: t.key })}
            className="btn"
            style={{
              padding: '8px 14px',
              fontSize: 13,
              background: tab === t.key ? 'var(--accent-soft)' : 'transparent',
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              border: '1px solid ' + (tab === t.key ? 'var(--accent)' : 'var(--border)'),
            }}
          >
            {t.label}{counts[t.key] ? ' — ' + counts[t.key] : ''}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>Nie udało się wczytać zamówień. Odśwież stronę.</p>}
      {!error && orders === null && <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>}

      {orders !== null && filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {orders.length === 0 ? 'Brak zamówień.' : 'Brak zamówień spełniających kryteria.'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="scrollx">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 640 }}>
            {filtered.map((o) => {
              const buyer = o.buyer_snapshot || {};
              const buyerName = [buyer.imie, buyer.nazwisko].filter(Boolean).join(' ') || '—';
              return (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="card"
                  style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{o.order_number}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {buyerName} · {new Date(o.created_at).toLocaleString('pl-PL')}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 100 }}>{o.delivery_method || '—'}</div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                    {o.total} {o.currency}
                  </div>
                  <span className="badge badge-neutral" style={{ minWidth: 130, justifyContent: 'center' }}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
