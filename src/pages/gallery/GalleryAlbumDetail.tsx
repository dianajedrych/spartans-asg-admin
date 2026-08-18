import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { GalleryAlbumRow } from '../../lib/types';

export function GalleryAlbumDetail() {
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [album, setAlbum] = useState<GalleryAlbumRow | null>(null);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteImgId, setConfirmDeleteImgId] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setError(false);
    const { data, error: err } = await supabase
      .from('gallery_albums')
      .select('id, name, slug, cover_image_storage_path, sort_order, gallery_images ( id, storage_path, caption, sort_order )')
      .eq('id', id)
      .single();
    if (err || !data) { setError(true); return; }
    const row = data as unknown as GalleryAlbumRow;
    row.gallery_images = [...row.gallery_images].sort((a, b) => a.sort_order - b.sort_order);
    setAlbum(row);
    setCaptionDrafts(Object.fromEntries(row.gallery_images.map((img) => [img.id, img.caption || ''])));
  }

  useEffect(() => { load(); }, [id]);

  function url(path: string) {
    return supabase.storage.from('gallery-images').getPublicUrl(path).data.publicUrl;
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || !files.length || !album) return;
    setUploading(true);
    setUploadError(null);
    let sortOrder = album.gallery_images.length;
    let anyFailed = false;
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `albums/${album.id}/${Date.now()}-${sortOrder}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('gallery-images').upload(path, file);
      if (uploadErr) { anyFailed = true; continue; }
      await supabase.from('gallery_images').insert({ album_id: album.id, storage_path: path, sort_order: sortOrder });
      sortOrder += 1;
    }
    setUploading(false);
    if (anyFailed) setUploadError('Część zdjęć nie została dodana. Spróbuj ponownie.');
    if (fileInputRef.current) fileInputRef.current.value = '';
    load();
  }

  async function deleteImage(imgId: string, storagePath: string) {
    await supabase.storage.from('gallery-images').remove([storagePath]);
    const { error: err } = await supabase.from('gallery_images').delete().eq('id', imgId);
    if (err) { alert('Nie udało się usunąć zdjęcia. Spróbuj ponownie.'); return; }
    setConfirmDeleteImgId(null);
    load();
  }

  async function saveCaption(imgId: string) {
    const { error: err } = await supabase.from('gallery_images').update({ caption: captionDrafts[imgId] || null }).eq('id', imgId);
    if (err) alert('Nie udało się zapisać podpisu. Spróbuj ponownie.');
  }

  async function setAsCover(storagePath: string) {
    if (!album) return;
    const { error: err } = await supabase.from('gallery_albums').update({ cover_image_storage_path: storagePath }).eq('id', album.id);
    if (err) { alert('Nie udało się ustawić okładki. Spróbuj ponownie.'); return; }
    load();
  }

  if (error) return <p style={{ color: 'var(--danger)' }}>Nie udało się wczytać albumu.</p>;
  if (!album) return <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      <div>
        <Link to="/gallery" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Wróć do galerii</Link>
        <h1 className="heading" style={{ fontSize: 24, marginTop: 8 }}>{album.name}</h1>
      </div>

      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
        <label htmlFor="gallery-upload" style={{ fontWeight: 600, fontSize: 14 }}>Dodaj zdjęcia</label>
        <input ref={fileInputRef} id="gallery-upload" type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => handleFilesSelected(e.target.files)} />
        {uploading && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Wgrywanie...</span>}
        {uploadError && <span style={{ fontSize: 13, color: 'var(--danger)' }}>{uploadError}</span>}
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Możesz wybrać kilka zdjęć naraz.</span>
      </div>

      {album.gallery_images.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Ten album nie ma jeszcze żadnych zdjęć.</p>
        </div>
      )}

      {album.gallery_images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {album.gallery_images.map((img) => {
            const isCover = album.cover_image_storage_path === img.storage_path;
            return (
              <div key={img.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: 160, background: 'var(--surface-muted)' }}>
                  <img src={url(img.storage_path)} alt={img.caption || album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isCover && (
                    <span className="badge badge-success" style={{ position: 'absolute', top: 8, left: 8 }}>Okładka</span>
                  )}
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={captionDrafts[img.id] ?? ''}
                    onChange={(e) => setCaptionDrafts((s) => ({ ...s, [img.id]: e.target.value }))}
                    onBlur={() => saveCaption(img.id)}
                    placeholder="Podpis zdjęcia (opcjonalnie)"
                    style={{ fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {!isCover && (
                      <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setAsCover(img.storage_path)}>
                        Ustaw jako okładkę
                      </button>
                    )}
                    {confirmDeleteImgId === img.id ? (
                      <>
                        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteImgId(null)}>Nie</button>
                        <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => deleteImage(img.id, img.storage_path)}>Tak, usuń</button>
                      </>
                    ) : (
                      <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteImgId(img.id)}>Usuń</button>
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
