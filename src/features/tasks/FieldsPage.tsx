import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { fieldsApi, workTypesApi, type CustomField, type FieldKind, type WorkType } from '../../api/tasks';
import { askConfirm } from '../../ui/dialog';
import { Segmented } from '../../ui/fields';

const KINDS: { value: FieldKind; label: string }[] = [
  { value: 'Text', label: 'متن' }, { value: 'Number', label: 'عدد' }, { value: 'Date', label: 'تاریخ' }, { value: 'Choice', label: 'انتخابی' }, { value: 'Boolean', label: 'بله/خیر' },
];
const kindLabel = (k: FieldKind) => KINDS.find((x) => x.value === k)?.label ?? k;

// Work types (a label like «باگ») and custom fields (extra data like «شماره قرارداد») the organization adds to every task.
export function FieldsPage() {
  const [types, setTypes] = useState<WorkType[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [typeName, setTypeName] = useState('');
  const [typeColor, setTypeColor] = useState('#2563eb');
  const [f, setF] = useState<{ name: string; kind: FieldKind; options: string; isRequired: boolean }>({ name: '', kind: 'Text', options: '', isRequired: false });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    workTypesApi.list().then(setTypes).catch((e) => setError(e.message));
    fieldsApi.list().then(setFields).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  async function act(fn: () => Promise<unknown>) { setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); } }

  function addType(e: FormEvent) {
    e.preventDefault();
    act(async () => { await workTypesApi.save(null, { name: typeName.trim(), color: typeColor, sortOrder: types.length + 1 }); setTypeName(''); });
  }
  function addField(e: FormEvent) {
    e.preventDefault();
    act(async () => {
      await fieldsApi.save(null, { name: f.name.trim(), kind: f.kind, options: f.kind === 'Choice' ? f.options.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean) : undefined, isRequired: f.isRequired, sortOrder: fields.length + 1 });
      setF({ name: '', kind: 'Text', options: '', isRequired: false });
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold">نوع فعالیت و فیلدهای سفارشی</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-2">
        <h2 className="font-medium">نوع فعالیت</h2>
        <p className="text-sm text-slate-500">برچسبی که روی هر وظیفه می‌نشیند (مثلاً باگ، درخواست تغییر). قاعده‌های خودکار می‌توانند بر اساس آن وظیفه را به یک تیم بدهند.</p>
        <form onSubmit={addType} className="flex gap-2 items-center text-sm">
          <input className="border rounded-lg px-3 py-1.5 flex-1" aria-label="نام نوع فعالیت" placeholder="نام نوع فعالیت" value={typeName} onChange={(e) => setTypeName(e.target.value)} />
          <input type="color" aria-label="رنگ" value={typeColor} onChange={(e) => setTypeColor(e.target.value)} className="h-8 w-8" />
          <button disabled={!typeName.trim()} className="rounded-lg bg-blue-600 text-white px-3 py-1.5 disabled:opacity-50">افزودن</button>
        </form>
        <ul className="bg-white rounded-xl border divide-y text-sm">
          {types.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2">
              <span className="size-3 rounded-full" style={{ background: t.color ?? '#94a3b8' }} />
              <span className={t.isActive ? '' : 'line-through text-slate-400'}>{t.name}</span>
              <button className="ms-auto text-xs underline" onClick={() => act(() => workTypesApi.save(t.id, { name: t.name, color: t.color, sortOrder: t.sortOrder, isActive: !t.isActive }))}>{t.isActive ? 'غیرفعال' : 'فعال'}</button>
              <button title="حذف" className="p-1 hover:text-red-600" onClick={async () => (await askConfirm('حذف شود؟ وظایف این نوع فقط برچسبشان را از دست می‌دهند.')) && act(() => workTypesApi.remove(t.id))}><Trash2 size={16} /></button>
            </li>
          ))}
          {types.length === 0 && <li className="px-3 py-5 text-center text-slate-400">نوعی تعریف نشده است</li>}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">فیلدهای سفارشی</h2>
        <form onSubmit={addField} className="bg-white rounded-xl border p-3 space-y-2 text-sm">
          <div className="flex gap-2 items-center">
            <input className="border rounded-lg px-3 py-1.5 flex-1" aria-label="نام فیلد (مثلاً شماره قرارداد)" placeholder="نام فیلد (مثلاً شماره قرارداد)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Segmented value={f.kind} onChange={(kind) => setF({ ...f, kind })} options={KINDS} />
          </div>
          {f.kind === 'Choice' && <input className="border rounded-lg px-3 py-1.5 w-full" aria-label="گزینه‌ها را با ویرگول جدا کنید (دست‌کم دو گزینه)" placeholder="گزینه‌ها را با ویرگول جدا کنید (دست‌کم دو گزینه)" value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} />}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.isRequired} onChange={(e) => setF({ ...f, isRequired: e.target.checked })} />اجباری</label>
            <button disabled={!f.name.trim()} className="ms-auto rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">افزودن فیلد</button>
          </div>
        </form>
        <ul className="bg-white rounded-xl border divide-y text-sm">
          {fields.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-3 py-2">
              <span className={x.isActive ? 'font-medium' : 'line-through text-slate-400'}>{x.name}</span>
              <span className="text-xs text-slate-500">{kindLabel(x.kind)}{x.kind === 'Choice' ? `: ${x.options.join('، ')}` : ''}</span>
              {x.isRequired && <span className="text-xs rounded-full bg-amber-50 text-amber-700 px-2">اجباری</span>}
              <button className="ms-auto text-xs underline" onClick={() => act(() => fieldsApi.save(x.id, { name: x.name, kind: x.kind, options: x.options, isRequired: x.isRequired, sortOrder: x.sortOrder, isActive: !x.isActive }))}>{x.isActive ? 'غیرفعال' : 'فعال'}</button>
              <button title="حذف" className="p-1 hover:text-red-600" onClick={async () => (await askConfirm('فیلد و مقدارهایی که وظایف برایش دارند حذف شود؟')) && act(() => fieldsApi.remove(x.id))}><Trash2 size={16} /></button>
            </li>
          ))}
          {fields.length === 0 && <li className="px-3 py-5 text-center text-slate-400">فیلدی تعریف نشده است</li>}
        </ul>
      </section>
    </div>
  );
}
