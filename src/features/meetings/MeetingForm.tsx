import { useState, type FormEvent } from 'react';
import { ArrowRightCircle, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { meetingsApi } from '../../api/tasks';
import type { Meeting, MeetingInput, MeetingPerson } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from '../../ui/Modal';

const TYPES: Record<string, string> = { meeting: 'جلسه', online: 'آنلاین', committee: 'کمیته' };
export const emptyMeeting = (organizerUserId: string, date: string): MeetingInput => ({
  title: '', type: 'meeting', date, startTime: '09:00', endTime: '10:00', location: '', organizerUserId, description: '', participantIds: [], agenda: [], minutes: '', actions: [], taskIds: [],
});

// A meeting with its agenda, minutes and action items. An action of a saved meeting can be turned into a task; the task keeps the meeting.
export function MeetingForm({ meeting, people, initial, onClose, onSaved }: { meeting?: Meeting; people: MeetingPerson[]; initial: MeetingInput; onClose: () => void; onSaved: () => void }) {
  const { can } = useAuth();
  const [m, setM] = useState<MeetingInput>(meeting?.details ?? initial);
  const [version, setVersion] = useState(meeting?.version ?? null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const editable = !meeting || meeting.canEdit;
  const name = (id?: string | null) => people.find((p) => p.id === id)?.name ?? '—';

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setMsg('');
    try { const saved = await meetingsApi.save(meeting?.id ?? null, { ...m, version }); if (saved.notice) setMsg(saved.notice); onSaved(); }
    catch (x) { setError(x instanceof ApiError ? x.message : 'خطا'); }
  }
  async function convert(index: number | null) {
    if (!meeting) return;
    setError(''); setMsg('');
    try {
      const r = index === null ? await meetingsApi.convertAll(meeting.id) : await meetingsApi.convert(meeting.id, index);
      setM(r.meeting.details); setVersion(r.meeting.version);
      setMsg(`${r.converted.length} وظیفه ساخته شد${r.skipped.length ? `؛ ${r.skipped.length} مورد انجام نشد: ${r.skipped[0]}` : ''}`);
      onSaved();
    } catch (x) { setError(x instanceof ApiError ? x.message : 'خطا'); }
  }
  const set = <K extends keyof MeetingInput>(k: K, v: MeetingInput[K]) => setM({ ...m, [k]: v });

  return (
    <Modal title={meeting ? 'جلسه' : 'جلسه جدید'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm max-h-[75vh] overflow-y-auto">
        <input className="w-full border rounded-lg px-3 py-2" placeholder="عنوان" disabled={!editable} value={m.title} onChange={(e) => set('title', e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <select className="border rounded-lg px-2 py-1" disabled={!editable} value={m.type} onChange={(e) => set('type', e.target.value)}>{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input type="date" className="border rounded-lg px-2 py-1" disabled={!editable} value={m.date} onChange={(e) => set('date', e.target.value)} />
          <input type="time" className="border rounded-lg px-2 py-1" disabled={!editable} value={m.startTime} onChange={(e) => set('startTime', e.target.value)} />
          <input type="time" className="border rounded-lg px-2 py-1" disabled={!editable} value={m.endTime} onChange={(e) => set('endTime', e.target.value)} />
          <input className="flex-1 min-w-32 border rounded-lg px-2 py-1" placeholder="مکان" disabled={!editable} value={m.location ?? ''} onChange={(e) => set('location', e.target.value)} />
        </div>
        <label className="block">برگزارکننده
          <select className="mt-1 w-full border rounded-lg px-2 py-1" disabled={!editable} value={m.organizerUserId} onChange={(e) => set('organizerUserId', e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <fieldset className="space-y-1"><legend className="text-slate-500">شرکت‌کنندگان</legend>
          <div className="flex flex-wrap gap-2">{people.map((p) => (
            <label key={p.id} className="flex items-center gap-1 border rounded-full px-2 py-0.5"><input type="checkbox" disabled={!editable} checked={m.participantIds.includes(p.id)}
              onChange={(e) => set('participantIds', e.target.checked ? [...m.participantIds, p.id] : m.participantIds.filter((x) => x !== p.id))} />{p.name}</label>))}</div></fieldset>

        <fieldset className="space-y-1"><legend className="text-slate-500">دستور جلسه</legend>
          {m.agenda.map((a, i) => (
            <div key={i} className="flex gap-2"><input className="flex-1 border rounded-lg px-2 py-1" disabled={!editable} value={a.title} placeholder="بند" onChange={(e) => set('agenda', m.agenda.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <input type="number" min={1} className="w-20 border rounded-lg px-2 py-1" disabled={!editable} value={a.durationMinutes} onChange={(e) => set('agenda', m.agenda.map((x, j) => j === i ? { ...x, durationMinutes: Number(e.target.value) } : x))} /> دقیقه
              {editable && <button type="button" className="p-1 hover:text-red-600" onClick={() => set('agenda', m.agenda.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}</div>))}
          {editable && <button type="button" className="flex items-center gap-1 text-blue-700" onClick={() => set('agenda', [...m.agenda, { title: '', durationMinutes: 10 }])}><Plus size={14} /> بند</button>}</fieldset>

        <label className="block">صورت‌جلسه
          <textarea className="mt-1 w-full border rounded-lg px-3 py-2" rows={4} disabled={!editable} value={m.minutes ?? ''} onChange={(e) => set('minutes', e.target.value)} /></label>

        <fieldset className="space-y-1"><legend className="text-slate-500">اقدام‌ها</legend>
          {m.actions.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 border rounded-lg p-2">
              <input className="flex-1 min-w-40 border rounded-lg px-2 py-1" disabled={!editable || !!a.taskId} value={a.title} placeholder="اقدام" onChange={(e) => set('actions', m.actions.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <select className="border rounded-lg px-2 py-1" disabled={!editable || !!a.taskId} value={a.assigneeUserId ?? ''} onChange={(e) => set('actions', m.actions.map((x, j) => j === i ? { ...x, assigneeUserId: e.target.value || null } : x))}><option value="">مسئول…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input type="date" className="border rounded-lg px-2 py-1" disabled={!editable || !!a.taskId} value={a.dueDate ?? ''} onChange={(e) => set('actions', m.actions.map((x, j) => j === i ? { ...x, dueDate: e.target.value || null } : x))} />
              {a.taskId ? <span className="text-xs text-green-700">وظیفه شد ({name(a.assigneeUserId)})</span>
                : meeting && editable && can('Tasks.Create') && a.title.trim() ? <button type="button" title="تبدیل به وظیفه" className="flex items-center gap-1 text-xs border rounded-lg px-2 py-1 hover:bg-slate-50" onClick={() => convert(i)}><ArrowRightCircle size={14} /> وظیفه</button> : null}
              {editable && !a.taskId && <button type="button" className="p-1 hover:text-red-600" onClick={() => set('actions', m.actions.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}
            </div>))}
          <div className="flex gap-3">
            {editable && <button type="button" className="flex items-center gap-1 text-blue-700" onClick={() => set('actions', [...m.actions, { title: '', status: 'todo' }])}><Plus size={14} /> اقدام</button>}
            {meeting && editable && can('Tasks.Create') && m.actions.some((a) => !a.taskId && a.title.trim()) && <button type="button" className="text-green-700 underline" onClick={() => convert(null)}>تبدیل همه به وظیفه</button>}
          </div>
          {meeting && <p className="text-xs text-slate-400">اقدام‌ها را اول ذخیره کن، بعد به وظیفه تبدیل کن.</p>}</fieldset>

        {msg && <p className="text-green-700">{msg}</p>}
        {error && <p className="text-red-600">{error}</p>}
        {editable && <button disabled={!m.title.trim()} className="w-full rounded-lg bg-blue-600 text-white py-2 disabled:opacity-50">ذخیره</button>}
      </form>
    </Modal>
  );
}
