import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { QUADRANT_LABEL, projectsApi, type StakeholderMatrix } from '../../api/projects';

// The Mendelow grid: power on one axis, interest on the other. Each quadrant has a strategy the
// project writes for itself.
const QUADRANTS = ['ManageClosely', 'KeepSatisfied', 'KeepInformed', 'Monitor'];

export function StakeholderMatrix({ projectId, canEdit, version }: { projectId: string; canEdit: boolean; version: number }) {
  const { me } = useAuth();
  const [matrix, setMatrix] = useState<StakeholderMatrix | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    projectsApi.matrix(projectId).then(setMatrix).catch((e: Error) => setError(e.message));
    projectsApi.stakeholderSettings(projectId)
      .then((s) => {
        const next = { ManageClosely: s.manageClosely, KeepSatisfied: s.keepSatisfied, KeepInformed: s.keepInformed, Monitor: s.monitor };
        setSaved(next);
        setDraft(next);
      })
      .catch(() => { setSaved({}); setDraft({}); });
  }, [projectId]);
  useEffect(load, [load, version]);

  const byQuadrant = new Map<string, StakeholderMatrix['cells'][number]['stakeholders']>();
  for (const cell of matrix?.cells ?? []) {
    byQuadrant.set(cell.quadrant, [...(byQuadrant.get(cell.quadrant) ?? []), ...cell.stakeholders]);
  }

  async function saveStrategy(quadrant: string, text: string) {
    setSaving(true); setError('');
    try {
      await projectsApi.saveStakeholderSettings(me?.user.tenantId ?? '', projectId, { [quadrant]: text || null });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setSaving(false);
    }
  }

  const names = (quadrant: string) => {
    const list = byQuadrant.get(quadrant) ?? [];
    return list.length ? list.map((s) => s.name + (s.isInternal ? '' : ' (بیرونی)')).join('، ') : '—';
  };

  return (
    <section className="bg-white rounded-xl border p-4 space-y-3 text-sm">
      <h2 className="font-medium">ماتریس ذی‌نفعان (قدرت × اینترست)</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!matrix && !error && <p className="text-slate-500">...</p>}

      {matrix && (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border p-2">
              <div className="font-medium mb-1">{QUADRANT_LABEL.ManageClosely} <span className="text-slate-400">(قدرت زیاد، اینترست زیاد)</span></div>
              <p>{names('ManageClosely')}</p>
            </div>
            <div className="rounded-lg border p-2">
              <div className="font-medium mb-1">{QUADRANT_LABEL.KeepSatisfied} <span className="text-slate-400">(قدرت زیاد، اینترست کم)</span></div>
              <p>{names('KeepSatisfied')}</p>
            </div>
            <div className="rounded-lg border p-2">
              <div className="font-medium mb-1">{QUADRANT_LABEL.KeepInformed} <span className="text-slate-400">(قدرت کم، اینترست زیاد)</span></div>
              <p>{names('KeepInformed')}</p>
            </div>
            <div className="rounded-lg border p-2">
              <div className="font-medium mb-1">{QUADRANT_LABEL.Monitor} <span className="text-slate-400">(قدرت کم، اینترست کم)</span></div>
              <p>{names('Monitor')}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">مجموع {matrix.totalStakeholders} ذی‌نفع. راهبرد هر ربع را خود پروژه تعریف می‌کند.</p>
          <div className="grid grid-cols-2 gap-2">
            {QUADRANTS.map((quadrant) => (
              <label key={quadrant} className="block text-xs">
                {QUADRANT_LABEL[quadrant]}
                {canEdit ? (
                  <textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={2} value={draft[quadrant] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [quadrant]: e.target.value })}
                    onBlur={() => { if ((draft[quadrant] ?? '') !== (saved[quadrant] ?? '')) saveStrategy(quadrant, draft[quadrant] ?? ''); }} />
                ) : (
                  <p className="mt-1 text-slate-600">{saved[quadrant] || '—'}</p>
                )}
              </label>
            ))}
          </div>
          {saving && <p className="text-xs text-slate-500">در حال ذخیره…</p>}
        </>
      )}
    </section>
  );
}
