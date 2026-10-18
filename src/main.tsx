/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';

// Registra o Service Worker offline no navegador (quando em produção e fora do aplicativo nativo)
// sem apagar caches indiscriminadamente ou forçar chamadas de rede desnecessárias.
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[Vetor SW] Falha ao registrar Service Worker:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
