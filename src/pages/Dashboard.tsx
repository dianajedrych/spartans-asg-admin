import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Stats {
  productCount: number;
  activeProductCount: number;
  lowStockCount: number;
  orderCount: number;
  newOrderCount: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [productsRes, activeRes, ordersRes, newOrdersRes, productStockRes] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new'),
          supabase.from('products').select('id, product_variants ( inventory ( quantity_on_hand, low_stock_threshold ) )'),
        ]);
        // Stan liczony NA PRODUKT (suma wszystkich wariantów), nie na wiersz
        // magazynowy — produkt z kilkoma wariantami, gdzie tylko jeden ma
        // realny towar, nie powinien fałszywie liczyć się jako "niski stan"
        // przez pusty jeszcze drugi wariant.
        type Row = { id: string; product_variants: { inventory: { quantity_on_hand: number; low_stock_threshold: number } | null }[] };
        const rows = (productStockRes.data || []) as unknown as Row[];
        const lowStock = rows.filter((p) => {
          const variants = p.product_variants || [];
          const total = variants.reduce((sum, v) => sum + (v.inventory?.quantity_on_hand ?? 0), 0);
          const threshold = variants[0]?.inventory?.low_stock_threshold ?? 3;
          return total > 0 && total <= threshold;
        }).length;
        setStats({
          productCount: productsRes.count || 0,
          activeProductCount: activeRes.count || 0,
          lowStockCount: lowStock,
          orderCount: ordersRes.count || 0,
          newOrderCount: newOrdersRes.count || 0,
        });
      } catch {
        setError(true);
      }
    })();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 className="heading" style={{ fontSize: 26 }}>Witaj! 👋</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Oto skrót tego, co dzieje się w sklepie.</p>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>Nie udało się wczytać statystyk. Odśwież stronę.</p>}

      {!error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <StatCard label="Nowe zamówienia" value={stats?.newOrderCount} icon="🛒" />
          <StatCard label="Wszystkie zamówienia" value={stats?.orderCount} icon="⛁" />
          <StatCard label="Aktywne produkty" value={stats?.activeProductCount} icon="▤" />
          <StatCard label="Wszystkie produkty" value={stats?.productCount} icon="◈" />
        </div>
      )}

      {stats && stats.lowStockCount > 0 && (
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'var(--warning-soft)', borderColor: 'transparent' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--warning)' }}>⚠️ Wymaga uwagi</div>
            <div style={{ color: 'var(--text)', marginTop: 4 }}>
              {stats.lowStockCount} {stats.lowStockCount === 1 ? 'produkt ma' : 'produkty/produktów mają'} niski stan magazynowy.
            </div>
          </div>
          <Link to="/products?filter=low-stock" className="btn btn-primary" style={{ background: 'var(--warning)' }}>ZOBACZ</Link>
        </div>
      )}

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="heading" style={{ fontSize: 16 }}>SZYBKIE AKCJE</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/products/new" className="btn btn-primary">+ DODAJ PRODUKT</Link>
          <Link to="/products" className="btn btn-secondary">Zobacz produkty</Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | undefined; icon: string }) {
  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 20 }} aria-hidden="true">{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>{value ?? '—'}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</div>
    </div>
  );
}
