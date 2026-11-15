import { Component, type ReactNode } from 'react';

/** If a screen breaks while drawing, the person sees a Persian message and a way out, not a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="card p-8 space-y-4 max-w-sm">
          <div className="text-4xl">⚠️</div>
          <h1 className="font-bold text-lg">مشکلی در نمایش صفحه پیش آمد</h1>
          <p className="text-sm text-slate-500">صفحه را دوباره بارگذاری کنید. اگر مشکل ادامه داشت، به مدیر سامانه خبر دهید.</p>
          <button className="rounded-2xl bg-blue-600 text-white px-5 py-2.5 text-sm font-semibold" onClick={() => location.reload()}>بارگذاری دوباره</button>
        </div>
      </div>
    );
  }
}
