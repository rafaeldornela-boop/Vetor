import React, { useState, useEffect, useRef } from 'react';
import { getDailyInsight } from '../constants';
import { PracticeFeedback, ScreenName, VetorData } from '../types';
import {
  getAppNotificationPermission,
  getNotificationPermission,
  getRandomTimeBetween,
  isNotificationSupported,
  requestNotificationPermission,
  sendLocalNotification,
  NotificationStatus,
} from '../utils/notifications';
import { registerModalCloser } from '../utils/modalRegistry';
import { makeId, today } from '../utils/format';

interface HojeScreenProps {
  data: VetorData;
  onUpdateData: (updater: (prev: VetorData) => VetorData) => boolean;
  onNavigate: (screen: ScreenName) => void;
  showToast: (msg: string) => void;
  initialTask?: string;
  onClearInitialTask?: () => void;
}

export const HojeScreen: React.FC<HojeScreenProps> = ({
  data,
  onUpdateData,
  onNavigate,
  showToast,
  initialTask,
  onClearInitialTask,
}) => {
  const todayDate = today();
  const dailyInsight = React.useMemo(() => getDailyInsight(todayDate), [todayDate]);

  // Primary action name
  const [taskName, setTaskName] = useState<string>(
    initialTask || '5 minutos de ativação'
  );
  const [isEditingTask, setIsEditingTask] = useState<boolean>(false);

  // Reminder state
  const [notificationPerm, setNotificationPerm] = useState<NotificationStatus>('default');
  const [showReminderConfig, setShowReminderConfig] = useState<boolean>(false);

  useEffect(() => {
    getAppNotificationPermission().then(setNotificationPerm);
  }, []);

  useEffect(() => {
    if (!showReminderConfig) return;
    return registerModalCloser(() => {
      setShowReminderConfig(false);
      return true;
    });
  }, [showReminderConfig]);

  const reminderEnabled = Boolean(data.settings.reminderEnabled);
  const reminderMode = data.settings.reminderMode || 'fixed';
  const reminderTime = data.settings.reminderTime || '09:00';
  const reminderWindowStart = data.settings.reminderWindowStart || '09:00';
  const reminderWindowEnd = data.settings.reminderWindowEnd || '21:00';
  const randomReminderTimeToday = data.settings.randomReminderTimeToday || '';
  const reminderText = data.settings.reminderText || 'Um momento para respirar e cuidar do próximo passo possível.';

  const handleToggleReminder = async () => {
    if (!isNotificationSupported()) {
      showToast('Notificações não são suportadas por este navegador.');
      return;
    }

    if (reminderEnabled) {
      onUpdateData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          reminderEnabled: false,
        },
      }));
      showToast('Lembrete diário desativado.');
    } else {
      const currentPerm = getNotificationPermission();
      let permToUse = currentPerm;

      if (currentPerm === 'default') {
        permToUse = await requestNotificationPermission();
        setNotificationPerm(permToUse);
      }

      if (permToUse === 'granted') {
        let initialRandom = randomReminderTimeToday;
        if (reminderMode === 'random' && !initialRandom) {
          initialRandom = getRandomTimeBetween(reminderWindowStart, reminderWindowEnd);
        }

        onUpdateData((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            reminderEnabled: true,
            randomReminderTimeToday: initialRandom || prev.settings.randomReminderTimeToday,
            randomReminderDate: todayDate,
          },
        }));

        const activeDesc =
          reminderMode === 'random'
            ? `em horário surpresa entre ${reminderWindowStart} e ${reminderWindowEnd}`
            : `para as ${reminderTime}`;
        showToast(`Lembrete diário ativado ${activeDesc}.`);
      } else if (permToUse === 'denied') {
        showToast('As notificações estão bloqueadas nas configurações do navegador.');
      } else {
        showToast('Permissão de notificação não concedida.');
      }
    }
  };

  const handleToggleMode = (mode: 'fixed' | 'random') => {
    let randomTime = randomReminderTimeToday;
    if (mode === 'random' && (!randomTime || data.settings.randomReminderDate !== todayDate)) {
      randomTime = getRandomTimeBetween(reminderWindowStart, reminderWindowEnd);
    }
    onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        reminderMode: mode,
        randomReminderTimeToday: randomTime,
        randomReminderDate: todayDate,
      },
    }));
    showToast(
      mode === 'random'
        ? `Modo aleatório ativado: horário surpresa mantido entre ${reminderWindowStart} e ${reminderWindowEnd}.`
        : `Modo horário fixo: lembrete programado para as ${reminderTime}.`
    );
  };

  const handleTimeChange = (time: string) => {
    onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        reminderTime: time,
      },
    }));
  };

  const handleWindowStartChange = (start: string) => {
    const newRandom = getRandomTimeBetween(start, reminderWindowEnd);
    onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        reminderWindowStart: start,
        randomReminderTimeToday: newRandom,
        randomReminderDate: todayDate,
      },
    }));
  };

  const handleWindowEndChange = (end: string) => {
    const newRandom = getRandomTimeBetween(reminderWindowStart, end);
    onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        reminderWindowEnd: end,
        randomReminderTimeToday: newRandom,
        randomReminderDate: todayDate,
      },
    }));
  };

  const handleRegenerateRandom = () => {
    const newRandom = getRandomTimeBetween(reminderWindowStart, reminderWindowEnd);
    onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        randomReminderTimeToday: newRandom,
        randomReminderDate: todayDate,
      },
    }));
    showToast('Novo momento surpresa sorteado em segredo para hoje.');
  };

  const handleTextChange = (text: string) => {
    onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        reminderText: text,
      },
    }));
  };

  const handleTestNotification = async () => {
    if (!isNotificationSupported()) {
      showToast('Notificações não suportadas neste navegador.');
      return;
    }

    let perm = getNotificationPermission();
    if (perm === 'default') {
      perm = await requestNotificationPermission();
      setNotificationPerm(perm);
    }

    if (perm === 'granted') {
      const ok = sendLocalNotification(
        'Vetor · Teste de Lembrete',
        reminderText || 'Um momento para respirar e cuidar do próximo passo possível.'
      );
      if (ok) {
        showToast('Notificação local disparada com sucesso!');
      } else {
        showToast('Não foi possível disparar a notificação.');
      }
    } else if (perm === 'denied') {
      showToast('Permissão bloqueada. Ative as notificações no navegador.');
    } else {
      showToast('Permissão para notificações não foi aceita.');
    }
  };

  // 5-minute Action Timer
  const [timerRemaining, setTimerRemaining] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerEndsAtRef = useRef<number | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Handle task passed from other screens
  useEffect(() => {
    if (initialTask) {
      setTaskName(initialTask);
      setIsEditingTask(false);
      if (onClearInitialTask) onClearInitialTask();
    }
  }, [initialTask, onClearInitialTask]);

  // Greeting
  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Timer interval with real timestamp tracking (immune to screen locks and tab idling)
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      if (timerEndsAtRef.current) {
        const remaining = Math.max(0, (timerEndsAtRef.current - Date.now()) / 1000);
        setTimerRemaining(remaining);
        if (remaining <= 0) {
          setIsTimerRunning(false);
          timerEndsAtRef.current = null;
          if (navigator.vibrate) {
            try {
              navigator.vibrate([120, 70, 120]);
            } catch {
              // ignore
            }
          }
          showToast('Os 5 minutos terminaram. Bom trabalho por iniciar!');
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isTimerRunning, showToast]);

  const handleStartTimer = () => {
    if (isTimerRunning) {
      // Pause
      if (timerEndsAtRef.current) {
        setTimerRemaining(Math.max(0, (timerEndsAtRef.current - Date.now()) / 1000));
      }
      setIsTimerRunning(false);
      timerEndsAtRef.current = null;
    } else {
      // Start or Resume
      const secs = timerRemaining <= 0 ? 300 : timerRemaining;
      setTimerRemaining(secs);
      timerEndsAtRef.current = Date.now() + secs * 1000;
      setIsTimerRunning(true);
      showToast('Cronômetro de 5 minutos iniciado.');
    }
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    timerEndsAtRef.current = null;
    setTimerRemaining(300);
  };

  const [recentCompletedActivityId, setRecentCompletedActivityId] = useState<string | null>(null);

  const handleCompleteAction = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const currentTask = taskName.trim() || 'Ação de 5 minutos';
    const elapsed = 300 - Math.ceil(timerRemaining);
    const newId = makeId();

    onUpdateData((prev) => ({
      ...prev,
      activities: [
        {
          id: newId,
          date: todayDate,
          createdAt: Date.now(),
          task: currentTask,
          mastery: 4,
          pleasure: 3,
          timerStarted: elapsed > 0 ? elapsed : 300,
        },
        ...prev.activities,
      ].slice(0, 300),
    }));

    handleResetTimer();
    setRecentCompletedActivityId(newId);
    showToast('Ação registrada com sucesso no seu dia!');

    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 400);
  };

  const handleRateActivity = (activityId: string, feedback: PracticeFeedback) => {
    onUpdateData((prev) => ({
      ...prev,
      activities: prev.activities.map((a) =>
        a.id === activityId ? { ...a, feedback } : a
      ),
    }));
    setRecentCompletedActivityId(null);
    showToast('Retorno registrado com sucesso.');
  };

  const formattedTimer = React.useMemo(() => {
    const s = Math.max(0, Math.ceil(timerRemaining));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timerRemaining]);

  // Daily stats summary
  const todayActivitiesCount = data.activities.filter(
    (a) => a.date === todayDate
  ).length;

  const hasThoughtDraft = React.useMemo(() => {
    const draft = data.thoughtDraft || {};
    return Object.values(draft).some((v) => String(v ?? '').trim().length > 0);
  }, [data.thoughtDraft]);

  return (
    <section className="screen active" id="screen-hoje" aria-labelledby="title-hoje">
      {/* 1. Brief Greeting */}
      <div className="intro" style={{ marginBottom: '14px' }}>
        <div className="eyebrow" id="greeting">
          {greeting}
        </div>
        <h1 id="title-hoje" style={{ fontSize: '1.65rem', lineHeight: 1.25, margin: '4px 0 6px' }}>
          Comece pelo próximo passo possível.
        </h1>
        <p className="sub" style={{ fontSize: '.88rem', margin: 0 }}>
          Sem precisar resolver tudo. Cinco minutos bastam para iniciar o movimento.
        </p>
      </div>

      <div className="stack">
        {/* Daily Insight Card - Comforting, zero cognitive load, 24h refresh */}
        <div
          className="card"
          style={{
            background: '#faf9f6',
            border: '1px solid #ebe6dc',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '11px',
          }}
        >
          <span style={{ fontSize: '1.15rem', lineHeight: 1 }} aria-hidden="true">
            🕯️
          </span>
          <div style={{ flex: 1 }}>
            <span
              className="eyebrow"
              style={{
                fontSize: '.66rem',
                color: 'var(--sand-ink)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                display: 'block',
                marginBottom: '2px',
              }}
            >
              Reflexão do dia · {dailyInsight.theme}
            </span>
            <p style={{ margin: 0, fontSize: '.85rem', fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.4 }}>
              “{dailyInsight.text}”
            </p>
          </div>
        </div>

        {/* 2. Main Daily Practice Summary & 3. Quick Action Button */}
        <article className="card feature" style={{ padding: '20px' }}>
          <div className="card-head" style={{ marginBottom: '12px' }}>
            <div>
              <span className="mini-tag" style={{ background: 'var(--green-soft)', color: 'var(--green-dark)', fontWeight: 700 }}>
                Prática principal de hoje
              </span>
              <h2 style={{ fontSize: '1.22rem', marginTop: '8px', marginBottom: '4px' }}>
                {isEditingTask ? (
                  <input
                    type="text"
                    maxLength={100}
                    value={taskName}
                    autoFocus
                    placeholder="Nome da sua microação"
                    onChange={(e) => setTaskName(e.target.value)}
                    onBlur={() => setIsEditingTask(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingTask(false);
                    }}
                    style={{ fontSize: '1.05rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px' }}
                  />
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {taskName}
                    <button
                      type="button"
                      className="inline-link"
                      style={{ fontSize: '.76rem', fontWeight: 500 }}
                      onClick={() => setIsEditingTask(true)}
                    >
                      Alterar
                    </button>
                  </span>
                )}
              </h2>
              <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--muted)' }}>
                Uma ação pequena e delimitada para vencer a inércia, sem esperar vontade ou perfeição.
              </p>
            </div>
            <div className="feature-icon" aria-hidden="true" style={{ fontSize: '1.9rem' }}>
              🌱
            </div>
          </div>

          {/* Clean Timer Display */}
          <div
            className="timer"
            id="actionTimer"
            style={{
              fontSize: '3.1rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '10px 0 4px',
              color: isTimerRunning ? 'var(--green-dark)' : 'var(--ink)',
            }}
          >
            {formattedTimer}
          </div>
          <p
            className="hint"
            style={{ textAlign: 'center', margin: '0 0 16px', fontSize: '.84rem' }}
          >
            {isTimerRunning
              ? 'Concentre-se apenas nesta ação. Se for demais, faça só um minuto.'
              : 'Cinco minutos cronometrados para dar o primeiro passo.'}
          </p>

          {/* Quick Action Button & Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '8px' }}>
            <button
              className="btn btn-primary btn-full"
              type="button"
              id="actionTimerBtn"
              style={{ fontSize: '.92rem', padding: '12px 14px', minHeight: '48px', fontWeight: 700 }}
              onClick={handleStartTimer}
            >
              {isTimerRunning
                ? 'Ⅱ Pausar'
                : timerRemaining < 300 && timerRemaining > 0
                ? '▶ Retomar'
                : '▶ Iniciar 5 minutos'}
            </button>

            {timerRemaining < 300 ? (
              <button
                className="btn btn-soft btn-full"
                type="button"
                style={{ fontSize: '.92rem', padding: '12px 14px', minHeight: '48px', fontWeight: 700 }}
                onClick={handleCompleteAction}
              >
                ✓ Concluir ação
              </button>
            ) : (
              <button
                className="btn btn-plain btn-full"
                type="button"
                style={{ fontSize: '.92rem', padding: '12px 14px', minHeight: '48px' }}
                onClick={() => setIsEditingTask(!isEditingTask)}
              >
                Definir foco
              </button>
            )}
          </div>

          {timerRemaining < 300 && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                type="button"
                className="inline-link"
                style={{ fontSize: '.76rem', color: 'var(--muted)' }}
                onClick={handleResetTimer}
              >
                Reiniciar cronômetro
              </button>
            </div>
          )}

          {/* Discrete 3-option feedback after action completion */}
          {recentCompletedActivityId && (
            <div
              style={{
                marginTop: '14px',
                padding: '13px 15px',
                background: 'var(--green-soft)',
                borderRadius: '15px',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ fontSize: '.86rem', color: 'var(--green-dark)' }}>
                  Essa ação de 5 minutos ajudou você agora?
                </strong>
                <button
                  type="button"
                  className="inline-link"
                  style={{ fontSize: '.76rem' }}
                  onClick={() => setRecentCompletedActivityId(null)}
                >
                  Agora não
                </button>
              </div>
              <p className="hint" style={{ marginBottom: '8px', fontSize: '.78rem' }}>
                Retorno voluntário. Ajuda a notar com o tempo o que tem mais utilidade para o seu ritmo.
              </p>
              <div className="btn-row" style={{ marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => handleRateActivity(recentCompletedActivityId, 'helped')}
                >
                  🌿 Ajudou
                </button>
                <button
                  type="button"
                  className="btn btn-plain btn-small"
                  onClick={() => handleRateActivity(recentCompletedActivityId, 'partial')}
                >
                  ⚖️ Parcialmente
                </button>
                <button
                  type="button"
                  className="btn btn-plain btn-small"
                  onClick={() => handleRateActivity(recentCompletedActivityId, 'not_helped')}
                >
                  🌧️ Não ajudou
                </button>
              </div>
            </div>
          )}

          {/* Subtle Daily Activity Confirmation */}
          {todayActivitiesCount > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                ✓ {todayActivitiesCount} ação{todayActivitiesCount > 1 ? 'ões' : ''} registrada{todayActivitiesCount > 1 ? 's' : ''} hoje
              </span>
              <button
                type="button"
                className="inline-link"
                style={{ fontSize: '.78rem' }}
                onClick={() => onNavigate('progresso')}
              >
                Ver histórico
              </button>
            </div>
          )}
        </article>

        {/* Daily Reminder Card (Local Notification API, Offline, Configurable) */}
        <article className="card" style={{ padding: '15px 18px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => setShowReminderConfig(!showReminderConfig)}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '.92rem' }}>🔔 Lembrete de autocuidado</strong>
                <span
                  className="mini-tag"
                  style={{
                    background: reminderEnabled ? 'var(--green-soft)' : 'var(--paper)',
                    color: reminderEnabled ? 'var(--green-dark)' : 'var(--muted)',
                    border: '1px solid var(--line)',
                    fontWeight: 700,
                  }}
                >
                  {reminderEnabled
                    ? reminderMode === 'random'
                      ? `🎲 Aleatório (${reminderWindowStart} – ${reminderWindowEnd})`
                      : `✓ Ativo às ${reminderTime}`
                    : 'Desativado'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                {reminderEnabled
                  ? reminderMode === 'random'
                    ? `Momento surpresa mantido em segredo entre ${reminderWindowStart} e ${reminderWindowEnd}.`
                    : `Notificação local programada para ${reminderTime}.`
                  : 'Receba um aviso no horário ou intervalo que preferir.'}
              </p>
            </div>
            <button
              className="btn btn-plain btn-small"
              type="button"
              style={{ fontSize: '.78rem', padding: '6px 12px' }}
            >
              {showReminderConfig ? 'Recolher ▲' : 'Configurar ▼'}
            </button>
          </div>

          {showReminderConfig && (
            <div style={{ marginTop: '14px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '.86rem', fontWeight: 700 }}>
                  Receber lembrete diário:
                </span>
                <button
                  type="button"
                  className={`btn btn-small ${reminderEnabled ? 'btn-primary' : 'btn-plain'}`}
                  onClick={handleToggleReminder}
                >
                  {reminderEnabled ? '✓ Ativado' : 'Ativar lembrete'}
                </button>
              </div>

              {notificationPerm === 'denied' && (
                <div className="notice" style={{ marginBottom: '12px', fontSize: '.82rem' }}>
                  <strong>Notificações bloqueadas no navegador:</strong>
                  Para receber o lembrete, permita notificações nas configurações do seu navegador ou clique no cadeado da barra de endereços.
                </div>
              )}

              {/* Mode Selection: Fixed vs Random */}
              <div className="field">
                <label>Modo de disparo</label>
                <div className="segmented-control" role="group" aria-label="Modo de disparo do lembrete" style={{ marginBottom: '8px' }}>
                  <button
                    type="button"
                    className={reminderMode === 'fixed' ? 'active' : ''}
                    onClick={() => handleToggleMode('fixed')}
                  >
                    ⏰ Horário fixo
                  </button>
                  <button
                    type="button"
                    className={reminderMode === 'random' ? 'active' : ''}
                    onClick={() => handleToggleMode('random')}
                  >
                    🎲 Modo aleatório (janela)
                  </button>
                </div>
              </div>

              {/* Fixed Mode View */}
              {reminderMode === 'fixed' ? (
                <div className="field">
                  <label htmlFor="reminderTimeInput">Horário da notificação</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      id="reminderTimeInput"
                      type="time"
                      value={reminderTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      style={{ maxWidth: '140px', minHeight: '42px', fontWeight: 700 }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-plain btn-small"
                        style={{ fontSize: '.75rem', minHeight: '36px', padding: '4px 8px' }}
                        onClick={() => handleTimeChange('08:00')}
                      >
                        08:00
                      </button>
                      <button
                        type="button"
                        className="btn btn-plain btn-small"
                        style={{ fontSize: '.75rem', minHeight: '36px', padding: '4px 8px' }}
                        onClick={() => handleTimeChange('14:00')}
                      >
                        14:00
                      </button>
                      <button
                        type="button"
                        className="btn btn-plain btn-small"
                        style={{ fontSize: '.75rem', minHeight: '36px', padding: '4px 8px' }}
                        onClick={() => handleTimeChange('20:00')}
                      >
                        20:00
                      </button>
                    </div>
                  </div>
                  <p className="hint" style={{ marginTop: '4px' }}>
                    O lembrete chegará todos os dias exatamente no horário configurado.
                  </p>
                </div>
              ) : (
                /* Random Mode View */
                <div className="field">
                  <label>Janela de horário permitida</label>
                  <p className="hint" style={{ margin: '0 0 8px', fontSize: '.8rem' }}>
                    Defina o período do seu dia em que o lembrete pode acontecer. O app sorteará um momento surpresa dentro desse intervalo a cada dia.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 130px' }}>
                      <span style={{ fontSize: '.84rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Entre as</span>
                      <input
                        id="reminderStartInput"
                        type="time"
                        value={reminderWindowStart}
                        onChange={(e) => handleWindowStartChange(e.target.value)}
                        style={{ width: '100%', maxWidth: '140px', minHeight: '44px', fontSize: '16px', fontWeight: 700 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 130px' }}>
                      <span style={{ fontSize: '.84rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>e as</span>
                      <input
                        id="reminderEndInput"
                        type="time"
                        value={reminderWindowEnd}
                        onChange={(e) => handleWindowEndChange(e.target.value)}
                        style={{ width: '100%', maxWidth: '140px', minHeight: '44px', fontSize: '16px', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  {/* Random surprise preview without revealing the exact time */}
                  <div
                    style={{
                      background: 'var(--paper)',
                      border: '1px solid var(--line)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '.78rem', color: 'var(--muted)', display: 'block' }}>
                        Momento surpresa diário:
                      </span>
                      <strong style={{ fontSize: '.92rem', color: 'var(--green-dark)' }}>
                        ✓ Sorteado e mantido em segredo para hoje
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="btn btn-plain btn-small"
                      style={{ fontSize: '.76rem', padding: '4px 10px' }}
                      onClick={handleRegenerateRandom}
                    >
                      🎲 Sortear novo momento
                    </button>
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="reminderTextInput">Mensagem da notificação</label>
                <input
                  id="reminderTextInput"
                  type="text"
                  maxLength={120}
                  value={reminderText}
                  placeholder="Ex.: Um momento para respirar e cuidar do próximo passo possível."
                  onChange={(e) => handleTextChange(e.target.value)}
                  style={{ minHeight: '44px', fontSize: '.86rem' }}
                />
              </div>

              <div className="btn-row" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-soft btn-small"
                  onClick={handleTestNotification}
                >
                  🔔 Testar notificação agora
                </button>
              </div>

              <p className="hint" style={{ marginTop: '10px', fontSize: '.76rem' }}>
                Totalmente local e offline: nenhuma informação sai do seu aparelho. A notificação é disparada pelo navegador sem depender de servidores externos.
              </p>
            </div>
          )}
        </article>

        {/* Quiet Reassurance */}
        <p style={{ textAlign: 'center', fontSize: '.8rem', color: 'var(--muted)', margin: '4px 0 16px' }}>
          Faça uma versão menor quando estiver difícil. Um dia ruim não apaga o que você já construiu.
        </p>
      </div>
    </section>
  );
};
