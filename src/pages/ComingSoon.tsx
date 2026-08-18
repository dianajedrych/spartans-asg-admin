export function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h1 className="heading" style={{ fontSize: 26 }}>{title}</h1>
      <p style={{ color: 'var(--text-muted)' }}>Ta sekcja pojawi się w kolejnym etapie.</p>
    </div>
  );
}
