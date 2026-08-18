import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { EventListRow, EventStatus } from '../../lib/types';
import { EVENT_STATUS_LABELS } from '../../lib/types';

type FilterKey = 'all' | EventStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'published', label: 'Opublikowane' },
  { key: 'draft', label: 'Szkice' },
  { key: 'closed', label: 'Zakończone' },
  { key: 'cancelled', label: 'Odwołane' },
];

export function EventsList() {
  const [events, setEvents] = useState<EventListRow[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get('filter') as FilterKey) || 'all';
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    setError(false);
    const { data, error: err } = await supabase
      .from('events')
      .select('id, slug, name, event_date, status, capacity')
      .order('event_date', { ascending: true, nullsFirst: true });
    if (err) { setError(true); return; }
    setEvents((data as EventListRow[]) || []);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!events) return [];
    let list = events;
    if (filter !== 'all') list = list.filter((e) => e.status === filter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
    return list;
  }, [events, filter, search]);

  async function deleteEvent(id: string) {
    const { error: err } = await supabase.from('events').delete().eq('id', id);
    if (err) { alert('Nie udało się usunąć wydarzenia. Spróbuj ponownie.'); return; }
    setConfirmDeleteId(null);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="heading" style={{ fontSize: 26 }}>Wydarzenia</h1>
        <Link to="/events/new" className="btn btn-primary">+ DODAJ WYDARZENIE</Link>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Szukaj wydarzenia..."
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

      {error && <p style={{ color: 'var(--danger)' }}>Nie udało się wczytać wydarzeń. Odśwież stronę.</p>}
      {!error && events === null && <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>}

      {events !== null && filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {events.length === 0 ? 'Nie masz jeszcze żadnych wydarzeń.' : 'Brak wydarzeń spełniających kryteria.'}
          </p>
          {events.length === 0 && <Link to="/events/new" className="btn btn-primary">+ DODAJ PIERWSZE WYDARZENIE</Link>}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="scrollx">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 640 }}>
            {filtered.map((e) => (
              <div key={e.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--surface-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-muted)' }} aria-hidden="true">
                  ◈
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {e.event_date ? new Date(e.event_date).toLocaleDateString('pl-PL') : 'Termin nieustalony'}
                  </div>
                </div>
                {e.capacity != null && (
                  <div style={{ minWidth: 90, textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
                    limit {e.capacity}
                  </div>
                )}
                <span className="badge badge-neutral" style={{ minWidth: 220, justifyContent: 'center' }}>
                  {EVENT_STATUS_LABELS[e.status]}
                </span>
                <Link to={`/events/${e.id}`} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>EDYTUJ</Link>
                {confirmDeleteId === e.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ padding: '8px 10px', fontSize: 13 }} onClick={() => setConfirmDeleteId(null)}>Anuluj</button>
                    <button className="btn btn-danger" style={{ padding: '8px 10px', fontSize: 13 }} onClick={() => deleteEvent(e.id)}>Tak, usuń</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost" style={{ padding: '8px 10px', fontSize: 13 }} onClick={() => setConfirmDeleteId(e.id)}>Usuń</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
