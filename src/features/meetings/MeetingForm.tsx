import { useState, type FormEvent } from 'react';
import { ArrowRightCircle, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { meetingsApi } from '../../api/tasks';
import type { Meeting, MeetingInput, MeetingPerson } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from '../../ui/Modal';
import { DateInput, TimeInput } from '../../ui/dates';
import { askConfirm } from '../../ui/dialog';
import { MultiSelect, Segmented, Select } from '../../ui/fields';

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
  const [tab, setTab] = useState<'info' | 'agenda' | 'actions'>('info');
  const editable = !meeting || meeting.canEdit;
  const name = (id?: string | null) => people.find((p) => p.id === id)?.name ?? '—';

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setMsg('');
    if (!meeting && m.date < new Date().toISOString().slice(0, 10)) { setError('برای روز گذشته جلسه‌ی جدید ثبت نمی‌شود.'); return; }
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

  const lock = !editable;
  const field = 'border rounded-lg px-3 py-2';
  const tabs: [typeof tab, string][] = [['info', 'اطلاعات'], ['agenda', `دستور جلسه${m.agenda.length ? ` (${m.agenda.length.toLocaleString('fa-IR')})` : ''}`], ['actions', `اقدام‌ها${m.actions.length ? ` (${m.actions.length.toLocaleString('fa-IR')})` : ''}`]];
  const peopleOpts = people.map((p) => ({ value: p.id, label: p.name }));

  return (
    <Modal title={meeting ? 'جلسه' : 'جلسه جدید'} onClose={onClose} size="xl">
      <form onSubmit={submit} className="space-y-4 text-sm">
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map(([k, l]) => <button type="button" key={k} onClick={() => setTab(k)} className={`px-4 py-2 -mb-px border-b-2 ${tab === k ? 'border-blue-600 text-blue-700 font-semibold' : 'border-transparent text-slate-500'}`}>{l}</button>)}
        </div>

        {tab === 'info' && (
          <div className="space-y-4">
            <input className={`w-full ${field}`} placeholder="عنوان جلسه" disabled={lock} value={m.title} onChange={(e) => set('title', e.target.value)} />
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div><div className="text-slate-500 mb-1">نوع</div><Segmented value={m.type} disabled={lock} onChange={(v) => set('type', v)} options={Object.entries(TYPES).map(([value, label]) => ({ value, label }))} /></div>
              <div><div className="text-slate-500 mb-1">تاریخ</div><DateInput className={field} disabled={lock} value={m.date} onChange={(e) => set('date', e.target.value)} /></div>
              <div><div className="text-slate-500 mb-1">ساعت شروع</div><TimeInput className={field} disabled={lock} value={m.startTime} onChange={(e) => set('startTime', e.target.value)} /></div>
              <div><div className="text-slate-500 mb-1">ساعت پایان</div><TimeInput className={field} disabled={lock} value={m.endTime} onChange={(e) => set('endTime', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">مکان<input className={`mt-1 w-full ${field}`} disabled={lock} value={m.location ?? ''} onChange={(e) => set('location', e.target.value)} /></label>
              <div>برگزارکننده<Select className={`mt-1 w-full ${field}`} disabled={lock} value={m.organizerUserId} onChange={(e) => set('organizerUserId', e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
            </div>
            <div><div className="text-slate-500 mb-1">شرکت‌کنندگان</div><MultiSelect disabled={lock} value={m.participantIds} onChange={(v) => set('participantIds', v)} options={peopleOpts} placeholder="افزودن شرکت‌کننده…" /></div>
            <label className="block">توضیحات<textarea className={`mt-1 w-full ${field}`} rows={4} disabled={lock} value={m.minutes ?? ''} onChange={(e) => set('minutes', e.target.value)} /></label>
          </div>
        )}

        {tab === 'agenda' && (
          <div className="space-y-2">
            {m.agenda.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={`flex-1 ${field}`} disabled={lock} value={a.title} placeholder="بند دستور جلسه" onChange={(e) => set('agenda', m.agenda.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <input type="number" min={1} className={`w-24 ${field}`} disabled={lock} value={a.durationMinutes} onChange={(e) => set('agenda', m.agenda.map((x, j) => j === i ? { ...x, durationMinutes: Number(e.target.value) } : x))} /> دقیقه
                {editable && <button type="button" className="p-1 hover:text-red-600" aria-label="حذف" onClick={() => set('agenda', m.agenda.filter((_, j) => j !== i))}><Trash2 size={15} /></button>}
              </div>))}
            {m.agenda.length === 0 && <p className="text-slate-400 py-6 text-center">هنوز بندی برای دستور جلسه نیست.</p>}
            {editable && <button type="button" className="flex items-center gap-1 text-blue-700" onClick={() => set('agenda', [...m.agenda, { title: '', durationMinutes: 10 }])}><Plus size={14} /> افزودن بند</button>}
          </div>
        )}

        {tab === 'actions' && (
          <div className="space-y-2">
            {m.actions.map((a, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 border rounded-xl p-2">
                <input className={`flex-1 min-w-48 ${field}`} disabled={lock || !!a.taskId} value={a.title} placeholder="اقدام" onChange={(e) => set('actions', m.actions.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <Select className={`w-48 ${field}`} disabled={lock || !!a.taskId} value={a.assigneeUserId ?? ''} onChange={(e) => set('actions', m.actions.map((x, j) => j === i ? { ...x, assigneeUserId: e.target.value || null } : x))}><option value="">مسئول…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                <DateInput className={`w-36 ${field}`} disabled={lock || !!a.taskId} value={a.dueDate ?? ''} onChange={(e) => set('actions', m.actions.map((x, j) => j === i ? { ...x, dueDate: e.target.value || null } : x))} />
                {a.taskId ? <span className="text-xs text-green-700">وظیفه شد ({name(a.assigneeUserId)})</span>
                  : meeting && editable && can('Tasks.Create') && a.title.trim() ? <button type="button" title="تبدیل به وظیفه" className="flex items-center gap-1 text-xs border rounded-lg px-2 py-1 hover:bg-slate-50" onClick={() => convert(i)}><ArrowRightCircle size={14} /> وظیفه</button> : null}
                {editable && !a.taskId && <button type="button" className="p-1 hover:text-red-600" aria-label="حذف" onClick={() => set('actions', m.actions.filter((_, j) => j !== i))}><Trash2 size={15} /></button>}
              </div>))}
            {m.actions.length === 0 && <p className="text-slate-400 py-6 text-center">هنوز اقدامی ثبت نشده است.</p>}
            <div className="flex gap-4">
              {editable && <button type="button" className="flex items-center gap-1 text-blue-700" onClick={() => set('actions', [...m.actions, { title: '', status: 'todo' }])}><Plus size={14} /> افزودن اقدام</button>}
              {meeting && editable && can('Tasks.Create') && m.actions.some((a) => !a.taskId && a.title.trim()) && <button type="button" className="text-green-700 underline" onClick={() => convert(null)}>تبدیل همه به وظیفه</button>}
            </div>
            {meeting && <p className="text-xs text-slate-400">اقدام‌ها را اول ذخیره کنید، بعد به وظیفه تبدیل کنید.</p>}
          </div>
        )}

        {msg && <p className="text-green-700">{msg}</p>}
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          {editable && <button disabled={!m.title.trim()} className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 disabled:opacity-50">ذخیره</button>}
          {meeting?.canDelete && <button type="button" className="rounded-xl border border-red-200 text-red-600 px-5 py-2.5" onClick={async () => (await askConfirm('این جلسه حذف شود؟')) && meetingsApi.remove(meeting.id, meeting.version).then(() => { onSaved(); onClose(); }).catch((e) => setError((e as Error).message))}>حذف جلسه</button>}
        </div>
      </form>
    </Modal>
  );
}
