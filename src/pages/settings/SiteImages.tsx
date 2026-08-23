import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Stałe zdjęcia strony (logo, hero na Korengal, mapa dojazdu, "O nas") — do
// ETAPU "audyt systemu zdjęć" były wpisane na sztywno w kodzie strony, teraz
// mają swój wiersz w tabeli site_images (migracja 012_site_images.sql) i są
// edytowalne tutaj, tak samo jak zdjęcia produktów/wydarzeń/galerii.
const SLOTS: { key: string; label: string; hint: string }[] = [
  { key: 'header-logo', label: 'Logo w nagłówku', hint: 'Widoczne w górnym pasku na każdej stronie i w stopce. Najlepiej PNG z przezroczystym tłem — strona jest ciemna.' },
  { key: 'korengal-hero', label: 'Korengal — duże zdjęcie na górze strony', hint: 'Tło pod tytułem „KORENGAL: FINAL CHAPTER" na stronie wydarzenia.' },
  { key: 'korengal-hero-thumb', label: 'Korengal — miniatura na liście wydarzeń', hint: 'Kafelek „KORENGAL" na liście najbliższych wydarzeń.' },
  { key: 'korengal-mapa-dojazd', label: 'Korengal — mapa dojazdu', hint: 'W zakładce „Mapa" na stronie wydarzenia Korengal.' },
  { key: 'about-img', label: 'Zdjęcie na stronie „O nas"', hint: 'Np. wnętrze sklepu albo zespół Spartans ASG.' },
  { key: 'home-hero-bg', label: 'Strona główna — duże zdjęcie na samej górze', hint: 'Pełnoekranowe tło pod nagłówkiem „WEJDŹ DO GRY."' },
  { key: 'home-wwd-sklep', label: 'Strona główna — kafelek „SKLEP ASG"', hint: 'Sekcja „CO ROBIMY?" na stronie głównej.' },
  { key: 'home-wwd-wydarzenia', label: 'Strona główna — kafelek „WYDARZENIA"', hint: 'Sekcja „CO ROBIMY?" na stronie głównej.' },
  { key: 'home-wwd-eventy', label: 'Strona główna — kafelek „EVENTY"', hint: 'Sekcja „CO ROBIMY?" na stronie głównej.' },
  { key: 'home-wwd-serwis', label: 'Strona główna — kafelek „SERWIS"', hint: 'Sekcja „CO ROBIMY?" na stronie głównej.' },
  { key: 'home-community-bg', label: 'Strona główna — zdjęcie społeczności', hint: 'Sekcja „TO NIE TYLKO ASG. TO LUDZIE, KTÓRZY TWORZĄ GRĘ."' },
  { key: 'home-map-img', label: 'Mapka dojazdu do sklepu', hint: 'Sekcja Kontakt na stronie głównej — zamiast Google Maps.' },
  { key: 'eventy-hero', label: 'Eventy — duże zdjęcie na górze strony', hint: 'Strona z ofertą na kawalerskie/panieńskie/firmowe.' },
];

type Row = { key: string; storage_path: string | null };

export function SiteImages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoadError(false);
    const { data, error } = await supabase.from('site_images').select('key, storage_path');
    if (error) { setLoadError(true); setLoaded(true); return; }
    setRows(data || []);
    setLoaded(true);
  }

  useEffect(() => { load(); }, []);

  function url(path: string | null) {
    if (!path) return null;
    return supabase.storage.from('gallery-images').getPublicUrl(path).data.publicUrl;
  }

  function pathFor(key: string) {
    return rows.find((r) => r.key === key)?.storage_path ?? null;
  }

  async function handleFileSelected(key: string, file: File | null) {
    if (!file) return;
    setUploadingKey(key);
    setUploadError(null);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `site/${key}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('gallery-images').upload(path, file);
    if (uploadErr) {
      setUploadError('Nie udało się wgrać zdjęcia. Spróbuj ponownie.');
      setUploadingKey(null);
      return;
    }
    const { error: dbErr } = await supabase.from('site_images').upsert({ key, storage_path: path });
    if (dbErr) {
      setUploadError('Zdjęcie wgrane, ale nie udało się go zapisać. Spróbuj ponownie.');
      setUploadingKey(null);
      return;
    }
    setUploadingKey(null);
    const input = fileInputRefs.current[key];
    if (input) input.value = '';
    load();
  }

  if (!loaded) return <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>;

  if (loadError) {
    return (
      <div className="card" style={{ padding: 20, maxWidth: 640 }}>
        <p style={{ color: 'var(--danger)', marginBottom: 8 }}>Nie udało się wczytać zdjęć strony.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Ta sekcja wymaga uruchomienia migracji <code>012_site_images.sql</code> w bazie danych
          (Supabase Dashboard → SQL Editor). Skontaktuj się z osobą, która prowadzi techniczną
          stronę sklepu, jeśli ten komunikat się utrzymuje.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      <div>
        <h1 className="heading" style={{ fontSize: 26 }}>Zdjęcia strony</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Stałe zdjęcia, które nie są częścią konkretnego produktu ani wydarzenia — logo, zdjęcia
          strony Korengal, mapa dojazdu i zdjęcie na stronie „O nas".
        </p>
      </div>

      {uploadError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{uploadError}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {SLOTS.map((slot) => {
          const path = pathFor(slot.key);
          const src = url(path);
          const isUploading = uploadingKey === slot.key;
          return (
            <div key={slot.key} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 150, background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {src ? (
                  <img src={src} alt={slot.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, padding: 12, textAlign: 'center' }}>
                    Brak zdjęcia — na stronie widać dotychczasowe (jeśli jest)
                  </span>
                )}
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <strong style={{ fontSize: 14 }}>{slot.label}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{slot.hint}</span>
                <input
                  ref={(el) => { fileInputRefs.current[slot.key] = el; }}
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
                  onChange={(e) => handleFileSelected(slot.key, e.target.files?.[0] ?? null)}
                  style={{ fontSize: 12 }}
                />
                {isUploading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Wgrywanie...</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
