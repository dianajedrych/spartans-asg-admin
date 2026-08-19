import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Brand, Category } from '../../lib/types';

interface SpecRow { name: string; value: string; unit: string; }
interface ImageItem { file: File; preview: string; }

const STEPS = [
  'Zdjęcie i nazwa',
  'Kategoria',
  'Cena',
  'Magazyn',
  'Opis',
  'Parametry',
  'Ustawienia',
  'Podgląd',
];

export function ProductWizard() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingRefData, setLoadingRefData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Krok 1
  const [name, setName] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; storage_path: string; url: string }[]>([]);
  // Krok 2
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [addingNewBrand, setAddingNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [sku, setSku] = useState('');
  // Krok 3
  const [basePrice, setBasePrice] = useState('');
  const [onSale, setOnSale] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  // Krok 4
  const [stock, setStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('3');
  const [variantId, setVariantId] = useState<string | null>(null);
  // Krok 5
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  // Krok 6
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  // Krok 7
  const [isFeatured, setIsFeatured] = useState(false);
  const [is18Plus, setIs18Plus] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [catRes, brandRes] = await Promise.all([
        supabase.from('categories').select('id, parent_id, name, sort_order').order('sort_order'),
        supabase.from('brands').select('id, name').order('name'),
      ]);
      setCategories((catRes.data as Category[]) || []);
      setBrands((brandRes.data as Brand[]) || []);

      if (isEdit && id) {
        const { data } = await supabase
          .from('products')
          .select(`
            name, sku, category_id, brand_id, base_price, sale_price,
            short_description, description, is_featured, is_18_plus, is_active,
            product_specifications ( spec_name, spec_value, spec_unit ),
            product_variants ( id, inventory ( quantity_on_hand, low_stock_threshold ) ),
            product_images ( id, storage_path )
          `)
          .eq('id', id)
          .single();
        if (data) {
          setName(data.name || '');
          setSku(data.sku || '');
          setCategoryId(data.category_id || '');
          setBrandId(data.brand_id || '');
          setBasePrice(String(data.base_price ?? ''));
          if (data.sale_price != null) { setOnSale(true); setSalePrice(String(data.sale_price)); }
          setShortDescription(data.short_description || '');
          setDescription(data.description || '');
          setIsFeatured(!!data.is_featured);
          setIs18Plus(!!data.is_18_plus);
          setIsActive(!!data.is_active);
          const specsData = (data.product_specifications || []) as unknown as { spec_name: string; spec_value: string; spec_unit: string | null }[];
          setSpecs(specsData.map((s) => ({ name: s.spec_name, value: s.spec_value, unit: s.spec_unit || '' })));
          const variants = (data.product_variants || []) as unknown as { id: string; inventory: { quantity_on_hand: number; low_stock_threshold: number } | null }[];
          if (variants[0]) {
            setVariantId(variants[0].id);
            setStock(String(variants[0].inventory?.quantity_on_hand ?? 0));
            setLowStockThreshold(String(variants[0].inventory?.low_stock_threshold ?? 3));
          }
          const imgs = (data.product_images || []) as unknown as { id: string; storage_path: string }[];
          setExistingImages(
            imgs.map((img) => ({
              id: img.id,
              storage_path: img.storage_path,
              url: supabase.storage.from('product-images').getPublicUrl(img.storage_path).data.publicUrl,
            }))
          );
        }
      }
      setLoadingRefData(false);
    })();
  }, [id, isEdit]);

  const topCategories = categories.filter((c) => !c.parent_id);
  const subCategories = categories.filter((c) => c.parent_id === categoryId);
  // Jeżeli wybrana kategoria jest podkategorią (produkt edytowany wcześniej z liściem),
  // pokaż też jej rodzica jako wybrany rodzic, żeby lista podkategorii się zgadzała.
  const selectedTopId = (() => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return '';
    return cat.parent_id || cat.id;
  })();

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const next = Array.from(fileList).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...next]);
  }

  function removeNewImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function removeExistingImage(imageId: string) {
    await supabase.from('product_images').delete().eq('id', imageId);
    setExistingImages((prev) => prev.filter((i) => i.id !== imageId));
  }

  function addSpecRow() { setSpecs((prev) => [...prev, { name: '', value: '', unit: '' }]); }
  function updateSpecRow(i: number, field: keyof SpecRow, val: string) {
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  }
  function removeSpecRow(i: number) { setSpecs((prev) => prev.filter((_, idx) => idx !== i)); }

  function validateStep(current: number): boolean {
    const errs: Record<string, string> = {};
    if (current === 0 && !name.trim()) errs.name = 'Nazwa produktu jest wymagana.';
    if (current === 2) {
      const bp = parseFloat(basePrice);
      if (!basePrice || isNaN(bp) || bp <= 0) errs.basePrice = 'Podaj poprawną cenę większą od 0.';
      if (onSale) {
        const sp = parseFloat(salePrice);
        if (!salePrice || isNaN(sp) || sp <= 0) errs.salePrice = 'Podaj poprawną cenę promocyjną.';
        else if (sp >= bp) errs.salePrice = 'Cena promocyjna musi być niższa niż cena podstawowa.';
      }
    }
    if (current === 3) {
      const qty = parseInt(stock, 10);
      if (stock === '' || isNaN(qty) || qty < 0) errs.stock = 'Podaj liczbę sztuk (0 lub więcej).';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() { setFieldErrors({}); setStep((s) => Math.max(s - 1, 0)); }

  // Zwraca id marki do zapisu w produkcie — jeśli właściciel wpisał nową
  // markę, najpierw ją tworzy (albo znajduje istniejącą o tej samej nazwie,
  // żeby literówka w wielkości liter nie tworzyła duplikatu).
  async function resolveBrandId(): Promise<string | null> {
    if (!addingNewBrand) return brandId || null;
    const trimmed = newBrandName.trim();
    if (!trimmed) return null;
    const { data: existing } = await supabase.from('brands').select('id').ilike('name', trimmed).maybeSingle();
    if (existing) return existing.id;
    const { data: created, error } = await supabase.from('brands').insert({ name: trimmed }).select('id').single();
    if (error) throw error;
    return created.id;
  }

  async function uploadPendingImages(productId: string) {
    for (let i = 0; i < images.length; i++) {
      const { file } = images[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `products/${productId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadErr) continue;
      await supabase.from('product_images').insert({
        product_id: productId,
        storage_path: path,
        sort_order: existingImages.length + i,
        is_primary: existingImages.length === 0 && i === 0,
      });
    }
  }

  async function handlePublish(publishActive: boolean) {
    if (!validateStep(0) || !validateStep(2) || !validateStep(3)) {
      setSaveError('Uzupełnij wymagane pola we wcześniejszych krokach.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const cleanSpecs = specs.filter((s) => s.name.trim() && s.value.trim());
      const resolvedBrandId = await resolveBrandId();

      if (isEdit && id) {
        const { error: updateErr } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            sku: sku.trim() || null,
            category_id: categoryId || null,
            brand_id: resolvedBrandId,
            base_price: parseFloat(basePrice),
            sale_price: onSale ? parseFloat(salePrice) : null,
            short_description: shortDescription || null,
            description: description || null,
            is_featured: isFeatured,
            is_18_plus: is18Plus,
            is_active: publishActive,
          })
          .eq('id', id);
        if (updateErr) throw updateErr;

        if (variantId) {
          await supabase.from('inventory').update({
            quantity_on_hand: parseInt(stock, 10),
            low_stock_threshold: parseInt(lowStockThreshold, 10) || 3,
          }).eq('variant_id', variantId);
        }

        await supabase.from('product_specifications').delete().eq('product_id', id);
        if (cleanSpecs.length) {
          await supabase.from('product_specifications').insert(
            cleanSpecs.map((s) => ({ product_id: id, spec_name: s.name, spec_value: s.value, spec_unit: s.unit || null }))
          );
        }

        await uploadPendingImages(id);
        setSaved(true);
        setTimeout(() => navigate('/products'), 900);
      } else {
        const { data: newId, error: rpcErr } = await supabase.rpc('admin_create_product', {
          p_name: name.trim(),
          p_slug: null,
          p_sku: sku.trim() || null,
          p_short_description: shortDescription || null,
          p_description: description || null,
          p_brand_id: resolvedBrandId,
          p_category_id: categoryId || null,
          p_base_price: parseFloat(basePrice),
          p_sale_price: onSale ? parseFloat(salePrice) : null,
          p_is_active: publishActive,
          p_is_featured: isFeatured,
          p_is_18_plus: is18Plus,
          p_is_bestseller: false,
          p_is_new: true,
          p_variants: [{ label: 'Standard', quantity: parseInt(stock, 10) || 0 }],
          p_specifications: cleanSpecs.map((s) => ({ spec_name: s.name, spec_value: s.value, spec_unit: s.unit || null })),
        });
        if (rpcErr) throw rpcErr;
        if (newId) await uploadPendingImages(newId as unknown as string);
        setSaved(true);
        setTimeout(() => navigate('/products'), 900);
      }
    } catch (e) {
      console.error(e);
      setSaveError('Nie udało się zapisać produktu. Sprawdź, czy wszystkie wymagane pola są uzupełnione, i spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  if (loadingRefData) return <p style={{ color: 'var(--text-muted)' }}>Wczytywanie...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
      <div>
        <h1 className="heading" style={{ fontSize: 24 }}>{isEdit ? 'Edytuj produkt' : 'Dodaj produkt'}</h1>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                color: i === step ? 'var(--accent)' : i < step ? 'var(--success)' : 'var(--text-muted)',
                fontWeight: i === step ? 700 : 500,
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i === step ? 'var(--accent-soft)' : i < step ? 'var(--success-soft)' : 'var(--surface-muted)',
                fontSize: 11,
              }}>
                {i < step ? '✓' : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {step === 0 && (
          <>
            <div className="field">
              <label htmlFor="name">Jak nazywa się produkt?</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Replika M4 CQB" />
              {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
            </div>
            <div className="field">
              <label>Zdjęcia produktu</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {existingImages.map((img) => (
                  <div key={img.id} style={{ position: 'relative', width: 90, height: 90 }}>
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button type="button" onClick={() => removeExistingImage(img.id)} aria-label="Usuń zdjęcie"
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                  </div>
                ))}
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative', width: 90, height: 90 }}>
                    <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button type="button" onClick={() => removeNewImage(i)} aria-label="Usuń zdjęcie"
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ width: 90, height: 90, border: '2px dashed var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                  + DODAJ
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFilesSelected(e.target.files)} />
              </div>
              <span className="hint">Pierwsze zdjęcie będzie zdjęciem głównym. Możesz dodać kilka.</span>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="field">
              <label htmlFor="cat">Do czego należy produkt?</label>
              <select id="cat" value={selectedTopId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Wybierz kategorię</option>
                {topCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {subCategories.length > 0 && (
              <div className="field">
                <label htmlFor="subcat">Rodzaj</label>
                <select id="subcat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value={selectedTopId}>— brak —</option>
                  {subCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor="brand">Marka</label>
              {!addingNewBrand ? (
                <select
                  id="brand"
                  value={brandId}
                  onChange={(e) => {
                    if (e.target.value === '__new__') { setAddingNewBrand(true); setBrandId(''); }
                    else setBrandId(e.target.value);
                  }}
                >
                  <option value="">Wybierz markę</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  <option value="__new__">+ Dodaj nową markę…</option>
                </select>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    autoFocus
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="Nazwa nowej marki"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-ghost" onClick={() => { setAddingNewBrand(false); setNewBrandName(''); }}>
                    Anuluj
                  </button>
                </div>
              )}
              {!addingNewBrand && (
                <span className="hint">Nie ma jeszcze tej marki na liście? Wybierz „+ Dodaj nową markę…”.</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="sku">SKU</label>
              <input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="zostaw puste, wygenerujemy automatycznie" />
              <span className="hint">SKU to unikalny kod produktu. Jeśli go nie masz, system wygeneruje go sam.</span>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="field">
              <label htmlFor="price">Cena produktu (PLN)</label>
              <input id="price" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="899,00" inputMode="decimal" />
              {fieldErrors.basePrice && <span className="error">{fieldErrors.basePrice}</span>}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={onSale} onChange={(e) => setOnSale(e.target.checked)} />
              Produkt w promocji
            </label>
            {onSale && (
              <div className="field">
                <label htmlFor="salePrice">Cena promocyjna (PLN)</label>
                <input id="salePrice" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="niższa niż cena podstawowa" inputMode="decimal" />
                {fieldErrors.salePrice && <span className="error">{fieldErrors.salePrice}</span>}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="field">
              <label htmlFor="stock">Ile sztuk masz obecnie?</label>
              <input id="stock" value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
              {fieldErrors.stock && <span className="error">{fieldErrors.stock}</span>}
            </div>
            <div className="field">
              <label htmlFor="threshold">Próg niskiego magazynu</label>
              <input id="threshold" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} inputMode="numeric" />
              <span className="hint">Gdy stan spadnie do tej liczby lub niżej, zobaczysz ostrzeżenie na pulpicie.</span>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="field">
              <label htmlFor="shortDesc">Krótki opis</label>
              <input id="shortDesc" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Jedno zdanie widoczne na liście produktów" />
            </div>
            <div className="field">
              <label htmlFor="fullDesc">Pełny opis</label>
              <textarea id="fullDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={8} placeholder="Opisz produkt — co zawiera, do czego służy, jak się różni od innych..." />
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Dodaj dowolne parametry techniczne — np. FPS, Hop-Up, Gearbox, Waga. To pole jest opcjonalne.
            </p>
            {specs.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 1 }}>
                  {i === 0 && <label>Nazwa</label>}
                  <input value={s.name} onChange={(e) => updateSpecRow(i, 'name', e.target.value)} placeholder="FPS" />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  {i === 0 && <label>Wartość</label>}
                  <input value={s.value} onChange={(e) => updateSpecRow(i, 'value', e.target.value)} placeholder="350" />
                </div>
                <div className="field" style={{ width: 90 }}>
                  {i === 0 && <label>Jednostka</label>}
                  <input value={s.unit} onChange={(e) => updateSpecRow(i, 'unit', e.target.value)} placeholder="FPS" />
                </div>
                <button type="button" className="btn btn-ghost" style={{ padding: '11px' }} onClick={() => removeSpecRow(i)} aria-label="Usuń parametr">🗑️</button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addSpecRow} style={{ alignSelf: 'flex-start' }}>+ DODAJ PARAMETR</button>
          </>
        )}

        {step === 6 && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              Produkt polecany
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={is18Plus} onChange={(e) => setIs18Plus(e.target.checked)} />
              Produkt 18+
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Produkt widoczny w sklepie
            </label>
          </>
        )}

        {step === 7 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Tak będzie wyglądał produkt w sklepie:</p>
            <div className="card" style={{ padding: 16, display: 'flex', gap: 16 }}>
              <div style={{ width: 90, height: 90, borderRadius: 8, background: 'var(--surface-muted)', flexShrink: 0, overflow: 'hidden' }}>
                {(existingImages[0] || images[0]) && (
                  <img src={existingImages[0]?.url || images[0]?.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{name || '(bez nazwy)'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{shortDescription}</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, marginTop: 8 }}>
                  {onSale ? <><span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: 8 }}>{basePrice} zł</span>{salePrice} zł</> : `${basePrice} zł`}
                </div>
              </div>
            </div>
            {saveError && <span className="error">{saveError}</span>}
            {saved && <span style={{ color: 'var(--success)' }}>Produkt został zapisany ✓</span>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button className="btn btn-secondary" onClick={step === 0 ? () => navigate('/products') : goBack} disabled={saving}>
          {step === 0 ? 'ANULUJ' : '← WRÓĆ'}
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" onClick={goNext}>DALEJ →</button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" disabled={saving} onClick={() => handlePublish(false)}>ZAPISZ WERSJĘ ROBOCZĄ</button>
            <button className="btn btn-primary" disabled={saving} onClick={() => handlePublish(isActive)}>{saving ? 'ZAPISYWANIE...' : '🚀 OPUBLIKUJ'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
