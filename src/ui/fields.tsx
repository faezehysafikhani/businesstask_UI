import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export interface Opt { value: string; label: string; disabled?: boolean }

/** Label buttons for a few fixed choices (priority, type, ...): one click, no list to open. */
export function Segmented<T extends string | number>({ value, onChange, options, disabled, className = '' }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; disabled?: boolean; className?: string }) {
  return (
    <div role="radiogroup" className={`inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1 ${className}`}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={o.value === value} key={String(o.value)} disabled={disabled} onClick={() => onChange(o.value)}
          className={`px-3.5 py-1.5 rounded-xl text-sm transition ${o.value === value ? 'nav-active' : 'text-slate-600 hover:bg-white'} disabled:opacity-60`}>{o.label}</button>
      ))}
    </div>
  );
}

// <option> children of a Select, read as plain data (fragments and arrays included).
function optionsOf(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  const walk = (nodes: ReactNode) => Children.forEach(nodes, (c) => {
    if (!isValidElement(c)) return;
    const el = c as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>;
    if (el.type === Fragment) walk(el.props.children);
    else if (el.type === 'option') out.push({ value: String(el.props.value ?? textOf(el.props.children)), label: textOf(el.props.children), disabled: el.props.disabled });
  });
  walk(children);
  return out;
}
const textOf = (n: ReactNode): string => (Array.isArray(n) ? n.map(textOf).join('') : typeof n === 'string' || typeof n === 'number' ? String(n) : '');

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, close]);
  return ref;
}

function List({ options, selected, onPick, search }: { options: Opt[]; selected: (v: string) => boolean; onPick: (v: string) => void; search: boolean }) {
  const [q, setQ] = useState('');
  const shown = options.filter((o) => !q.trim() || o.label.includes(q.trim()));
  return (
    <div className="card absolute z-[95] top-full mt-1 inset-x-0 p-1.5 text-sm">
      {search && <input autoFocus autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…" className="w-full border rounded-lg px-2 py-1 mb-1 bg-transparent" />}
      <ul className="max-h-56 overflow-y-auto">
        {shown.map((o) => (
          <li key={o.value}>
            <button type="button" disabled={o.disabled} onClick={() => onPick(o.value)} className="w-full flex items-center gap-2 text-start px-2 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-50">
              <span className="w-4">{selected(o.value) && <Check size={14} className="text-blue-600" />}</span>{o.label}
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="px-2 py-3 text-center text-slate-400">موردی نیست</li>}
      </ul>
    </div>
  );
}

/** A dropdown for lists that can grow (people, units, tasks): searchable, same props as a plain <select>. */
export function Select({ value, onChange, className = '', disabled, children }: { value: string; onChange: (e: { target: { value: string } }) => void; className?: string; disabled?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const options = optionsOf(children);
  const current = options.find((o) => o.value === String(value ?? ''));
  const width = className.match(/\b(flex-1|w-full|w-\d+|min-w-\d+)\b/g)?.join(' ') ?? '';
  return (
    <div ref={ref} className={`relative inline-block ${width}`}>
      <button type="button" disabled={disabled} onClick={() => setOpen(!open)} className={`${className} w-full flex items-center justify-between gap-2 text-start bg-white disabled:opacity-60`}>
        <span className={`truncate ${current && current.value !== '' ? '' : 'text-slate-400'}`}>{current?.label || 'انتخاب…'}</span><ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>
      {open && <List options={options} search={options.length > 7} selected={(v) => v === String(value ?? '')} onPick={(v) => { onChange({ target: { value: v } }); setOpen(false); }} />}
    </div>
  );
}

/** Pick several from a list that can grow; the picked ones show as removable tags. */
export function MultiSelect({ value, onChange, options, disabled, placeholder = 'افزودن…' }: { value: string[]; onChange: (v: string[]) => void; options: Opt[]; disabled?: boolean; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 border rounded-lg px-2 py-1.5 min-h-10 bg-white cursor-pointer" onClick={() => !disabled && setOpen(true)}>
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">
            {options.find((o) => o.value === v)?.label ?? v}
            {!disabled && <button type="button" aria-label="حذف" onClick={(e) => { e.stopPropagation(); toggle(v); }}><X size={12} /></button>}
          </span>
        ))}
        {value.length === 0 && <span className="text-slate-400 text-sm">{placeholder}</span>}
        <ChevronDown size={14} className="ms-auto text-slate-400" />
      </div>
      {open && <List options={options} search selected={(v) => value.includes(v)} onPick={toggle} />}
    </div>
  );
}
