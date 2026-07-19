export function ProfileStubCard({ title }: { title: string }) {
  return (
    <div className="glass-panel border-dashed border-white/15 rounded-[var(--radius-lg)] p-5">
      <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-muted">{title}</h2>
      <p className="text-sm text-ink-muted">Coming in a later part of this sprint.</p>
    </div>
  );
}
