import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { EventStatus } from '../../lib/types';
import { EVENT_STATUS_LABELS } from '../../lib/types';

const STATUS_OPTIONS: EventStatus[] = ['draft', 'published', 'closed', 'cancelled'];

interface ContentTab { label: string; body: string; }

export function EventWizard() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [externalFormUrl, setExternalFormUrl] = useState('');
  const [coverImage, setCoverImage] = useState<{ file: File; preview: string } | null>(null);
  const [existingCoverPath, setExistingCoverPath] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  // Zakładki (np. "Cennik", "Co w cenie", "Mapa", "Wymogi bezpieczeństwa") —
  // zapisywane w events.content.tabs. Reszta ewentualnej starszej zawartości
  // tej kolumny (np. "desc" z danych migrowanych) jest zachowywana bez zmian.
  const [contentTabs, setContentTabs] = useState<ContentTab[]>([]);
  const [rawContent, setRawContent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('name, short_description, event_date, event_time, location, capacity, status, external_form_url, cover_image_storage_path, content')
        .eq('id', id)
        .single();
      if (error || !data) { setSaveError('Nie udało się wczytać wydarzenia.'); setLoading(false); return; }
      setName(data.name || '');
      setShortDescription(data.short_description || '');
      setEventDate(data.event_date || '');
      setEventTime(data.event_time ? String(data.event_time).slice(0, 5) : '');
      setLocation(data.location || '');
      setCapacity(data.capacity != null ? String(data.capacity) : '');
      setStatus(data.status);
      setExternalFormUrl(data.external_form_url || '');
      if (data.cover_image_storage_path) {
        setExistingCoverPath(data.cover_image_storage_path);
        setExistingCoverUrl(supabase.storage.from('event-images').getPublicUrl(data.cover_image_storage_path).data.publicUrl);
      }
      if (data.content && typeof data.content === 'object') {
        const content = data.content as Record<string, unknown>;
        setRawContent(content);
        const tabs = Array.isArray(content.tabs) ? content.tabs as ContentTab[] : [];
        setContentTabs(tabs.map((t) => ({ label: t.label || '', body: t.body || '' })));
      }
      setLoading(false);
    })();
  }, [isEdit, id]);

  function addTab() { setContentTabs((prev) => [...prev, { label: '', body: '' }]); }
  function updateTab(i: number, field: keyof ContentTab, val: string) {
    setContentTabs((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));
  }
  function removeTab(i: number) { setContentTabs((prev) => prev.filter((_, idx) => idx !== i)); }

  function handleFileSelected(file: File | null | undefined) {
    if (!file) return;
    setCoverImage({ file, preview: URL.createObjectURL(file) });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Podaj nazwę wydarzenia.';
    if (capacity.trim() && (!Number.isInteger(Number(capacity)) || Number(capacity) < 0)) errs.capacity = 'Podaj liczbę miejsc (0 lub więcej).';
    if (externalFormUrl.trim() && !/^https?:\/\//i.test(externalFormUrl.trim())) errs.externalFormUrl = 'Link musi zaczynać się od http:// lub https://';
    if (contentTabs.some((t) => t.label.trim() && !t.body.trim())) errs.tabs = 'Uzupełnij treść każdej dodanej zakładki (albo ją usuń).';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const cleanTabs = contentTabs
        .filter((t) => t.label.trim() && t.body.trim())
        .map((t) => ({ label: t.label.trim(), body: t.body.trim() }));
      const nextContent: Record<string, unknown> = { ...(rawContent || {}) };
      if (cleanTabs.length) nextContent.tabs = cleanTabs;
      else delete nextContent.tabs;

      const payload = {
        name: name.trim(),
        short_description: shortDescription.trim() || null,
        event_date: eventDate || null,
        event_time: eventTime || null,
        location: location.trim() || null,
        capacity: capacity.trim() ? Number(capacity) : null,
        status,
        external_form_url: externalFormUrl.trim() || null,
        content: Object.keys(nextContent).length ? nextContent : null,
      };

      let eventId = id;
      if (isEdit && eventId) {
        const { error } = await supabase.from('events').update(payload).eq('id', eventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('events').insert(payload).select('id').single();
        if (error) throw error;
        eventId = data.id;
      }

      if (coverImage && eventId) {
        const ext = coverImage.file.name.split('.').pop() || 'jpg';
        const path = `events/${eventId}/cover-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('event-images').upload(path, coverImage.file);
        if (!uploadErr) {
          await supabase.from('events').update({ cover_image_storage_path: path }).eq('id', eventId);
        }
      }

      navigate('/events');
    } catch (e) {
      console.error(e);
      setSaveError('Nie udało się zapisać wydarzenia. Sprawdź, czy wszystkie wymagane pola są uzupełnione, i spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      <div>
        <button className="btn btn-ghost" style={{ padding: '4px 0', fontSize: 13 }} onClick={() => navigate('/events')}>← Wróć do wydarzeń</button>
        <h1 className="heading" style={{ fontSize: 24, marginTop: 8 }}>{isEdit ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}</h1>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="field">
          <label htmlFor="ev-name">Nazwa wydarzenia *</label>
          <input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Niedzielne U3 — 23.08.2026" />
          {fieldErrors.name && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{fieldErrors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="ev-cover">Zdjęcie</label>
          {(coverImage?.preview || existingCoverUrl) && (
            <img
              src={coverImage?.preview || existingCoverUrl || ''}
              alt="Podgląd zdjęcia wydarzenia"
              style={{ width: 220, height: 130, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
            />
          )}
          <input ref={fileInputRef} id="ev-cover" type="file" accept="image/*" onChange={(e) => handleFileSelected(e.target.files?.[0])} />
          {existingCoverPath && !coverImage && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Wybierz nowy plik, żeby podmienić zdjęcie.</span>}
        </div>

        <div className="field">
          <label htmlFor="ev-desc">Krótki opis</label>
          <textarea id="ev-desc" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={3} placeholder="Kilka zdań widocznych na liście i stronie wydarzenia." />
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label htmlFor="ev-date">Data</label>
            <input id="ev-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Zostaw puste dla wydarzeń cyklicznych bez ustalonej daty.</span>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="ev-time">Godzina</label>
            <input id="ev-time" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="ev-location">Miejsce</label>
          <input id="ev-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="np. Kunickiego 54, Lublin" />
        </div>

        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="ev-capacity">Limit miejsc</label>
          <input id="ev-capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="np. 60" />
          {fieldErrors.capacity && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{fieldErrors.capacity}</span>}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Zostaw puste, jeśli nie ma limitu.</span>
        </div>

        <div className="field">
          <label htmlFor="ev-form-url">Link do zapisów (formularz Google)</label>
          <input id="ev-form-url" value={externalFormUrl} onChange={(e) => setExternalFormUrl(e.target.value)} placeholder="np. link do Google Forms" />
          {fieldErrors.externalFormUrl && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{fieldErrors.externalFormUrl}</span>}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            To jedyny sposób zapisu na wydarzenie — przycisk „Zapisz się” na stronie zawsze otwiera ten link. Jeśli zostawisz puste, klienci zobaczą informację, że link pojawi się wkrótce — możesz go dodać później.
          </span>
        </div>

        <div className="field">
          <label>Zakładki (np. Cennik, Co w cenie, Mapa, Wymogi bezpieczeństwa)</label>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Każda zakładka pojawi się na stronie wydarzenia jako osobny przycisk z własną treścią.
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            {contentTabs.map((tab, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={tab.label}
                    onChange={(e) => updateTab(i, 'label', e.target.value)}
                    placeholder="Nazwa zakładki, np. Cennik"
                    style={{ flex: 1, fontWeight: 600 }}
                  />
                  <button type="button" className="btn btn-ghost" onClick={() => removeTab(i)} aria-label="Usuń zakładkę">🗑️</button>
                </div>
                <textarea
                  value={tab.body}
                  onChange={(e) => updateTab(i, 'body', e.target.value)}
                  rows={4}
                  placeholder="Treść zakładki — np. cennik, co jest wliczone, wymogi bezpieczeństwa..."
                />
              </div>
            ))}
            {fieldErrors.tabs && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{fieldErrors.tabs}</span>}
            <button type="button" className="btn btn-secondary" onClick={addTab} style={{ alignSelf: 'flex-start' }}>+ DODAJ ZAKŁADKĘ</button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="ev-status">Status</label>
          <select id="ev-status" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{EVENT_STATUS_LABELS[s]}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tylko „Opublikowane” jest widoczne dla klientów na liście najbliższych wydarzeń.</span>
        </div>
      </div>

      {saveError && <p style={{ color: 'var(--danger)' }}>{saveError}</p>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? 'ZAPISYWANIE...' : isEdit ? 'ZAPISZ ZMIANY' : 'DODAJ WYDARZENIE'}
        </button>
        <button className="btn btn-ghost" disabled={saving} onClick={() => navigate('/events')}>Anuluj</button>
      </div>
    </div>
  );
}
