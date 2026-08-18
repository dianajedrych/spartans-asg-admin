export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
}

export interface Brand {
  id: string;
  name: string;
}

export interface ProductListRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_featured: boolean;
  brands: { name: string } | null;
  categories: { name: string } | null;
  product_variants: { id: string; inventory: { quantity_on_hand: number; low_stock_threshold: number } | null }[];
}

export type OrderStatus =
  | 'new' | 'processing' | 'packed' | 'shipped' | 'delivered'
  | 'cancelled' | 'returned' | 'refunded';

export interface BuyerSnapshot {
  imie?: string;
  nazwisko?: string;
  telefon?: string;
  email?: string;
}

export interface OrderListRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  currency: string;
  delivery_method: string | null;
  buyer_snapshot: BuyerSnapshot;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
}

export interface OrderStatusHistoryRow {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface OrderDetailData {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  total: number;
  currency: string;
  payment_method: string | null;
  delivery_method: string | null;
  buyer_snapshot: BuyerSnapshot;
  shipping_address_snapshot: Record<string, unknown> | null;
  invoice_details_snapshot: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  order_items: OrderItemRow[];
  order_status_history: OrderStatusHistoryRow[];
  // PostgREST zwraca to jako pojedynczy obiekt, nie tablicę — order_id w
  // shipments ma unique constraint (jedna przesyłka na zamówienie), więc
  // relacja jest wykrywana jako "do jednego", nie "do wielu".
  shipments: { tracking_number: string | null; carrier: string | null } | null;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: '🟢 Nowe',
  processing: '🟡 W realizacji',
  packed: '📦 Spakowane',
  shipped: '🚚 Wysłane',
  delivered: '✅ Dostarczone',
  cancelled: '❌ Anulowane',
  returned: '↩️ Zwrócone',
  refunded: '💰 Zwrot pieniędzy',
};

// ETAP 11 — wydarzenia. Zapisy zawsze idą przez zewnętrzny link (Google
// Forms, pole external_form_url) — nie ma tu własnego formularza/listy
// zapisanych, więc nie ma odpowiednika event_registrations w tym pliku.
export type EventStatus = 'draft' | 'published' | 'closed' | 'cancelled';

export interface EventListRow {
  id: string;
  slug: string;
  name: string;
  event_date: string | null;
  status: EventStatus;
  capacity: number | null;
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: '📝 Szkic (niewidoczne dla klientów)',
  published: '🟢 Opublikowane',
  closed: '⚪ Zakończone (w archiwum)',
  cancelled: '❌ Odwołane',
};
