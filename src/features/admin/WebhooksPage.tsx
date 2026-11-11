import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { webhooksApi } from '../../api/tasks';
import type { Webhook, WebhookDelivery } from '../../api/types';

const EVENT_LABEL: Record<string, string> = { 'task.created': 'ساخته شدن وظیفه', 'task.status_changed': 'تغییر وضعیت', 'task.completed': 'انجام شدن وظیفه', 'task.archived': 'بایگانی وظیفه', 'task.review_decided': 'تصمیم بازبینی' };

// Outgoing webhooks: tell another system (Zapier, n8n, your own) when something happens. Each delivery is signed with the secret.
export function WebhooksPage() {
  const [list, setList] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [f, setF] = useState({ name: '', url: '', events: [] as string[] });
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const [open, setOpen] = useState<{ id: string; rows: WebhookDelivery[] } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { webhooksApi.list().then(setList).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); webhooksApi.events().then(setEvents).catch(() => {}); }, [load]);

  async function act(fn: () => Promise<unknown>) { setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); } }
  function create(e: FormEvent) {
    e.preventDefault();
    act(async () => { const r = await webhooksApi.create({ name: f.name.trim(), url: f.url.trim(), events: f.events }); setSecret({ name: r.webhook.name, value: r.secret }); setF({ name: '', url: '', events: [] }); });
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">وب‌هوک‌ها</h1>
      <p className="text-sm text-slate-500">هر رویداد با امضای HMAC-SHA256 (هدر <code dir="ltr">X-TM-Signature</code>) به نشانی شما POST می‌شود. فقط آدرس‌های https عمومی مجازند.</p>
      {secret && <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">کلید امضای «{secret.name}» (فقط همین یک‌بار نمایش داده می‌شود): <code dir="ltr" className="select-all break-all">{secret.value}</code> <button className="underline ms-2" onClick={() => setSecret(null)}>بستن</button></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="bg-white rounded-xl border divide-y text-sm">
        {list.map((w) => (
          <li key={w.id} className="p-3 space-y-1">
            <div className="flex items-center gap-2"><span className={`font-medium ${w.isActive ? '' : 'line-through text-slate-400'}`}>{w.name}</span>
              <span className="text-xs text-slate-400" dir="ltr">{w.url}</span>
              {w.consecutiveFailures > 0 && <span className="text-xs text-red-600">{w.consecutiveFailures} شکست پیاپی</span>}
              <button title="حذف" className="ms-auto p-1 hover:text-red-600" onClick={() => confirm('حذف شود؟') && act(() => webhooksApi.remove(w.id))}><Trash2 size={16} /></button></div>
            <div className="text-xs text-slate-500">{w.events[0] === '*' ? 'همه رویدادها' : w.events.map((e) => EVENT_LABEL[e] ?? e).join('، ')}</div>
            <div className="flex gap-3 text-xs">
              <button className="underline" onClick={() => act(() => webhooksApi.update(w.id, { name: w.name, url: w.url, events: w.events, isActive: !w.isActive }))}>{w.isActive ? 'غیرفعال' : 'فعال'}</button>
              <button className="underline" onClick={() => act(() => webhooksApi.ping(w.id))}>ارسال آزمایشی</button>
              <button className="underline" onClick={() => confirm('کلید قبلی از کار می‌افتد. ادامه؟') && act(async () => { const r = await webhooksApi.rotate(w.id); setSecret({ name: w.name, value: r.secret }); })}>کلید جدید</button>
              <button className="underline" onClick={() => webhooksApi.deliveries(w.id).then((rows) => setOpen(open?.id === w.id ? null : { id: w.id, rows })).catch((e) => setError(e.message))}>گزارش ارسال</button>
            </div>
            {open?.id === w.id && (
              <ul className="text-xs border rounded-lg divide-y mt-1">
                {open.rows.map((d) => <li key={d.id} className="px-2 py-1 flex gap-2"><span>{EVENT_LABEL[d.eventType] ?? d.eventType}</span>
                  <span className={d.delivered ? 'text-green-600' : d.gaveUp ? 'text-red-600' : 'text-amber-600'}>{d.delivered ? 'ارسال شد' : d.gaveUp ? 'رها شد' : 'در صف تلاش'}</span>
                  <span className="text-slate-400">{d.attempts} تلاش {d.lastStatusCode ? `· ${d.lastStatusCode}` : ''} {d.lastError ?? ''}</span><span className="ms-auto text-slate-400">{new Date(d.createdAtUtc).toLocaleString('fa-IR')}</span></li>)}
                {open.rows.length === 0 && <li className="px-2 py-3 text-center text-slate-400">هنوز ارسالی نبوده</li>}
              </ul>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-center text-slate-400">وب‌هوکی تعریف نشده است</li>}
      </ul>
      <form onSubmit={create} className="bg-white rounded-xl border p-3 space-y-2 text-sm">
        <h2 className="font-medium">وب‌هوک جدید</h2>
        <div className="flex gap-2"><input className="w-40 border rounded-lg px-2 py-1" placeholder="نام" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="flex-1 border rounded-lg px-2 py-1" dir="ltr" placeholder="https://…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></div>
        <div className="flex flex-wrap gap-2 items-center"><span className="text-slate-500">رویدادها (هیچ‌کدام = همه):</span>
          {events.map((ev) => <label key={ev} className="flex items-center gap-1 border rounded-full px-2 py-0.5"><input type="checkbox" checked={f.events.includes(ev)} onChange={(e) => setF({ ...f, events: e.target.checked ? [...f.events, ev] : f.events.filter((x) => x !== ev) })} />{EVENT_LABEL[ev] ?? ev}</label>)}</div>
        <button disabled={!f.name.trim() || !f.url.trim()} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">افزودن</button>
      </form>
    </div>
  );
}
