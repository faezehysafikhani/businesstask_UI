import { useEffect, useState } from 'react';
import { extrasApi, listGroups, listUsers, workTypesApi, type TaskExtras, type WorkType } from '../../api/tasks';
import { notify } from '../../ui/toast';
import { DateInput } from '../../ui/dates';
import { Segmented, Select } from '../../ui/fields';
import { Modal } from '../../ui/Modal';

// A task's work type and custom fields (saved together), and the hand-off to another person or team.
export function TaskExtrasPanel({ taskId, canEdit, onChanged }: { taskId: string; canEdit: boolean; onChanged?: () => void }) {
  const [extras, setExtras] = useState<TaskExtras | null>(null);
  const [types, setTypes] = useState<WorkType[]>([]);
  const [typeId, setTypeId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [handoff, setHandoff] = useState(false);

  useEffect(() => {
    setExtras(null);
    extrasApi.get(taskId).then((x) => {
      setExtras(x); setTypeId(x.workTypeId ?? '');
      setValues(Object.fromEntries(x.fields.map((fl) => [fl.fieldId, fl.value ?? ''])));
    }).catch(() => setExtras(null));
    workTypesApi.list().then((t) => setTypes(t.filter((x) => x.isActive))).catch(() => {});
  }, [taskId]);

  async function save() {
    setBusy(true);
    try { setExtras(await extrasApi.set(taskId, typeId || null, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v || null])))); onChanged?.(); }
    catch { /* the API layer already showed the reason */ }
    finally { setBusy(false); }
  }

  const hasExtras = !!extras && (extras.fields.length > 0 || types.length > 0);
  return (
    <div className="mt-4 text-sm space-y-3">
      {hasExtras && (
        <div className="space-y-2">
          {types.length > 0 && (
            <div className="flex items-center gap-2"><span className="w-28 text-slate-500">نوع فعالیت</span>
              <Select className="border rounded-lg px-2 py-1 min-w-48" disabled={!canEdit} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                <option value="">بدون نوع</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select></div>
          )}
          {extras!.fields.map((fl) => (
            <div key={fl.fieldId} className="flex items-center gap-2"><span className="w-28 text-slate-500">{fl.name}{fl.isRequired && ' *'}</span>
              {fl.kind === 'Choice' ? <Select className="border rounded-lg px-2 py-1 min-w-48" disabled={!canEdit} value={values[fl.fieldId] ?? ''} onChange={(e) => setValues({ ...values, [fl.fieldId]: e.target.value })}><option value="">—</option>{fl.options.map((o) => <option key={o} value={o}>{o}</option>)}</Select>
                : fl.kind === 'Boolean' ? <Segmented value={values[fl.fieldId] ?? ''} disabled={!canEdit} onChange={(v) => setValues({ ...values, [fl.fieldId]: v })} options={[{ value: 'true', label: 'بله' }, { value: 'false', label: 'خیر' }]} />
                : fl.kind === 'Date' ? <DateInput className="border rounded-lg px-2 py-1" disabled={!canEdit} value={values[fl.fieldId] ?? ''} onChange={(e) => setValues({ ...values, [fl.fieldId]: e.target.value })} />
                : <input type={fl.kind === 'Number' ? 'number' : 'text'} className="border rounded-lg px-2 py-1 w-48" disabled={!canEdit} value={values[fl.fieldId] ?? ''} onChange={(e) => setValues({ ...values, [fl.fieldId]: e.target.value })} />}
            </div>
          ))}
          {canEdit && <button disabled={busy} className="rounded-lg border px-3 py-1 disabled:opacity-50" onClick={save}>ذخیره نوع و فیلدها</button>}
        </div>
      )}
      {canEdit && <button className="rounded-lg border px-3 py-1" onClick={() => setHandoff(true)}>تحویل به فرد یا تیم دیگر</button>}
      {handoff && <HandoffDialog taskId={taskId} onClose={() => setHandoff(false)} onDone={() => { setHandoff(false); onChanged?.(); }} />}
    </div>
  );
}

function HandoffDialog({ taskId, onClose, onDone }: { taskId: string; onClose: () => void; onDone: () => void }) {
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [toUser, setToUser] = useState('');
  const [toGroup, setToGroup] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { listUsers().then(setUsers).catch(() => {}); listGroups().then(setGroups).catch(() => {}); }, []);

  async function send() {
    setBusy(true);
    try { await extrasApi.handoff(taskId, { toUserId: toUser || null, toGroupId: toGroup || null, note: note.trim() }); notify('success', 'وظیفه تحویل داده شد.'); onDone(); }
    catch { /* shown by the API layer */ }
    finally { setBusy(false); }
  }

  return (
    <Modal title="تحویل وظیفه" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-slate-500 mb-1">تحویل به فرد</div><Select className="w-full border rounded-lg px-2 py-1.5" value={toUser} onChange={(e) => setToUser(e.target.value)}><option value="">بدون تغییر</option>{users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}</Select></div>
          <div><div className="text-slate-500 mb-1">تحویل به تیم</div><Select className="w-full border rounded-lg px-2 py-1.5" value={toGroup} onChange={(e) => setToGroup(e.target.value)}><option value="">بدون تغییر</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></div>
        </div>
        <label className="block">توضیح تحویل<textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="چه کاری انجام شده و گیرنده چه باید بکند؟" /></label>
        <div className="flex justify-end gap-2">
          <button className="rounded-lg border px-4 py-1.5" onClick={onClose}>انصراف</button>
          <button disabled={busy || !note.trim() || (!toUser && !toGroup)} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50" onClick={send}>تحویل</button>
        </div>
      </div>
    </Modal>
  );
}
