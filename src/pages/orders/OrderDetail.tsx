import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { OrderDetailData, OrderStatus } from '../../lib/types';
import { STATUS_LABELS } from '../../lib/types';

const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus; needsTracking?: boolean }>> = {
  new: { label: 'PRZEKAŻ DO REALIZACJI', next: 'processing' },
  processing: { label: 'OZNACZ JAKO SPAKOWANE', next: 'packed' },
  packed: { label: 'OZNACZ JAKO WYSŁANE', next: 'shipped', needsTracking: true },
  shipped: { label: 'OZNACZ JAKO DOSTARCZONE', next: 'delivered' },
};
const CANCELLABLE: OrderStatus[] = ['new', 'processing'];

const FIELD_LABELS: Record<string, string> = {
  imie: 'Imię', nazwisko: 'Nazwisko', telefon: 'Telefon', email: 'E-mail',
  adres: 'Adres', kod: 'Kod pocztowy', miasto: 'Miasto', paczkomat: 'Paczkomat',
  nazwaFirmy: 'Nazwa firmy', nip: 'NIP',
};

function AddressBlock({ data, title }: { data: Record<string, unknown> | null; title: string }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14 }}>
        {Object.entries(data).map(([k, v]) => v ? (
          <div key={k}>
            <span style={{ color: 'var(--text-muted)' }}>{FIELD_LABELS[k] || k}: </span>
            <span>{String(v)}</span>
          </div>
        ) : null)}
      </div>
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [error, setError] = useState(false);
  const [tracking, setTracking] = useState('');
  const [updating, setUpdating] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function load() {
    if (!id) return;
    const { data, error: err } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, subtotal, shipping_cost, total, currency,
        payment_method, delivery_method, buyer_snapshot, shipping_address_snapshot,
        invoice_details_snapshot, notes, created_at,
        order_items ( id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total ),
        order_status_history ( id, from_status, to_status, note, created_at ),
        shipments ( tracking_number, carrier )
      `)
      .eq('id', id)
      .single();
    if (err) { setError(true); return; }
    setOrder(data as unknown as OrderDetailData);
  }

  useEffect(() => { load(); }, [id]);

  async function changeStatus(next: OrderStatus, withTracking?: boolean) {
    if (!id) return;
    setUpdating(true);
    const { error: err } = await supabase.rpc('admin_update_order_status', {
      p_order_id: id,
      p_new_status: next,
      p_note: null,
      p_tracking_number: withTracking && tracking.trim() ? tracking.trim() : null,
    });
    setUpdating(false);
    if (err) {
      alert('Nie udało się zmienić statusu zamówienia. Spróbuj ponownie.');
      return;
    }
    setConfirmCancel(false);
    load();
  }

  if (error) return <p style={{ color: 'var(--danger)' }}>Nie udało się wczytać zamówienia.</p>;
  if (!order) return <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>;

  const buyer = order.buyer_snapshot || {};
  const action = NEXT_ACTION[order.status];
  const canCancel = CANCELLABLE.includes(order.status);
  const currentTracking = order.shipments?.tracking_number;
  const history = [...(order.order_status_history || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760 }}>
      <div>
        <Link to="/orders" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Wróć do zamówień</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          <h1 className="heading" style={{ fontSize: 24 }}>Zamówienie {order.order_number}</h1>
          <span className="badge badge-neutral">{STATUS_LABELS[order.status]}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {new Date(order.created_at).toLocaleString('pl-PL')}
        </div>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="heading" style={{ fontSize: 15 }}>KLIENT</h2>
        <div style={{ fontSize: 14 }}>{[buyer.imie, buyer.nazwisko].filter(Boolean).join(' ') || '—'}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{buyer.telefon} · {buyer.email}</div>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="heading" style={{ fontSize: 15 }}>PRODUKTY</h2>
        {(order.order_items || []).map((it) => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
            <div>
              <div>{it.product_name_snapshot}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{it.sku_snapshot} · {it.quantity} × {it.unit_price_snapshot} {order.currency}</div>
            </div>
            <div style={{ fontWeight: 600 }}>{it.line_total} {order.currency}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Dostawa</span><span>{order.shipping_cost} {order.currency}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 16 }}>
            <span>SUMA</span><span>{order.total} {order.currency}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="heading" style={{ fontSize: 15 }}>DOSTAWA I PŁATNOŚĆ</h2>
        <div style={{ fontSize: 14 }}>Metoda dostawy: {order.delivery_method || '—'}</div>
        <div style={{ fontSize: 14 }}>Płatność: {order.payment_method || '—'}</div>
        <AddressBlock data={order.shipping_address_snapshot} title="ADRES DOSTAWY" />
        <AddressBlock data={order.invoice_details_snapshot} title="DANE DO FAKTURY" />
        {currentTracking && <div style={{ fontSize: 14 }}>Numer przesyłki: <strong>{currentTracking}</strong></div>}
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="heading" style={{ fontSize: 15 }}>HISTORIA STATUSÓW</h2>
        {history.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Brak historii.</p>}
        {history.map((h) => (
          <div key={h.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <span style={{ fontSize: 13 }}>{STATUS_LABELS[h.to_status]}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleString('pl-PL')}</span>
          </div>
        ))}
      </div>

      {(action || canCancel) && (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="heading" style={{ fontSize: 15 }}>ZMIEŃ STATUS</h2>
          {action?.needsTracking && (
            <div className="field">
              <label htmlFor="tracking">Numer przesyłki (opcjonalnie)</label>
              <input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="np. 1Z999AA10123456784" />
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {action && (
              <button className="btn btn-primary" disabled={updating} onClick={() => changeStatus(action.next, action.needsTracking)}>
                {updating ? 'ZAPISYWANIE...' : action.label}
              </button>
            )}
            {canCancel && !confirmCancel && (
              <button className="btn btn-danger" disabled={updating} onClick={() => setConfirmCancel(true)}>ANULUJ ZAMÓWIENIE</button>
            )}
            {confirmCancel && (
              <>
                <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Na pewno anulować to zamówienie?</span>
                <button className="btn btn-ghost" onClick={() => setConfirmCancel(false)}>Nie</button>
                <button className="btn btn-danger" disabled={updating} onClick={() => changeStatus('cancelled')}>Tak, anuluj</button>
              </>
            )}
          </div>
        </div>
      )}

      {!action && !canCancel && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>To zamówienie jest zamknięte — brak dalszych akcji.</p>
      )}
    </div>
  );
}
