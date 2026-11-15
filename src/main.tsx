import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { Toaster } from './ui/toast';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { notify } from './ui/toast';
import { statusMessage } from './api/messages';
import { DialogHost } from './ui/dialog';
import { PrefsProvider } from './shell/prefs';

// A failure nobody caught (not one the host answered, those are shown where they happen).
window.addEventListener('unhandledrejection', (e) => { if (!(e.reason && 'status' in e.reason)) notify('error', statusMessage(0)); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <PrefsProvider>
        <AuthProvider>
          <App />
          <Toaster />
          <DialogHost />
        </AuthProvider>
      </PrefsProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
