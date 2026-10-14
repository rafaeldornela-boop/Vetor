import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScreenName, VetorData } from './types';
import { createInitialData } from './constants';
import { loadStoredData, persistData } from './utils/storage';
import { Topbar } from './components/Topbar';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
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

  return (
    <div className="app-container">
      <Topbar />

      <main className="main-content">
        {!isStorageOk && (
          <div className="storage-warning" id="storageWarning" role="status">
            O navegador não permitiu salvar os dados neste modo de abertura. Eles podem desaparecer ao fechar a página. Para uso contínuo, publique o arquivo em um endereço HTTPS que você controle.
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
