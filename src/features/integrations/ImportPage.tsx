import { useState } from 'react';
import { importApi, type ImportRow } from '../../api/tasks';

const SAMPLE = 'title,dueDate,priority,assignee,description,tags\nگزارش فصلی,2030-03-01,High,,توضیح،,مالی;فصلی\n';

// Import tasks from a CSV: paste it (or load a file), look at the preview row by row, then import. Nothing is made before you confirm.
export function ImportPage() {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<{ total: number; valid: number; invalid: number; rows: ImportRow[] } | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function act(fn: () => Promise<void>) { setError(''); setResult(''); try { await fn(); } catch (e) { setError((e as Error).message); } }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-xl font-bold">ورود وظایف از CSV</h1>
      <p className="text-sm text-slate-500">سطر اول نام ستون‌هاست: <code dir="ltr">title, dueDate</code> الزامی و <code dir="ltr">priority, assignee, description, tags</code> اختیاری. تاریخ به شکل <code dir="ltr">yyyy-MM-dd</code>؛ مسئول با نام کاربری؛ برچسب‌ها با ; جدا می‌شوند. تا ۵۰۰ سطر.</p>
      <div className="flex gap-2 text-sm">
        <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => e.target.files?.[0]?.text().then((t) => { setCsv(t); setPreview(null); })} />
        <button className="underline" onClick={() => { setCsv(SAMPLE); setPreview(null); }}>نمونه</button>
      </div>
      <textarea className="w-full border rounded-lg p-2 text-sm font-mono" dir="ltr" rows={8} value={csv} onChange={(e) => { setCsv(e.target.value); setPreview(null); }} placeholder="title,dueDate,priority&#10;..." />
      <div className="flex gap-2">
        <button disabled={!csv.trim()} className="rounded-lg border px-4 py-1.5 text-sm disabled:opacity-50" onClick={() => act(async () => setPreview(await importApi.preview(csv)))}>پیش‌نمایش</button>
        {preview && preview.valid > 0 && <button className="rounded-lg bg-green-600 text-white px-4 py-1.5 text-sm" onClick={() => act(async () => { const r = await importApi.run(csv, true); setResult(`${r.created} وظیفه ساخته شد${r.skipped ? `؛ ${r.skipped} سطر انجام نشد` : ''}`); setPreview(null); })}>ورود {preview.valid} سطر معتبر</button>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="text-sm text-green-700">{result}</p>}
      {preview && (
        <div className="space-y-2">
          <p className="text-sm">{preview.total} سطر · <span className="text-green-700">{preview.valid} معتبر</span> · <span className="text-red-600">{preview.invalid} دارای خطا</span></p>
          <table className="w-full text-sm bg-white rounded-xl border overflow-hidden">
            <thead className="bg-slate-50 text-slate-500"><tr>{['سطر', 'عنوان', 'سررسید', 'اولویت', 'مسئول', 'وضعیت'].map((h) => <th key={h} className="text-start px-3 py-2 font-normal">{h}</th>)}</tr></thead>
            <tbody>{preview.rows.map((r) => (
              <tr key={r.line} className="border-t"><td className="px-3 py-1.5">{r.line}</td><td className="px-3 py-1.5">{r.title}</td><td className="px-3 py-1.5">{r.dueDate}</td><td className="px-3 py-1.5">{r.priority}</td><td className="px-3 py-1.5">{r.assignee}</td>
                <td className={`px-3 py-1.5 ${r.valid ? 'text-green-600' : 'text-red-600'}`}>{r.valid ? 'درست' : r.errors.join('؛ ')}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
