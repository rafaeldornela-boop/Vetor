import React, { useState, useEffect, useRef } from 'react';
import { HABITS, MICRO_CHOICES } from '../constants';
import { ScreenName, VetorData } from '../types';
import { formatTime, makeId, today } from '../utils/format';

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
  const [selectedMicro, setSelectedMicro] = useState<string | null>(null);
  const [taskInput, setTaskInput] = useState<string>('');
  const [mastery, setMastery] = useState<number>(3);
  const [pleasure, setPleasure] = useState<number>(3);

  // Checkin states
  const todayDate = today();
  const existingCheckin = data.checkins.find((c) => c.date === todayDate);
  const [mood, setMood] = useState<number>(existingCheckin ? existingCheckin.mood : 3);
  const [anxiety, setAnxiety] = useState<number>(existingCheckin ? existingCheckin.anxiety : 3);
  const [checkinSavedHint, setCheckinSavedHint] = useState<string>(
    existingCheckin
      ? `Check-in salvo hoje${existingCheckin.updatedAt ? ` às ${formatTime(existingCheckin.updatedAt)}` : ''}. Você pode atualizá-lo.`
      : 'Você pode atualizar o registro durante o dia.'
  );

  // Timer states (5 minutes = 300 seconds)
  const [timerRemaining, setTimerRemaining] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerCaption, setTimerCaption] = useState<string>('Cinco minutos. Sem precisar fazer perfeito.');
  const timerEndsAtRef = useRef<number | null>(null);

  // Handle initial task if passed from Worry redirect
  useEffect(() => {
    if (initialTask) {
      setTaskInput(initialTask);
      setSelectedMicro(null);
      if (onClearInitialTask) onClearInitialTask();
    }
  }, [initialTask, onClearInitialTask]);

  // Greeting
  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia. Comece pelo possível.';
    if (h < 18) return 'Um passo de cada vez.';
    return 'Boa noite. Você também merece cuidado.';
  }, []);

  // Timer Interval
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      if (timerEndsAtRef.current) {
        const remaining = Math.max(0, (timerEndsAtRef.current - Date.now()) / 1000);
        setTimerRemaining(remaining);
        if (remaining <= 0) {
          setIsTimerRunning(false);
          timerEndsAtRef.current = null;
          setTimerCaption('Terminou. Você pode registrar a tentativa ou repetir.');
          if (navigator.vibrate) {
            try {
              navigator.vibrate([120, 70, 120]);
            } catch {
              // ignore
            }
          }
          showToast('Os 5 minutos terminaram. Registre a tentativa.');
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
      setTimerCaption('Pausado. Retome quando estiver pronto.');
    } else {
      // Start or Resume
      const secs = timerRemaining <= 0 ? 300 : timerRemaining;
      setTimerRemaining(secs);
      timerEndsAtRef.current = Date.now() + secs * 1000;
      setIsTimerRunning(true);
      setTimerCaption('Faça só o que der para fazer neste momento.');
    }
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    timerEndsAtRef.current = null;
    setTimerRemaining(300);
    setTimerCaption('Cinco minutos. Sem precisar fazer perfeito.');
  };

  const formattedTimer = React.useMemo(() => {
    const s = Math.max(0, Math.ceil(timerRemaining));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timerRemaining]);

  const timerButtonLabel = React.useMemo(() => {
    if (isTimerRunning) return 'Ⅱ Pausar';
    if (timerRemaining <= 0) return '✓ Tempo concluído';
    if (timerRemaining < 300) return '▶ Retomar';
    return '▶ Começar';
  }, [isTimerRunning, timerRemaining]);

  // Micro choice click
  const handleMicroChoice = (task: string) => {
    if (selectedMicro === task) {
      setSelectedMicro(null);
      setTaskInput('');
    } else {
      setSelectedMicro(task);
      setTaskInput(task);
    }
  };

  // Save activity
  const handleSaveActivity = () => {
    const trimmed = taskInput.trim();
    if (!trimmed) {
      showToast('Escreva ou escolha uma pequena ação primeiro.');
      return;
    }

    const saved = onUpdateData((prev) => {
      const newActivity = {
        id: makeId(),
        date: todayDate,
        createdAt: Date.now(),
        task: trimmed,
        mastery,
        pleasure,
        timerStarted: 300 - Math.ceil(timerRemaining),
      };
      return {
        ...prev,
        activities: [newActivity, ...prev.activities].slice(0, 300),
      };
    });

    setTaskInput('');
    setSelectedMicro(null);
    showToast(
      saved
        ? 'Ação registrada.'
        : 'Ação registrada apenas nesta sessão; o navegador não permitiu salvar os dados.'
    );
  };

  // Save check-in
  const handleSaveCheckin = () => {
    const now = Date.now();
    const entry = {
      date: todayDate,
      mood,
      anxiety,
      updatedAt: now,
    };

    const saved = onUpdateData((prev) => {
      const existingIdx = prev.checkins.findIndex((c) => c.date === todayDate);
      let updatedCheckins = [...prev.checkins];
      if (existingIdx >= 0) {
        updatedCheckins[existingIdx] = entry;
      } else {
        updatedCheckins.unshift(entry);
      }
      updatedCheckins.sort((a, b) => b.date.localeCompare(a.date));
      return {
        ...prev,
        checkins: updatedCheckins.slice(0, 120),
      };
    });

    setCheckinSavedHint(
      saved
        ? `Check-in salvo às ${formatTime(now)}. Você pode atualizá-lo mais tarde.`
        : 'Registro mantido apenas nesta sessão; o navegador não permitiu armazenamento permanente.'
    );
    showToast(
      saved
        ? 'Check-in salvo.'
        : 'Check-in disponível apenas enquanto esta página estiver aberta.'
    );
  };

  // Habits
  const todayHabits = data.habits[todayDate] || {};
  const completedHabitsCount = HABITS.filter((h) => todayHabits[h.id]).length;

  const handleToggleHabit = (habitId: string) => {
    const currentChecked = !!todayHabits[habitId];
    const saved = onUpdateData((prev) => {
      const currentDay = prev.habits[todayDate] || {};
      return {
        ...prev,
        habits: {
          ...prev.habits,
          [todayDate]: {
            ...currentDay,
            [habitId]: !currentChecked,
          },
        },
      };
    });
    if (!saved) {
      showToast('Hábito marcado apenas nesta sessão; armazenamento indisponível.');
    }
  };

  // Check if thought draft exists
  const hasThoughtDraft = React.useMemo(() => {
    const draft = data.thoughtDraft || {};
    return Object.values(draft).some((v) => String(v ?? '').trim().length > 0);
  }, [data.thoughtDraft]);

  return (
    <section className="screen active" id="screen-hoje" aria-labelledby="title-hoje">
      <div className="intro">
        <div className="eyebrow" id="greeting">
          {greeting}
        </div>
        <h1 id="title-hoje">Você não precisa resolver tudo hoje.</h1>
        <p className="sub">
          Cuide do próximo passo possível. Pequeno, concreto e suficiente para começar.
        </p>
      </div>

      <div className="stack">
        {/* 5-Min Action Card */}
        <article className="card feature">
          <div className="card-head">
            <div>
              <div className="eyebrow">Seu ponto de partida</div>
              <h2>Qual é o próximo passo de 5 minutos?</h2>
              <p>Não espere a vontade aparecer. Escolha algo pequeno e veja como se sente depois.</p>
            </div>
            <div className="feature-icon" aria-hidden="true">
              🌱
            </div>
          </div>

          <div className="micro" id="microChoices">
            {MICRO_CHOICES.map((choice) => {
              const isSelected = selectedMicro === choice.task;
              return (
                <button
                  key={choice.task}
                  className={`micro-btn ${isSelected ? 'selected' : ''}`}
                  type="button"
                  onClick={() => handleMicroChoice(choice.task)}
                >
                  <span className="micro-emoji">{choice.emoji}</span>
                  <span>{choice.title}</span>
                </button>
              );
            })}
          </div>

          <div className="field">
            <label htmlFor="taskInput">Sua ação de agora</label>
            <input
              id="taskInput"
              type="text"
              maxLength={180}
              placeholder="Ex.: tomar banho, caminhar, responder uma mensagem"
              value={taskInput}
              onChange={(e) => {
                setTaskInput(e.target.value);
                if (selectedMicro && e.target.value !== selectedMicro) {
                  setSelectedMicro(null);
                }
              }}
            />
          </div>

          <div className="timer" id="actionTimer" aria-live="off">
            {formattedTimer}
          </div>
          <div className="timer-caption" id="actionTimerCaption">
            {timerCaption}
          </div>

          <div className="split">
            <button
              className="btn btn-primary btn-full"
              type="button"
              id="actionTimerBtn"
              onClick={handleStartTimer}
            >
              {timerButtonLabel}
            </button>
            <button
              className="btn btn-plain btn-full"
              type="button"
              id="actionResetBtn"
              onClick={handleResetTimer}
            >
              Zerar
            </button>
          </div>

          <div className="split" style={{ marginTop: '14px' }}>
            <div className="rating-box">
              <div className="range-top">
                <label htmlFor="masteryRange">Senso de realização</label>
                <span className="range-value" id="masteryVal">
                  {mastery}/5
                </span>
              </div>
              <input
                id="masteryRange"
                type="range"
                min="1"
                max="5"
                value={mastery}
                onChange={(e) => setMastery(Number(e.target.value))}
              />
              <div className="scale-note">
                <span>Baixo</span>
                <span>Alto</span>
              </div>
            </div>

            <div className="rating-box">
              <div className="range-top">
                <label htmlFor="pleasureRange">Prazer</label>
                <span className="range-value" id="pleasureVal">
                  {pleasure}/5
                </span>
              </div>
              <input
                id="pleasureRange"
                type="range"
                min="1"
                max="5"
                value={pleasure}
                onChange={(e) => setPleasure(Number(e.target.value))}
              />
              <div className="scale-note">
                <span>Baixo</span>
                <span>Alto</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-soft btn-full"
            type="button"
            id="saveActivityBtn"
            style={{ marginTop: '12px' }}
            onClick={handleSaveActivity}
          >
            ✓ Registrar minha ação
          </button>
          <p className="hint" style={{ marginTop: '8px' }}>
            O registro conta a tentativa, não a perfeição. Se cinco minutos forem demais, reduza para um.
          </p>
        </article>

        {/* Quick Check-in */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Check-in rápido</h2>
              <p>Não é uma nota sobre você. É só um retrato de agora.</p>
            </div>
            <span className="tag">30 segundos</span>
          </div>

          <div className="field">
            <div className="range-top">
              <label htmlFor="moodRange">Como está seu ânimo?</label>
              <span className="range-value" id="moodVal">
                {mood}/5
              </span>
            </div>
            <input
              id="moodRange"
              type="range"
              min="1"
              max="5"
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
            />
            <div className="scale-note">
              <span>1 · Muito baixo</span>
              <span>5 · Muito bom</span>
            </div>
          </div>

          <div className="field">
            <div className="range-top">
              <label htmlFor="anxietyRange">Quanto pesa a ansiedade?</label>
              <span className="range-value" id="anxietyVal">
                {anxiety}/5
              </span>
            </div>
            <input
              id="anxietyRange"
              type="range"
              min="1"
              max="5"
              value={anxiety}
              onChange={(e) => setAnxiety(Number(e.target.value))}
            />
            <div className="scale-note">
              <span>1 · Pouca</span>
              <span>5 · Muito intensa</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            type="button"
            id="saveCheckinBtn"
            onClick={handleSaveCheckin}
          >
            Salvar check-in de hoje
          </button>
          <p className="hint" id="checkinSavedHint" style={{ marginTop: '8px' }}>
            {checkinSavedHint}
          </p>
        </article>

        {/* Base Habits */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Hábitos de base</h2>
              <p>Escolha o que é viável hoje; não precisa marcar tudo.</p>
            </div>
            <span className="tag" id="habitCountTag">
              {completedHabitsCount}/{HABITS.length} feitos
            </span>
          </div>

          <div className="habit-list" id="habitList">
            {HABITS.map((h) => {
              const isChecked = !!todayHabits[h.id];
              return (
                <label
                  key={h.id}
                  className={`habit ${isChecked ? 'checked' : ''}`}
                  onClick={() => handleToggleHabit(h.id)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // handled by label onClick
                    aria-label={h.label}
                  />
                  <span aria-hidden="true">{h.icon}</span>
                  <span>{h.label}</span>
                </label>
              );
            })}
          </div>
          <p className="hint" style={{ marginTop: '10px' }}>
            São lembretes de cuidado, não obrigações nem substitutos de orientação médica.
          </p>
        </article>

        {/* Other Spaces Navigation */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Outros espaços do Vetor</h2>
              <p>Escolha apenas o que for útil agora.</p>
            </div>
          </div>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => onNavigate('acalmar')}
            >
              Acalmar agora
            </button>
            <button
              className="btn btn-soft"
              type="button"
              onClick={() => onNavigate('praticas')}
            >
              Práticas cotidianas
            </button>
            <button
              className="btn btn-soft"
              type="button"
              onClick={() => onNavigate('audios')}
            >
              Áudios e sons
            </button>
            {hasThoughtDraft && (
              <button
                className="btn btn-plain"
                type="button"
                id="resumeThoughtBtn"
                onClick={() => onNavigate('pensamentos')}
              >
                Retomar rascunho
              </button>
            )}
            <button
              className="btn btn-plain"
              type="button"
              onClick={() => onNavigate('pensamentos')}
            >
              Novo registro de pensamento
            </button>
          </div>
        </article>

        {/* Notice for tough days */}
        <div className="notice">
          <strong>Uma regra para dias difíceis</strong>
          Faça uma versão menor, peça apoio ou descanse quando necessário. Um dia ruim não apaga o que você já construiu.
        </div>
      </div>
    </section>
  );
};
