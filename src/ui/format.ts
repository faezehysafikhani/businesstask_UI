// Shared display helpers: Persian digits everywhere, Jalali dates always zero-padded (1405/08/23).
import { showJalali } from './dates';

const FA = '۰۱۲۳۴۵۶۷۸۹';
export const toFaDigits = (s: string | number) => String(s).replace(/\d/g, (d) => FA[+d]);
export const toLatinDigits = (s: string) => s.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
export const formatNumber = (n: number) => n.toLocaleString('fa-IR', { useGrouping: false });
export const formatJalaliDate = (iso?: string | null) => (iso ? showJalali(iso.slice(0, 10)) : '—');
/** Date and time as one bidi-isolated string (so it does not scramble inside Persian text). */
export const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `⁦${showJalali(d.toISOString().slice(0, 10))} ${toFaDigits(hm)}⁩`;
};
/** Normalise for search: Arabic/Persian letter variants, digits, spaces. */
export const norm = (s: string) => toLatinDigits(s).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\s‌]+/g, ' ').trim().toLowerCase();
