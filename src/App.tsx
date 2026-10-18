import React, { useState, useEffect, useCallback, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { ScreenName, VetorData } from './types';
import { createInitialData } from './constants';
import { loadStoredData, persistData } from './utils/storage';
import { Topbar } from './components/Topbar';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import {
  getNotificationPermission,
  getRandomTimeBetween,
  sendLocalNotification,
  isNativePlatform,
  syncNativeReminders,
} from './utils/notifications';
import { closeTopmostModal } from './utils/modalRegistry';
import { today } from './utils/format';
import { HojeScreen } from './screens/HojeScreen';
import { AcalmarScreen } from './screens/AcalmarScreen';
import { PraticasScreen } from './screens/PraticasScreen';
import { PensamentosScreen } from './screens/PensamentosScreen';
import { AudiosScreen } from './screens/AudiosScreen';
import { ProgressoScreen } from './screens/ProgressoScreen';

export const App: React.FC = () => {
  const [data, setData] = useState<VetorData>(createInitialData);
  const [isStorageOk, setIsStorageOk] = useState<boolean>(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('hoje');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingHojeTask, setPendingHojeTask] = useState<string | undefined>(undefined);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const { data: initial, available } = loadStoredData();
    setData(initial);
    setIsStorageOk(available);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  const handleUpdateData = useCallback(
    (updater: (prev: VetorData) => VetorData): boolean => {
      let saved = false;
      setData((prev) => {
        const next = updater(prev);
        saved = persistData(next);
        if (!saved) {
          setIsStorageOk(false);
        }
        return next;
      });
      return saved;
    },
    []
  );

  const handleResetData = useCallback(() => {
    const initial = createInitialData();
    setData(initial);
  }, []);

  const handleNavigate = useCallback((screen: ScreenName) => {
    setCurrentScreen(screen);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, []);

  // Theme management ('light' | 'dark' | 'system')
  const currentTheme = data.settings.theme || 'system';

  useEffect(() => {
    const root = document.documentElement;
    const apply = (theme: 'light' | 'dark' | 'system') => {
      let resolved: 'light' | 'dark' = 'light';
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }
      root.setAttribute('data-theme', resolved);
      root.style.colorScheme = resolved;
    };

    apply(currentTheme);

    if (currentTheme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => apply('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [currentTheme]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme: 'light' | 'dark' | 'system' =
      currentTheme === 'system' ? 'light' : currentTheme === 'light' ? 'dark' : 'system';

    handleUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: nextTheme,
      },
    }));

    showToast(
      nextTheme === 'dark'
        ? 'Tema escuro ativado.'
        : nextTheme === 'light'
        ? 'Tema claro ativado.'
        : 'Tema ajustado para seguir o sistema.'
    );
  }, [currentTheme, handleUpdateData, showToast]);

  // Native Android notifications synchronization
  useEffect(() => {
    syncNativeReminders(data.settings);
  }, [data.settings]);

  // Android hardware back button handler
  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanupListener: (() => void) | undefined;

    CapApp.addListener('backButton', () => {
      // 1. Fechar primeiro o modal aberto, se houver
      const modalClosed = closeTopmostModal();
      if (modalClosed) return;

      // 2. Retornar à tela Hoje quando estiver em outra aba
      if (currentScreen !== 'hoje') {
        handleNavigate('hoje');
        return;
      }

      // 3. Se já estiver na tela Hoje, minimizar o aplicativo em vez de encerrar abruptamente
      CapApp.minimizeApp();
    }).then((sub) => {
      cleanupListener = () => sub.remove();
    });

    return () => {
      if (cleanupListener) cleanupListener();
    };
  }, [currentScreen, handleNavigate]);

  // Periodic offline check for scheduled daily reminder (Web fallback only)
  useEffect(() => {
    if (isNativePlatform() || !data.settings.reminderEnabled) return;

    const checkReminder = () => {
      const permission = getNotificationPermission();
      if (permission !== 'granted') return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      const todayDate = today();

      const mode = data.settings.reminderMode || 'fixed';
      let targetTime = data.settings.reminderTime || '09:00';

      if (mode === 'random') {
        if (
          !data.settings.randomReminderTimeToday ||
          data.settings.randomReminderDate !== todayDate
        ) {
          const generatedTime = getRandomTimeBetween(
            data.settings.reminderWindowStart || '09:00',
            data.settings.reminderWindowEnd || '21:00'
          );
          targetTime = generatedTime;
          handleUpdateData((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              randomReminderTimeToday: generatedTime,
              randomReminderDate: todayDate,
            },
          }));
        } else {
          targetTime = data.settings.randomReminderTimeToday;
        }
      }

      if (currentTime === targetTime && data.settings.lastReminderDate !== todayDate) {
        sendLocalNotification(
          'Vetor · Pausa de Autocuidado',
          data.settings.reminderText || 'Um momento para respirar e cuidar do próximo passo possível.'
        );
        handleUpdateData((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            lastReminderDate: todayDate,
          },
        }));
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 30000);
    return () => clearInterval(interval);
  }, [
    data.settings.reminderEnabled,
    data.settings.reminderMode,
    data.settings.reminderTime,
    data.settings.reminderWindowStart,
    data.settings.reminderWindowEnd,
    data.settings.randomReminderTimeToday,
    data.settings.randomReminderDate,
    data.settings.reminderText,
    data.settings.lastReminderDate,
    handleUpdateData,
  ]);

  return (
    <div className="app-container">
      <Topbar theme={currentTheme} onToggleTheme={handleToggleTheme} />

      <main className="main-content">
        {!isStorageOk && (
          <div className="storage-warning" id="storageWarning" role="status">
            O armazenamento local não permitiu gravar dados permanentemente neste modo. Para garantir a persistência dos seus registros, instale o aplicativo ou acesse por um navegador comum.
          </div>
        )}

        {currentScreen === 'hoje' && (
          <HojeScreen
            data={data}
            onUpdateData={handleUpdateData}
            onNavigate={handleNavigate}
            showToast={showToast}
            initialTask={pendingHojeTask}
            onClearInitialTask={() => setPendingHojeTask(undefined)}
          />
        )}

        {currentScreen === 'acalmar' && (
          <AcalmarScreen
            data={data}
            onUpdateData={handleUpdateData}
            onNavigate={handleNavigate}
            showToast={showToast}
            onSetHojeTask={(task) => setPendingHojeTask(task)}
          />
        )}

        {currentScreen === 'praticas' && (
          <PraticasScreen
            data={data}
            onUpdateData={handleUpdateData}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentScreen === 'pensamentos' && (
          <PensamentosScreen
            data={data}
            onUpdateData={handleUpdateData}
            showToast={showToast}
          />
        )}

        {currentScreen === 'audios' && <AudiosScreen />}

        {currentScreen === 'progresso' && (
          <ProgressoScreen
            data={data}
            onUpdateData={handleUpdateData}
            onResetData={handleResetData}
            showToast={showToast}
          />
        )}

        <div className="footer-note">
          Vetor · autocuidado em pequenos passos · seus dias não precisam ser perfeitos para valerem.
        </div>
      </main>

      <BottomNav currentScreen={currentScreen} onSelectScreen={handleNavigate} />
      <Toast message={toastMessage} />
    </div>
  );
};

export default App;
