import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { ProductListRow } from '../../lib/types';

type FilterKey = 'all' | 'active' | 'hidden' | 'out-of-stock' | 'low-stock';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'active', label: 'Aktywne' },
  { key: 'hidden', label: 'Ukryte' },
  { key: 'low-stock', label: 'Niski stan' },
  { key: 'out-of-stock', label: 'Brak magazynu' },
];

export function ProductsList() {
  const [products, setProducts] = useState<ProductListRow[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get('filter') as FilterKey) || 'all';
  const [confirmHideId, setConfirmHideId] = useState<string | null>(null);

  async function load() {
    setError(false);
    const { data, error: err } = await supabase
      .from('products')
      .select(`
        id, name, slug, sku, base_price, sale_price, is_active, is_bestseller, is_new, is_featured,
        brands ( name ),
        categories ( name ),
        product_variants ( id, inventory ( quantity_on_hand, low_stock_threshold ) )
      `)
      .order('created_at', { ascending: false });
    if (err) { setError(true); return; }
    setProducts((data as unknown as ProductListRow[]) || []);
  }

  useEffect(() => { load(); }, []);

  function stockOf(p: ProductListRow) {
    return p.product_variants.reduce((sum, v) => sum + (v.inventory?.quantity_on_hand ?? 0), 0);
  }
  function lowStockThreshold(p: ProductListRow) {
    return p.product_variants[0]?.inventory?.low_stock_threshold ?? 3;
  }

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products;
    if (filter === 'active') list = list.filter((p) => p.is_active);
    if (filter === 'hidden') list = list.filter((p) => !p.is_active);
    if (filter === 'out-of-stock') list = list.filter((p) => stockOf(p) === 0);
    if (filter === 'low-stock') list = list.filter((p) => stockOf(p) > 0 && stockOf(p) <= lowStockThreshold(p));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.brands?.name || '').toLowerCase().includes(q));
    return list;
  }, [products, filter, search]);

  async function toggleActive(p: ProductListRow) {
    const { error: err } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    if (err) { alert('Nie udało się zapisać zmiany. Spróbuj ponownie.'); return; }
    setConfirmHideId(null);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="heading" style={{ fontSize: 26 }}>Produkty</h1>
        <Link to="/products/new" className="btn btn-primary">+ DODAJ PRODUKT</Link>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Szukaj produktu..."
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', minWidth: 240 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setSearchParams(f.key === 'all' ? {} : { filter: f.key })}
              className="btn"
              style={{
                padding: '8px 14px',
                fontSize: 13,
                background: filter === f.key ? 'var(--accent-soft)' : 'transparent',
                color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
                border: '1px solid ' + (filter === f.key ? 'var(--accent)' : 'var(--border)'),
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>Nie udało się wczytać produktów. Odśwież stronę.</p>}
      {!error && products === null && <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>}

      {products !== null && filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {products.length === 0 ? 'Nie masz jeszcze żadnych produktów.' : 'Brak produktów spełniających kryteria.'}
          </p>
          {products.length === 0 && <Link to="/products/new" className="btn btn-primary">+ DODAJ PIERWSZY PRODUKT</Link>}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="scrollx">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 640 }}>
            {filtered.map((p) => {
              const stock = stockOf(p);
              const threshold = lowStockThreshold(p);
              return (
                <div key={p.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--surface-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-muted)' }} aria-hidden="true">
                    ▤
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.brands?.name || '—'} · {p.categories?.name || '—'} · {p.sku || 'brak SKU'}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                    {p.sale_price ?? p.base_price} zł
                  </div>
                  <div style={{ minWidth: 70, textAlign: 'right', color: stock === 0 ? 'var(--danger)' : stock <= threshold ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {stock} szt.
                  </div>
                  <span className={'badge ' + (p.is_active ? 'badge-success' : 'badge-neutral')}>
                    {p.is_active ? '🟢 Aktywny' : '⚪ Ukryty'}
                  </span>
                  <Link to={`/products/${p.id}`} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>EDYTUJ</Link>
                  {confirmHideId === p.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: '8px 10px', fontSize: 13 }} onClick={() => setConfirmHideId(null)}>Anuluj</button>
                      <button className="btn btn-danger" style={{ padding: '8px 10px', fontSize: 13 }} onClick={() => toggleActive(p)}>
                        {p.is_active ? 'Tak, ukryj' : 'Tak, pokaż'}
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost" style={{ padding: '8px 10px', fontSize: 13 }} onClick={() => setConfirmHideId(p.id)}>
                      {p.is_active ? 'Ukryj' : 'Pokaż'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
