import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { GalleryAlbumRow } from '../../lib/types';

export function GalleryList() {
  const [albums, setAlbums] = useState<GalleryAlbumRow[] | null>(null);
  const [error, setError] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  async function load() {
    setError(false);
    const { data, error: err } = await supabase
      .from('gallery_albums')
      .select('id, name, slug, cover_image_storage_path, sort_order, gallery_images ( id, storage_path, caption, sort_order )')
      .order('sort_order', { ascending: true });
    if (err) { setError(true); return; }
    setAlbums((data as unknown as GalleryAlbumRow[]) || []);
  }

  useEffect(() => { load(); }, []);

  function coverUrl(a: GalleryAlbumRow) {
    const path = a.cover_image_storage_path || a.gallery_images[0]?.storage_path;
    if (!path) return null;
    return supabase.storage.from('gallery-images').getPublicUrl(path).data.publicUrl;
  }

  async function createAlbum() {
    if (!newName.trim()) { setCreateError('Podaj nazwę albumu.'); return; }
    setCreating(true);
    setCreateError(null);
    const maxSort = albums && albums.length ? Math.max(...albums.map((a) => a.sort_order)) : -1;
    const { error: err } = await supabase.from('gallery_albums').insert({ name: newName.trim(), sort_order: maxSort + 1 });
    setCreating(false);
    if (err) { setCreateError('Nie udało się dodać albumu. Spróbuj ponownie.'); return; }
    setNewName('');
    load();
  }

  async function deleteAlbum(id: string) {
    const { error: err } = await supabase.from('gallery_albums').delete().eq('id', id);
    if (err) { alert('Nie udało się usunąć albumu. Spróbuj ponownie.'); return; }
    setConfirmDeleteId(null);
    load();
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    const { error: err } = await supabase.from('gallery_albums').update({ name: renameValue.trim() }).eq('id', id);
    if (err) { alert('Nie udało się zapisać nazwy. Spróbuj ponownie.'); return; }
    setRenamingId(null);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="heading" style={{ fontSize: 26 }}>Galeria</h1>

      <div className="card" style={{ padding: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 560 }}>
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="new-album-name">Nowy album</label>
          <input id="new-album-name" value={newName} onChange={(e) => { setNewName(e.target.value); setCreateError(null); }} placeholder="np. Niedzielne U3 — 23.08.2026" />
          {createError && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{createError}</span>}
        </div>
        <button className="btn btn-primary" disabled={creating} onClick={createAlbum}>
          {creating ? 'DODAWANIE...' : '+ DODAJ ALBUM'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>Nie udało się wczytać galerii. Odśwież stronę.</p>}
      {!error && albums === null && <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>}

      {albums !== null && albums.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nie masz jeszcze żadnych albumów — dodaj pierwszy powyżej.</p>
        </div>
      )}

      {albums !== null && albums.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {albums.map((a) => {
            const url = coverUrl(a);
            return (
              <div key={a.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 140, background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {url ? (
                    <img src={url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Brak zdjęć</span>
                  )}
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {renamingId === a.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} style={{ flex: 1 }} />
                      <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => saveRename(a.id)}>Zapisz</button>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.gallery_images.length} zdjęć</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link to={`/gallery/${a.id}`} className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>ZARZĄDZAJ ZDJĘCIAMI</Link>
                    <button className="btn btn-ghost" style={{ padding: '7px 10px', fontSize: 12 }} onClick={() => { setRenamingId(a.id); setRenameValue(a.name); }}>
                      Zmień nazwę
                    </button>
                    {confirmDeleteId === a.id ? (
                      <>
                        <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Usunąć album i wszystkie zdjęcia?</span>
                        <button className="btn btn-ghost" style={{ padding: '7px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteId(null)}>Nie</button>
                        <button className="btn btn-danger" style={{ padding: '7px 10px', fontSize: 12 }} onClick={() => deleteAlbum(a.id)}>Tak, usuń</button>
                      </>
                    ) : (
                      <button className="btn btn-ghost" style={{ padding: '7px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteId(a.id)}>Usuń album</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
