import { useEffect, useRef, useState } from 'react';

// Questions the site asks inside its own pop-up (never the browser's confirm / prompt boxes).
interface Ask { id: number; kind: 'confirm' | 'prompt'; message: string; value: string; danger: boolean; resolve: (v: boolean | string | null) => void }
type Listener = (a: Ask) => void;
let listener: Listener | null = null;
let seq = 0;

function open(kind: Ask['kind'], message: string, value = '', danger = false) {
  return new Promise<boolean | string | null>((resolve) => {
    if (!listener) { resolve(kind === 'confirm' ? false : null); return; }
    listener({ id: ++seq, kind, message, value, danger, resolve });
  });
}

/** Yes / no. Delete-like questions look red. */
export const askConfirm = (message: string, danger = /حذف|لغو|غیرفعال|خروج/.test(message)) => open('confirm', message, '', danger) as Promise<boolean>;
/** A line of text; null when cancelled. */
export const askText = (message: string, value = '') => open('prompt', message, value) as Promise<string | null>;

export function DialogHost() {
  const [queue, setQueue] = useState<Ask[]>([]);
  useEffect(() => { listener = (a) => setQueue((q) => [...q, a]); return () => { listener = null; }; }, []);
  const a = queue[0];
  const [text, setText] = useState('');
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (a) { setText(a.value); setTimeout(() => field.current?.focus(), 0); } }, [a]);
  if (!a) return null;
  const done = (v: boolean | string | null) => { a.resolve(v); setQueue((q) => q.slice(1)); };
  const ok = () => done(a.kind === 'confirm' ? true : text);
  const cancel = () => done(a.kind === 'confirm' ? false : null);
  return (
    <div className="fixed inset-0 z-[120] backdrop grid place-items-center p-4" onClick={cancel}
      onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}>
      <div role="dialog" aria-modal className="bg-white rounded-[22px] w-full max-w-sm p-5 space-y-4 shadow-[0_30px_80px_rgba(30,20,100,.35)]" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm leading-7">{a.message}</p>
        {a.kind === 'prompt' && <input ref={field} className="w-full border rounded-lg px-3 py-2 text-sm" value={text} autoComplete="off" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ok()} />}
        <div className="flex justify-end gap-2 text-sm">
          <button className="rounded-xl border px-4 py-1.5" onClick={cancel}>انصراف</button>
          <button autoFocus={a.kind === 'confirm'} className={`rounded-xl text-white px-4 py-1.5 ${a.danger ? 'bg-red-600' : 'bg-blue-600'}`} onClick={ok}>{a.danger ? 'بله، انجام شود' : 'تأیید'}</button>
        </div>
      </div>
    </div>
  );
}
