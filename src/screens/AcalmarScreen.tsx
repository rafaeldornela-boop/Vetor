import React, { useState, useEffect, useRef } from 'react';
import { ROUTINE_ANCHORS } from '../constants';
import { PracticeFeedback, ScreenName, VetorData } from '../types';
import { makeId, today } from '../utils/format';

interface AcalmarScreenProps {
  data: VetorData;
  onUpdateData: (updater: (prev: VetorData) => VetorData) => boolean;
  onNavigate: (screen: ScreenName) => void;
  showToast: (msg: string) => void;
  onSetHojeTask?: (task: string) => void;
}

export type AcalmarView =
  | 'grid'
  | 'respiracao'
  | 'ancoragem'
  | 'relaxamento'
  | 'redirecionar'
  | 'preocupacoes'
  | 'pausa_ambiente'
  | 'preventiva'
  | 'estimulo_frio';

const BREATH_TOTAL = 300; // 5 minutes

export const AcalmarScreen: React.FC<AcalmarScreenProps> = ({
  data,
  onUpdateData,
  onNavigate,
  showToast,
  onSetHojeTask,
}) => {
  const [activeView, setActiveView] = useState<AcalmarView>('grid');

  // Voluntary Feedback state
  const [recentCompletedPracticeId, setRecentCompletedPracticeId] = useState<string | null>(null);
  const [recentCompletedPracticeType, setRecentCompletedPracticeType] = useState<'practice' | 'activity' | null>(null);

  const handleRatePractice = (feedback: PracticeFeedback) => {
    if (!recentCompletedPracticeId) return;
    if (recentCompletedPracticeType === 'practice') {
      onUpdateData((prev) => ({
        ...prev,
        practices: prev.practices.map((p) =>
          p.id === recentCompletedPracticeId ? { ...p, feedback } : p
        ),
      }));
    } else {
      onUpdateData((prev) => ({
        ...prev,
        activities: prev.activities.map((a) =>
          a.id === recentCompletedPracticeId ? { ...a, feedback } : a
        ),
      }));
    }
    setRecentCompletedPracticeId(null);
    setRecentCompletedPracticeType(null);
    showToast('Retorno registrado com sucesso.');
  };

  const recordPractice = (label: string, anchor = '', notify = true) => {
    const newId = makeId();
    const saved = onUpdateData((prev) => ({
      ...prev,
      practices: [
        {
          id: newId,
          date: today(),
          createdAt: Date.now(),
          label,
          anchor: anchor || (label === 'Respiração preventiva' ? (prev.settings.practiceAnchor || '') : ''),
        },
        ...prev.practices,
      ].slice(0, 300),
    }));
    setRecentCompletedPracticeId(newId);
    setRecentCompletedPracticeType('practice');
    if (notify) {
      showToast(
        saved
          ? 'Prática registrada no histórico.'
          : 'Prática anotada apenas nesta sessão; armazenamento indisponível.'
      );
    }
    return saved;
  };

  // ==========================================
  // 1. RESPIRAÇÃO SUAVE (Shared Respiratory Engine)
  // ==========================================
  const [breathStartedAt, setBreathStartedAt] = useState<number | null>(null);
  const [breathElapsedBefore, setBreathElapsedBefore] = useState<number>(0);
  const [isBreathRunning, setIsBreathRunning] = useState<boolean>(false);
  const [breathMode, setBreathMode] = useState<'regular' | 'diaphragm'>('regular');
  const [hasPause, setHasPause] = useState<boolean>(false);
  const [currentElapsed, setCurrentElapsed] = useState<number>(0);
  const [breathLabelPrefix, setBreathLabelPrefix] = useState<string>('Respiração suave');

  const getBreathElapsed = () => {
    return breathElapsedBefore + (breathStartedAt ? (Date.now() - breathStartedAt) / 1000 : 0);
  };

  useEffect(() => {
    if (!isBreathRunning) return;
    const interval = setInterval(() => {
      const elapsed = getBreathElapsed();
      setCurrentElapsed(elapsed);
      if (elapsed >= BREATH_TOTAL) {
        setIsBreathRunning(false);
        setBreathStartedAt(null);
        setBreathElapsedBefore(BREATH_TOTAL);
        recordPractice(
          breathLabelPrefix || (breathMode === 'diaphragm' ? 'Respiração diafragmática' : 'Respiração suave')
        );
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isBreathRunning, breathStartedAt, breathElapsedBefore, breathMode, breathLabelPrefix]);

  const handleToggleBreath = () => {
    if (isBreathRunning) {
      setBreathElapsedBefore(getBreathElapsed());
      setBreathStartedAt(null);
      setIsBreathRunning(false);
    } else {
      if (breathElapsedBefore >= BREATH_TOTAL) {
        setBreathElapsedBefore(0);
        setCurrentElapsed(0);
      }
      setBreathStartedAt(Date.now());
      setIsBreathRunning(true);
    }
  };

  const handleResetBreath = () => {
    setIsBreathRunning(false);
    setBreathStartedAt(null);
    setBreathElapsedBefore(0);
    setCurrentElapsed(0);
  };

  const handleConcludeBreath = () => {
    setIsBreathRunning(false);
    setBreathStartedAt(null);
    setBreathElapsedBefore(0);
    setCurrentElapsed(0);
    recordPractice(
      breathLabelPrefix || (breathMode === 'diaphragm' ? 'Respiração diafragmática' : 'Respiração suave')
    );
  };

  // Breathing Visual Cycle
  const breathCycleLength = hasPause ? 11 : 10;
  const breathCycle = currentElapsed % breathCycleLength;

  let circleClass = 'breath-circle';
  let instruction = 'Pronto para começar';
  let subInstruction = 'Sem pressa. Se sentir tontura, volte ao ritmo natural.';

  if (isBreathRunning) {
    if (breathCycle < 4) {
      circleClass = 'breath-circle inhale';
      instruction = 'Inspire suavemente';
      subInstruction =
        breathMode === 'diaphragm' ? 'Observe o abdômen expandir, sem forçar' : 'Pelo nariz, se confortável';
    } else if (hasPause && breathCycle < 5) {
      circleClass = 'breath-circle';
      instruction = 'Transição breve';
      subInstruction = 'Sem prender o ar à força';
    } else {
      circleClass = 'breath-circle exhale';
      instruction = 'Solte o ar';
      subInstruction = 'Lentamente pela boca ou nariz';
    }
  } else if (currentElapsed > 0 && currentElapsed < BREATH_TOTAL) {
    instruction = 'Pausa';
    subInstruction = 'Respire normalmente no seu ritmo';
  } else if (currentElapsed >= BREATH_TOTAL) {
    instruction = 'Exercício concluído';
    subInstruction = 'Observe as sensações do corpo com calma';
  }

  // ==========================================
  // 2. ANCORAGEM 5–4–3–2–1 (5 Sequential Steps)
  // ==========================================
  const [ancoragemStep, setAncoragemStep] = useState<number>(0);

  const ancoragemSteps = [
    {
      num: 5,
      sense: 'Visão',
      title: '5 coisas que você consegue ver',
      instruction:
        'Olhe ao redor com calma e observe 5 objetos ou detalhes visuais. Note cores, texturas, formas, sombras ou reflexos de luz.',
      tip: 'Exemplo: a maçaneta, uma caneta na mesa, o padrão no piso, uma planta, o céu pela janela.',
    },
    {
      num: 4,
      sense: 'Tato',
      title: '4 coisas que você pode sentir fisicamente',
      instruction:
        'Traga a atenção para o contato físico com o ambiente. Note 4 sensações táteis reais presentes no seu corpo neste instante.',
      tip: 'Exemplo: o tecido da roupa na pele, a firmeza dos pés no chão, o apoio da cadeira nas costas, o calor nas mãos.',
    },
    {
      num: 3,
      sense: 'Audição',
      title: '3 sons que você consegue ouvir',
      instruction:
        'Desfoque a visão ou feche os olhos por um momento. Escute o ambiente com curiosidade e identifique 3 sons distintos.',
      tip: 'Exemplo: o zumbido do computador, o som da respiração, o vento lá fora, vozes ou passos distantes.',
    },
    {
      num: 2,
      sense: 'Olfato',
      title: '2 cheiros ou aromas que pode perceber',
      instruction:
        'Inspire pelo nariz e perceba 2 aromas ao redor. Se o ambiente não tiver cheiros evidentes, imagine com detalhes 2 aromas que trazem tranquilidade.',
      tip: 'Exemplo: ar fresco da janela, café, sabonete, madeira ou o aroma de lavanda/menta.',
    },
    {
      num: 1,
      sense: 'Presença / Paladar',
      title: '1 sensação ou sabor presente',
      instruction:
        'Concentre-se em 1 sabor presente na boca ou uma sensação acolhedora de peso e presença corporal agora.',
      tip: 'Exemplo: o sabor da água recente, o ar passando pela boca, ou simplesmente a sensação de estar aqui e seguro.',
    },
  ];

  const handleNextAncoragem = () => {
    if (ancoragemStep < 4) {
      setAncoragemStep((prev) => prev + 1);
    } else {
      recordPractice('Ancoragem 5-4-3-2-1');
      setAncoragemStep(0);
    }
  };

  const handlePrevAncoragem = () => {
    if (ancoragemStep > 0) {
      setAncoragemStep((prev) => prev - 1);
    }
  };

  // ==========================================
  // 3. RELAXAMENTO CORPORAL
  // ==========================================
  const [relaxMinutes, setRelaxMinutes] = useState<number>(3);
  const [relaxSecsRemaining, setRelaxSecsRemaining] = useState<number>(180);
  const [isRelaxRunning, setIsRelaxRunning] = useState<boolean>(false);
  const relaxTimerEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRelaxRunning) return;
    const interval = setInterval(() => {
      if (relaxTimerEndRef.current) {
        const rem = Math.max(0, (relaxTimerEndRef.current - Date.now()) / 1000);
        setRelaxSecsRemaining(rem);
        if (rem <= 0) {
          setIsRelaxRunning(false);
          relaxTimerEndRef.current = null;
          recordPractice('Relaxamento corporal');
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isRelaxRunning]);

  const handleToggleRelax = () => {
    if (isRelaxRunning) {
      if (relaxTimerEndRef.current) {
        setRelaxSecsRemaining(Math.max(0, (relaxTimerEndRef.current - Date.now()) / 1000));
      }
      setIsRelaxRunning(false);
      relaxTimerEndRef.current = null;
    } else {
      const s = relaxSecsRemaining <= 0 ? relaxMinutes * 60 : relaxSecsRemaining;
      setRelaxSecsRemaining(s);
      relaxTimerEndRef.current = Date.now() + s * 1000;
      setIsRelaxRunning(true);
    }
  };

  const handleResetRelax = () => {
    setIsRelaxRunning(false);
    relaxTimerEndRef.current = null;
    setRelaxSecsRemaining(relaxMinutes * 60);
  };

  const handleConcludeRelax = () => {
    setIsRelaxRunning(false);
    relaxTimerEndRef.current = null;
    recordPractice('Relaxamento corporal');
  };

  // ==========================================
  // 4. REDIRECIONAR A ATENÇÃO (Free Modes)
  // ==========================================
  const [attentionMode, setAttentionMode] = useState<'visao' | 'audicao' | 'alternada'>('visao');

  // ==========================================
  // 5. LIDAR COM PREOCUPAÇÕES (CBT Triage)
  // ==========================================
  const [worryInput, setWorryInput] = useState<string>('');
  const [worryManualResult, setWorryManualResult] = useState<string | null>(null);

  // Inline timer on worry micro-actions
  const [inlineTimerActive, setInlineTimerActive] = useState<boolean>(false);
  const [inlineTimerSecs, setInlineTimerSecs] = useState<number>(300);
  const [inlineTimerRunning, setInlineTimerRunning] = useState<boolean>(false);
  const [inlineActionTask, setInlineActionTask] = useState<string>('');
  const inlineTimerEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (!inlineTimerRunning) return;
    const interval = setInterval(() => {
      if (inlineTimerEndRef.current) {
        const remaining = Math.max(0, (inlineTimerEndRef.current - Date.now()) / 1000);
        setInlineTimerSecs(remaining);
        if (remaining <= 0) {
          setInlineTimerRunning(false);
          inlineTimerEndRef.current = null;
          showToast('Cinco minutos concluídos. Bom trabalho em iniciar!');
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, [inlineTimerRunning, showToast]);

  const handleStartInlineAction = (task: string) => {
    setInlineActionTask(task);
    setInlineTimerActive(true);
    setInlineTimerSecs(300);
    inlineTimerEndRef.current = Date.now() + 300 * 1000;
    setInlineTimerRunning(true);
    showToast('Cronômetro de 5 minutos iniciado.');
  };

  const handleToggleInlineTimer = () => {
    if (inlineTimerRunning) {
      if (inlineTimerEndRef.current) {
        setInlineTimerSecs(Math.max(0, (inlineTimerEndRef.current - Date.now()) / 1000));
      }
      setInlineTimerRunning(false);
      inlineTimerEndRef.current = null;
    } else {
      const s = inlineTimerSecs <= 0 ? 300 : inlineTimerSecs;
      setInlineTimerSecs(s);
      inlineTimerEndRef.current = Date.now() + s * 1000;
      setInlineTimerRunning(true);
    }
  };

  const handleCompleteInlineAction = () => {
    const taskName = inlineActionTask || 'Microação de preocupação';
    const newId = makeId();
    onUpdateData((prev) => ({
      ...prev,
      activities: [
        {
          id: newId,
          date: today(),
          createdAt: Date.now(),
          task: taskName,
          mastery: 4,
          pleasure: 3,
          timerStarted: 300 - Math.ceil(inlineTimerSecs),
        },
        ...prev.activities,
      ].slice(0, 300),
    }));
    setInlineTimerRunning(false);
    setInlineTimerActive(false);
    setWorryInput('');
    setRecentCompletedPracticeId(newId);
    setRecentCompletedPracticeType('activity');
    showToast('Ação registrada com sucesso no seu dia!');
  };

  const handleSaveWorryManual = (status: 'action' | 'later') => {
    const trimmed = worryInput.trim();
    if (!trimmed) {
      showToast('Escreva a preocupação primeiro.');
      return;
    }
    onUpdateData((prev) => ({
      ...prev,
      worries: [
        {
          id: makeId(),
          date: today(),
          createdAt: Date.now(),
          text: trimmed,
          status,
        },
        ...prev.worries,
      ].slice(0, 100),
    }));

    if (status === 'action') {
      setWorryManualResult('Transformada em ação: escolha o menor passo possível para fazer agora.');
    } else {
      setWorryManualResult('Adiada para o horário da preocupação: retome isso em momento reservado.');
    }
    showToast('Preocupação registrada localmente.');
  };

  // ==========================================
  // RENDER VOLUNTARY FEEDBACK COMPONENT
  // ==========================================
  const renderFeedbackPrompt = () => {
    if (!recentCompletedPracticeId) return null;
    return (
      <div
        style={{
          marginTop: '16px',
          padding: '13px 15px',
          background: 'var(--green-soft)',
          borderRadius: '15px',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <strong style={{ fontSize: '.86rem', color: 'var(--green-dark)' }}>
            Essa prática ajudou você a se regular agora?
          </strong>
          <button
            type="button"
            className="inline-link"
            style={{ fontSize: '.76rem' }}
            onClick={() => {
              setRecentCompletedPracticeId(null);
              setRecentCompletedPracticeType(null);
            }}
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
            onClick={() => handleRatePractice('helped')}
          >
            🌿 Ajudou
          </button>
          <button
            type="button"
            className="btn btn-plain btn-small"
            onClick={() => handleRatePractice('partial')}
          >
            ⚖️ Parcialmente
          </button>
          <button
            type="button"
            className="btn btn-plain btn-small"
            onClick={() => handleRatePractice('not_helped')}
          >
            🌧️ Não ajudou
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // MAIN VIEW 1: THE RESPONSIVE GRID
  // ==========================================
  if (activeView === 'grid') {
    return (
      <section className="screen active" id="screen-acalmar" aria-labelledby="title-acalmar">
        <div className="intro">
          <div className="eyebrow">Regulação e acolhimento</div>
          <h1 id="title-acalmar">Acalmar</h1>
          <p className="sub">
            Escolha uma ferramenta para este momento. Não é necessário fazer todas.
          </p>
        </div>

        {/* Responsive Grid matching user mockup */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* 1. Respiração suave */}
          <article
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform .12s ease, border-color .15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '136px',
            }}
            onClick={() => {
              setBreathLabelPrefix('Respiração suave');
              setActiveView('respiracao');
            }}
          >
            <div>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }} aria-hidden="true">
                🌬️
              </div>
              <strong style={{ fontSize: '1.02rem', display: 'block', color: 'var(--ink)' }}>
                Respiração suave
              </strong>
              <p style={{ fontSize: '.84rem', color: 'var(--muted)', marginTop: '4px' }}>
                Acompanhe uma respiração confortável, sem forçar o ritmo.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="mini-tag" style={{ background: 'var(--green-soft)', color: 'var(--green-dark)', fontWeight: 700 }}>
                Até 5 min
              </span>
            </div>
          </article>

          {/* 2. Ancoragem 5–4–3–2–1 */}
          <article
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform .12s ease, border-color .15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '136px',
            }}
            onClick={() => {
              setAncoragemStep(0);
              setActiveView('ancoragem');
            }}
          >
            <div>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }} aria-hidden="true">
                🎯
              </div>
              <strong style={{ fontSize: '1.02rem', display: 'block', color: 'var(--ink)' }}>
                Ancoragem 5–4–3–2–1
              </strong>
              <p style={{ fontSize: '.84rem', color: 'var(--muted)', marginTop: '4px' }}>
                Use os sentidos para direcionar a atenção ao presente.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="mini-tag" style={{ background: 'var(--lilac)', color: 'var(--lilac-ink)', fontWeight: 700 }}>
                Guiado por etapas
              </span>
            </div>
          </article>

          {/* 3. Relaxamento corporal */}
          <article
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform .12s ease, border-color .15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '136px',
            }}
            onClick={() => {
              handleResetRelax();
              setActiveView('relaxamento');
            }}
          >
            <div>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }} aria-hidden="true">
                🧘
              </div>
              <strong style={{ fontSize: '1.02rem', display: 'block', color: 'var(--ink)' }}>
                Relaxamento corporal
              </strong>
              <p style={{ fontSize: '.84rem', color: 'var(--muted)', marginTop: '4px' }}>
                Solte gradualmente a tensão nos ombros, mandíbula e mãos.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="mini-tag" style={{ background: 'var(--sand)', color: 'var(--sand-ink)', fontWeight: 700 }}>
                2–5 min
              </span>
            </div>
          </article>

          {/* 4. Redirecionar a atenção */}
          <article
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform .12s ease, border-color .15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '136px',
            }}
            onClick={() => setActiveView('redirecionar')}
          >
            <div>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }} aria-hidden="true">
                👂
              </div>
              <strong style={{ fontSize: '1.02rem', display: 'block', color: 'var(--ink)' }}>
                Redirecionar a atenção
              </strong>
              <p style={{ fontSize: '.84rem', color: 'var(--muted)', marginTop: '4px' }}>
                Observe objetos, sons ou detalhes ao redor.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="mini-tag" style={{ background: 'var(--green-soft)', color: 'var(--green-dark)', fontWeight: 700 }}>
                1–3 min
              </span>
            </div>
          </article>

          {/* 5. Lidar com preocupações */}
          <article
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform .12s ease, border-color .15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '136px',
            }}
            onClick={() => setActiveView('preocupacoes')}
          >
            <div>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }} aria-hidden="true">
                🧠
              </div>
              <strong style={{ fontSize: '1.02rem', display: 'block', color: 'var(--ink)' }}>
                Lidar com preocupações
              </strong>
              <p style={{ fontSize: '.84rem', color: 'var(--muted)', marginTop: '4px' }}>
                Diferencie o que pode ser resolvido do que é incerto.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="mini-tag" style={{ background: 'var(--lilac)', color: 'var(--lilac-ink)', fontWeight: 700 }}>
                Orientação breve
              </span>
            </div>
          </article>

          {/* 6. Pausa do ambiente */}
          <article
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform .12s ease, border-color .15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '136px',
            }}
            onClick={() => setActiveView('pausa_ambiente')}
          >
            <div>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }} aria-hidden="true">
                ☕
              </div>
              <strong style={{ fontSize: '1.02rem', display: 'block', color: 'var(--ink)' }}>
                Pausa do ambiente
              </strong>
              <p style={{ fontSize: '.84rem', color: 'var(--muted)', marginTop: '4px' }}>
                Faça uma pausa breve se o local estiver sobrecarregando você.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="mini-tag" style={{ background: 'var(--sand)', color: 'var(--sand-ink)', fontWeight: 700 }}>
                No seu ritmo
              </span>
            </div>
          </article>

          {/* 7. Respiração preventiva */}
          <article
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform .12s ease, border-color .15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '136px',
            }}
            onClick={() => setActiveView('preventiva')}
          >
            <div>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }} aria-hidden="true">
                📅
              </div>
              <strong style={{ fontSize: '1.02rem', display: 'block', color: 'var(--ink)' }}>
                Respiração preventiva
              </strong>
              <p style={{ fontSize: '.84rem', color: 'var(--muted)', marginTop: '4px' }}>
                Associe a técnica a um momento da rotina para praticar com calma.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="mini-tag" style={{ background: 'var(--green-soft)', color: 'var(--green-dark)', fontWeight: 700 }}>
                2–5 min · Rotina
              </span>
            </div>
          </article>

          {/* 8. Estímulo frio */}
          <article
            className="card"
            style={{
              cursor: 'pointer',
              transition: 'transform .12s ease, border-color .15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '136px',
            }}
            onClick={() => setActiveView('estimulo_frio')}
          >
            <div>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }} aria-hidden="true">
                ❄️
              </div>
              <strong style={{ fontSize: '1.02rem', display: 'block', color: 'var(--ink)' }}>
                Estímulo frio
              </strong>
              <p style={{ fontSize: '.84rem', color: 'var(--muted)', marginTop: '4px' }}>
                Água fria no rosto para desaceleração fisiológica com segurança.
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="mini-tag" style={{ background: 'var(--lilac)', color: 'var(--lilac-ink)', fontWeight: 700 }}>
                Secundário · 15–30s
              </span>
            </div>
          </article>
        </div>

        {/* Discreet Medical and Emergency Notice (No expandable accordion) */}
        <div
          className="notice"
          style={{
            marginTop: '16px',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: '14px',
            padding: '13px 16px',
            fontSize: '.82rem',
            color: 'var(--ink)',
            lineHeight: 1.45,
          }}
        >
          <strong style={{ display: 'block', marginBottom: '3px', color: 'var(--ink)' }}>
            Orientação sobre sintomas físicos e avaliação médica:
          </strong>
          Não atribua automaticamente à ansiedade episódios novos, intensos ou persistentes de falta de ar, dor ou aperto no peito, palpitações severas ou desmaio. Procure atendimento médico urgente imediatamente se esses sintomas ocorrerem (SAMU 192 no Brasil).
        </div>
      </section>
    );
  }

  // ==========================================
  // VIEW 2: RESPIRAÇÃO SUAVE (Exclusive Experience)
  // ==========================================
  if (activeView === 'respiracao') {
    return (
      <section className="screen active" aria-labelledby="title-respiracao">
        <div style={{ marginBottom: '14px' }}>
          <button
            className="btn btn-plain btn-small"
            type="button"
            onClick={() => {
              setIsBreathRunning(false);
              setActiveView('grid');
            }}
          >
            ← Voltar para as ferramentas
          </button>
        </div>

        <article className="card feature" style={{ padding: '20px' }}>
          <div className="card-head">
            <div>
              <div className="eyebrow">Exercício guiado</div>
              <h2 id="title-respiracao">{breathLabelPrefix || 'Respiração suave'}</h2>
              <p>Uma respiração um pouco mais lenta do que o habitual, sem forçar.</p>
            </div>
            <div className="feature-icon" aria-hidden="true">
              🌬️
            </div>
          </div>

          <div className="segmented-control" role="group" aria-label="Modo de respiração">
            <button
              type="button"
              className={breathMode === 'regular' ? 'active' : ''}
              onClick={() => setBreathMode('regular')}
            >
              Respiração suave
            </button>
            <button
              type="button"
              className={breathMode === 'diaphragm' ? 'active' : ''}
              onClick={() => setBreathMode('diaphragm')}
            >
              Diafragmática (abdômen)
            </button>
          </div>

          <div className="breath-box" style={{ margin: '16px 0' }}>
            <div className={circleClass} aria-hidden="true">
              <span className="circle-inner" />
            </div>
            <div className="breath-instruction" role="status" aria-live="polite">
              {instruction}
            </div>
            <div className="breath-sub-instruction">{subInstruction}</div>
          </div>

          <div className="timer" aria-live="off">
            {`${String(Math.floor(Math.max(0, BREATH_TOTAL - Math.ceil(currentElapsed)) / 60)).padStart(2, '0')}:${String(Math.max(0, BREATH_TOTAL - Math.ceil(currentElapsed)) % 60).padStart(2, '0')}`}
          </div>

          <label className="inline-control" style={{ marginBottom: '14px' }}>
            <input
              type="checkbox"
              id="breathPauseToggle"
              checked={hasPause}
              onChange={(e) => setHasPause(e.target.checked)}
            />
            <span style={{ fontSize: '.84rem' }}>
              Incluir uma pausa muito breve entre inspirar e expirar (opcional). Desmarque se causar desconforto.
            </span>
          </label>

          <div className="split">
            <button
              className="btn btn-primary btn-full"
              type="button"
              onClick={handleToggleBreath}
            >
              {isBreathRunning
                ? 'Ⅱ Pausar'
                : currentElapsed > 0 && currentElapsed < BREATH_TOTAL
                ? '▶ Retomar'
                : currentElapsed >= BREATH_TOTAL
                ? '▶ Repetir'
                : '▶ Iniciar respiração'}
            </button>

            {currentElapsed > 10 ? (
              <button
                className="btn btn-soft btn-full"
                type="button"
                onClick={handleConcludeBreath}
              >
                ✓ Concluir e registrar
              </button>
            ) : (
              <button
                className="btn btn-plain btn-full"
                type="button"
                onClick={handleResetBreath}
              >
                Zerar
              </button>
            )}
          </div>

          {renderFeedbackPrompt()}

          <p className="hint" style={{ marginTop: '16px' }}>
            Se sentir tontura ou desconforto, interrompa o ritmo guiado e deixe a respiração voltar ao natural. Você pode parar a qualquer momento.
          </p>
        </article>
      </section>
    );
  }

  // ==========================================
  // VIEW 3: ANCORAGEM 5–4–3–2–1 (Exclusive Experience)
  // ==========================================
  if (activeView === 'ancoragem') {
    const currentStepData = ancoragemSteps[ancoragemStep];

    return (
      <section className="screen active" aria-labelledby="title-ancoragem">
        <div style={{ marginBottom: '14px' }}>
          <button
            className="btn btn-plain btn-small"
            type="button"
            onClick={() => setActiveView('grid')}
          >
            ← Voltar para as ferramentas
          </button>
        </div>

        <article className="card feature" style={{ padding: '22px' }}>
          <div className="card-head">
            <div>
              <span className="mini-tag" style={{ background: 'var(--lilac)', color: 'var(--lilac-ink)', fontWeight: 700 }}>
                Etapa {ancoragemStep + 1} de 5 · Sentido: {currentStepData.sense}
              </span>
              <h2 id="title-ancoragem" style={{ fontSize: '1.3rem', marginTop: '8px' }}>
                {currentStepData.title}
              </h2>
            </div>
            <div className="feature-icon" aria-hidden="true" style={{ fontSize: '1.8rem' }}>
              🎯
            </div>
          </div>

          {/* Step Progress Bar */}
          <div style={{ display: 'flex', gap: '6px', margin: '14px 0 18px' }}>
            {ancoragemSteps.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '999px',
                  background: i <= ancoragemStep ? 'var(--green)' : 'var(--line)',
                  transition: 'background .2s ease',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '16px', marginBottom: '18px' }}>
            <p style={{ fontSize: '.94rem', lineHeight: 1.5, color: 'var(--ink)' }}>
              {currentStepData.instruction}
            </p>
            <p className="hint" style={{ marginTop: '10px', fontSize: '.82rem' }}>
              💡 {currentStepData.tip}
            </p>
          </div>

          <div className="split">
            {ancoragemStep > 0 ? (
              <button
                className="btn btn-plain btn-full"
                type="button"
                onClick={handlePrevAncoragem}
              >
                ← Etapa anterior
              </button>
            ) : (
              <button
                className="btn btn-plain btn-full"
                type="button"
                onClick={() => setActiveView('grid')}
              >
                Cancelar
              </button>
            )}

            <button
              className="btn btn-primary btn-full"
              type="button"
              onClick={handleNextAncoragem}
            >
              {ancoragemStep < 4 ? 'Próxima etapa →' : '✓ Concluir ancoragem'}
            </button>
          </div>

          {renderFeedbackPrompt()}

          <p className="hint" style={{ marginTop: '16px', textAlign: 'center' }}>
            Não é um teste de memória. O objetivo é apenas trazer sua mente de volta ao contato direto com o que está aqui agora.
          </p>
        </article>
      </section>
    );
  }

  // ==========================================
  // VIEW 4: RELAXAMENTO CORPORAL (Exclusive Experience)
  // ==========================================
  if (activeView === 'relaxamento') {
    return (
      <section className="screen active" aria-labelledby="title-relaxamento">
        <div style={{ marginBottom: '14px' }}>
          <button
            className="btn btn-plain btn-small"
            type="button"
            onClick={() => {
              setIsRelaxRunning(false);
              setActiveView('grid');
            }}
          >
            ← Voltar para as ferramentas
          </button>
        </div>

        <article className="card feature" style={{ padding: '20px' }}>
          <div className="card-head">
            <div>
              <div className="eyebrow">Alívio de tensão</div>
              <h2 id="title-relaxamento">Relaxamento corporal</h2>
              <p>Solte gradualmente a musculatura nos quatro pontos que mais acumulam tensão.</p>
            </div>
            <div className="feature-icon" aria-hidden="true">
              🧘
            </div>
          </div>

          {/* Duration selection */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {[2, 3, 5].map((m) => (
              <button
                key={m}
                type="button"
                className={`btn btn-small ${relaxMinutes === m ? 'btn-primary' : 'btn-plain'}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setRelaxMinutes(m);
                  setRelaxSecsRemaining(m * 60);
                  setIsRelaxRunning(false);
                }}
              >
                {m} minutos
              </button>
            ))}
          </div>

          {/* Countdown timer */}
          <div className="timer" style={{ fontSize: '2.8rem', margin: '8px 0' }}>
            {`${String(Math.floor(Math.max(0, Math.ceil(relaxSecsRemaining)) / 60)).padStart(2, '0')}:${String(Math.max(0, Math.ceil(relaxSecsRemaining)) % 60).padStart(2, '0')}`}
          </div>

          {/* 4 Targeted Muscle Groups: ombros, pescoço, mandíbula e mãos */}
          <div className="stack" style={{ gap: '10px', margin: '14px 0' }}>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px 14px' }}>
              <strong style={{ fontSize: '.88rem', color: 'var(--green-dark)' }}>1. Ombros e trapézio</strong>
              <p style={{ fontSize: '.84rem', marginTop: '3px', color: 'var(--ink)' }}>
                Deixe os ombros descerem para longe das orelhas. Solte o peso dos braços como se estivessem repousando em almofadas macias.
              </p>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px 14px' }}>
              <strong style={{ fontSize: '.88rem', color: 'var(--green-dark)' }}>2. Pescoço e nuca</strong>
              <p style={{ fontSize: '.84rem', marginTop: '3px', color: 'var(--ink)' }}>
                Incline suavemente a cabeça para um lado e depois para o outro. Permita que a musculatura cervical relaxe sem forçar nenhum movimento.
              </p>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px 14px' }}>
              <strong style={{ fontSize: '.88rem', color: 'var(--green-dark)' }}>3. Mandíbula e rosto</strong>
              <p style={{ fontSize: '.84rem', marginTop: '3px', color: 'var(--ink)' }}>
                Separe suavemente os dentes de cima dos dentes de baixo. Deixe a língua descansar solta no assoalho da boca e relaxe a testa e os olhos.
              </p>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px 14px' }}>
              <strong style={{ fontSize: '.88rem', color: 'var(--green-dark)' }}>4. Mãos e dedos</strong>
              <p style={{ fontSize: '.84rem', marginTop: '3px', color: 'var(--ink)' }}>
                Abra as mãos, estique os dedos suavemente por 3 segundos e solte-os completamente apoiados sobre as pernas, sem segurar nada.
              </p>
            </div>
          </div>

          <div className="split">
            <button
              className="btn btn-primary btn-full"
              type="button"
              onClick={handleToggleRelax}
            >
              {isRelaxRunning ? 'Ⅱ Pausar tempo' : relaxSecsRemaining < relaxMinutes * 60 && relaxSecsRemaining > 0 ? '▶ Retomar' : '▶ Iniciar relaxamento'}
            </button>
            <button
              className="btn btn-soft btn-full"
              type="button"
              onClick={handleConcludeRelax}
            >
              ✓ Concluir prática
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button
              type="button"
              className="inline-link"
              style={{ fontSize: '.76rem', color: 'var(--muted)' }}
              onClick={handleResetRelax}
            >
              Reiniciar tempo
            </button>
          </div>

          {renderFeedbackPrompt()}
        </article>
      </section>
    );
  }

  // ==========================================
  // VIEW 5: REDIRECIONAR A ATENÇÃO (Free Modes)
  // ==========================================
  if (activeView === 'redirecionar') {
    return (
      <section className="screen active" aria-labelledby="title-redirecionar">
        <div style={{ marginBottom: '14px' }}>
          <button
            className="btn btn-plain btn-small"
            type="button"
            onClick={() => setActiveView('grid')}
          >
            ← Voltar para as ferramentas
          </button>
        </div>

        <article className="card feature" style={{ padding: '20px' }}>
          <div className="card-head">
            <div>
              <div className="eyebrow">Atenção plena aberta</div>
              <h2 id="title-redirecionar">Redirecionar a atenção</h2>
              <p>Mude o foco mental explorando uma das três vias de observação neutra.</p>
            </div>
            <div className="feature-icon" aria-hidden="true">
              👂
            </div>
          </div>

          <div className="segmented-control" role="group" aria-label="Modo de atenção">
            <button
              type="button"
              className={attentionMode === 'visao' ? 'active' : ''}
              onClick={() => setAttentionMode('visao')}
            >
              👁️ Visão
            </button>
            <button
              type="button"
              className={attentionMode === 'audicao' ? 'active' : ''}
              onClick={() => setAttentionMode('audicao')}
            >
              👂 Audição
            </button>
            <button
              type="button"
              className={attentionMode === 'alternada' ? 'active' : ''}
              onClick={() => setAttentionMode('alternada')}
            >
              🔄 Alternada
            </button>
          </div>

          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '16px', margin: '16px 0' }}>
            {attentionMode === 'visao' && (
              <div>
                <strong style={{ fontSize: '.92rem' }}>Exploração de cores e formas:</strong>
                <p style={{ fontSize: '.86rem', marginTop: '6px', color: 'var(--ink)' }}>
                  Escolha uma cor (por exemplo, verde ou azul) e conte silenciosamente todos os objetos dessa cor que conseguir encontrar no espaço ao redor. Note tons claros, escuros e reflexos.
                </p>
              </div>
            )}

            {attentionMode === 'audicao' && (
              <div>
                <strong style={{ fontSize: '.92rem' }}>Paisagem sonora (longe e perto):</strong>
                <p style={{ fontSize: '.86rem', marginTop: '6px', color: 'var(--ink)' }}>
                  Foque primeiro no som mais distante que você conseguir detectar (como trânsito ou vento). Mantenha a atenção por 30 segundos. Em seguida, mude para o som mais próximo de você (sua respiração ou o teclado).
                </p>
              </div>
            )}

            {attentionMode === 'alternada' && (
              <div>
                <strong style={{ fontSize: '.92rem' }}>Atenção alternada (Dentro e Fora):</strong>
                <p style={{ fontSize: '.86rem', marginTop: '6px', color: 'var(--ink)' }}>
                  Passe 30 segundos observando um objeto fixo à sua frente com atenção aos detalhes. Depois, feche os olhos por 30 segundos e sinta a temperatura das suas mãos e o contato dos pés com o chão. Repita duas vezes.
                </p>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-full"
            type="button"
            onClick={() => recordPractice('Redirecionamento de atenção')}
          >
            ✓ Concluir e registrar prática
          </button>

          {renderFeedbackPrompt()}
        </article>
      </section>
    );
  }

  // ==========================================
  // VIEW 6: LIDAR COM PREOCUPAÇÕES (CBT Triage)
  // ==========================================
  if (activeView === 'preocupacoes') {
    return (
      <section className="screen active" aria-labelledby="title-preocupacoes">
        <div style={{ marginBottom: '14px' }}>
          <button
            className="btn btn-plain btn-small"
            type="button"
            onClick={() => {
              setInlineTimerRunning(false);
              setInlineTimerActive(false);
              setActiveView('grid');
            }}
          >
            ← Voltar para as ferramentas
          </button>
        </div>

        <article className="card" style={{ padding: '20px' }}>
          <div className="card-head">
            <div>
              <div className="eyebrow">TCC · Triagem de Pensamentos</div>
              <h2 id="title-preocupacoes">Lidar com preocupações</h2>
              <p>Diferencie o que é um problema prático imediato do que é uma incerteza incontrolável.</p>
            </div>
            <div className="feature-icon" aria-hidden="true">
              🧠
            </div>
          </div>

          <div className="field">
            <label htmlFor="worryText">Qual é a preocupação agora?</label>
            <input
              id="worryText"
              type="text"
              maxLength={180}
              placeholder="Ex.: Tenho que enviar um e-mail difícil / E se der tudo errado?"
              value={worryInput}
              onChange={(e) => setWorryInput(e.target.value)}
            />
          </div>

          {/* Inline 5-min timer if user started action */}
          {inlineTimerActive && (
            <div style={{ marginTop: '14px', background: '#eef6f0', padding: '14px', borderRadius: '16px', border: '1px solid #d2e8d7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mini-tag" style={{ background: '#376c5c', color: '#fff' }}>5 Minutos em Andamento</span>
                <button
                  type="button"
                  className="inline-link"
                  style={{ fontSize: '.76rem' }}
                  onClick={() => {
                    setInlineTimerRunning(false);
                    setInlineTimerActive(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
              <p style={{ fontWeight: 750, fontSize: '.9rem', marginTop: '8px' }}>{inlineActionTask}</p>
              <div className="timer" style={{ fontSize: '2.4rem', margin: '4px 0' }}>
                {`${String(Math.floor(Math.max(0, Math.ceil(inlineTimerSecs)) / 60)).padStart(2, '0')}:${String(Math.max(0, Math.ceil(inlineTimerSecs)) % 60).padStart(2, '0')}`}
              </div>
              <div className="split">
                <button
                  className="btn btn-primary btn-full"
                  type="button"
                  onClick={handleToggleInlineTimer}
                >
                  {inlineTimerRunning ? 'Ⅱ Pausar' : '▶ Retomar'}
                </button>
                <button
                  className="btn btn-soft btn-full"
                  type="button"
                  onClick={handleCompleteInlineAction}
                >
                  ✓ Concluir ação
                </button>
              </div>
            </div>
          )}

          {/* Triagem Clínica Estruturada de TCC (100% Offline) */}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
            <p style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Como manejar esta preocupação segundo a TCC:
            </p>

            <div className="stack" style={{ gap: '10px' }}>
              {/* Opção 1: Problema prático */}
              <div style={{ background: '#f5faf6', border: '1px solid #d7ebd9', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className="mini-tag" style={{ background: '#eaf3ed', color: '#285347', fontWeight: 700 }}>
                    🌱 1. Problema prático com controle direto
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                  Se você pode agir sobre isso agora, divida em um micro-passo de 5 minutos para vencer a inércia:
                </p>
                <div className="btn-row">
                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    disabled={!worryInput.trim()}
                    onClick={() => handleStartInlineAction(worryInput.trim())}
                  >
                    ▶ Iniciar 5 minutos agora
                  </button>
                  {onSetHojeTask && (
                    <button
                      className="btn btn-plain btn-small"
                      type="button"
                      disabled={!worryInput.trim()}
                      onClick={() => {
                        handleSaveWorryManual('action');
                        onSetHojeTask(worryInput.trim());
                        onNavigate('hoje');
                      }}
                    >
                      Levar para tela Hoje
                    </button>
                  )}
                  <button
                    className="btn btn-plain btn-small"
                    type="button"
                    disabled={!worryInput.trim()}
                    onClick={() => handleSaveWorryManual('action')}
                  >
                    Salvar como ação
                  </button>
                </div>
              </div>

              {/* Opção 2: Incerteza incontrolável */}
              <div style={{ background: '#faf9fc', border: '1px solid #e7e2f0', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className="mini-tag" style={{ background: '#eeebf8', color: '#63548c', fontWeight: 700 }}>
                    ☁️ 2. Incerteza futura ou fora do seu controle
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                  Se envolve cenários hipotéticos ou coisas que você não controla, não force soluções imaginárias. Regule o corpo e ancore a atenção no presente:
                </p>
                <div className="btn-row">
                  <button
                    className="btn btn-soft btn-small"
                    type="button"
                    onClick={() => {
                      setBreathLabelPrefix('Respiração suave');
                      setActiveView('respiracao');
                    }}
                  >
                    🌬️ Pausa respiratória
                  </button>
                  <button
                    className="btn btn-soft btn-small"
                    type="button"
                    onClick={() => {
                      setAncoragemStep(0);
                      setActiveView('ancoragem');
                    }}
                  >
                    🎯 Ancoragem 5-4-3-2-1
                  </button>
                </div>
              </div>

              {/* Opção 3: Adiamento do estímulo */}
              <div style={{ background: '#fdfaf5', border: '1px solid #fae8ce', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className="mini-tag" style={{ background: '#fef5ea', color: '#7d4a13', fontWeight: 700 }}>
                    ⏰ 3. Adiar para o horário reservado da preocupação
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                  Técnica de adiamento do estímulo: anote agora e reserve 15 minutos fixos no fim da tarde para pensar nisso, liberando o restante do seu dia.
                </p>
                <button
                  className="btn btn-plain btn-small"
                  type="button"
                  disabled={!worryInput.trim()}
                  onClick={() => handleSaveWorryManual('later')}
                >
                  Guardar para o horário da preocupação
                </button>
              </div>
            </div>
          </div>

          {worryManualResult && (
            <div className="notice" style={{ marginTop: '12px' }}>
              {worryManualResult}
            </div>
          )}

          {renderFeedbackPrompt()}
        </article>
      </section>
    );
  }

  // ==========================================
  // VIEW 7: PAUSA DO AMBIENTE (Exclusive Experience)
  // ==========================================
  if (activeView === 'pausa_ambiente') {
    return (
      <section className="screen active" aria-labelledby="title-pausa">
        <div style={{ marginBottom: '14px' }}>
          <button
            className="btn btn-plain btn-small"
            type="button"
            onClick={() => setActiveView('grid')}
          >
            ← Voltar para as ferramentas
          </button>
        </div>

        <article className="card feature" style={{ padding: '20px' }}>
          <div className="card-head">
            <div>
              <div className="eyebrow">Desaceleração sensorial</div>
              <h2 id="title-pausa">Pausa do ambiente</h2>
              <p>Reduza estímulos imediatamente, sem precisar sair do local se não for viável.</p>
            </div>
            <div className="feature-icon" aria-hidden="true">
              ☕
            </div>
          </div>

          <div className="stack" style={{ gap: '12px', margin: '14px 0' }}>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px' }}>
              <strong style={{ fontSize: '.9rem', color: 'var(--ink)' }}>1. Diminuir a sobrecarga sensorial</strong>
              <p style={{ fontSize: '.84rem', marginTop: '4px', color: 'var(--muted)', lineHeight: 1.45 }}>
                Baixe o brilho das telas ao redor, afaste o olhar da movimentação ou feche os olhos por dois minutos. Se houver muito barulho, use fones sem som para atenuar o ruído.
              </p>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px' }}>
              <strong style={{ fontSize: '.9rem', color: 'var(--ink)' }}>2. Postura de descompressão</strong>
              <p style={{ fontSize: '.84rem', marginTop: '4px', color: 'var(--muted)', lineHeight: 1.45 }}>
                Apoie as costas firmemente na cadeira e sinta os pés no chão. Coloque as mãos relaxadas sobre as coxas e permita-se não responder a nenhuma solicitação pelos próximos minutos.
              </p>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px' }}>
              <strong style={{ fontSize: '.9rem', color: 'var(--ink)' }}>3. Permissão para pausar</strong>
              <p style={{ fontSize: '.84rem', marginTop: '4px', color: 'var(--muted)', lineHeight: 1.45 }}>
                Lembre-se: parar por alguns minutos para se recompor não é desistir nem ser irresponsável. É uma necessidade humana para voltar a pensar com clareza.
              </p>
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            type="button"
            onClick={() => recordPractice('Pausa do ambiente')}
          >
            ✓ Concluir pausa do ambiente
          </button>

          {renderFeedbackPrompt()}
        </article>
      </section>
    );
  }

  // ==========================================
  // VIEW 8: PRÁTICA PREVENTIVA (Exclusive Experience)
  // ==========================================
  if (activeView === 'preventiva') {
    return (
      <section className="screen active" aria-labelledby="title-preventiva">
        <div style={{ marginBottom: '14px' }}>
          <button
            className="btn btn-plain btn-small"
            type="button"
            onClick={() => setActiveView('grid')}
          >
            ← Voltar para as ferramentas
          </button>
        </div>

        <article className="card feature" style={{ padding: '20px' }}>
          <div className="card-head">
            <div>
              <div className="eyebrow">Treino em momentos tranquilos</div>
              <h2 id="title-preventiva">Prática preventiva</h2>
              <p>Treinar a respiração quando você está calmo torna o recurso automático nas crises.</p>
            </div>
            <div className="feature-icon" aria-hidden="true">
              📅
            </div>
          </div>

          <div className="field">
            <label htmlFor="practiceAnchor">Âncora de rotina habitual</label>
            <select
              id="practiceAnchor"
              value={data.settings.practiceAnchor || 'Ao acordar'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateData((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    practiceAnchor: val,
                  },
                }));
                showToast('Âncora preventiva atualizada.');
              }}
            >
              {ROUTINE_ANCHORS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <p style={{ fontSize: '.85rem', color: 'var(--ink)', margin: '12px 0' }}>
            Momento escolhido: <strong>{data.settings.practiceAnchor || 'Ao acordar'}</strong>.
            Exercite a respiração suave nesse momento diariamente por 2 a 5 minutos.
          </p>

          <button
            className="btn btn-primary btn-full"
            type="button"
            onClick={() => {
              setBreathLabelPrefix('Respiração preventiva');
              setActiveView('respiracao');
            }}
          >
            ▶ Iniciar exercício respiratório agora
          </button>
        </article>
      </section>
    );
  }

  // ==========================================
  // VIEW 9: ESTÍMULO FRIO (Exclusive Experience)
  // ==========================================
  if (activeView === 'estimulo_frio') {
    return (
      <section className="screen active" aria-labelledby="title-frio">
        <div style={{ marginBottom: '14px' }}>
          <button
            className="btn btn-plain btn-small"
            type="button"
            onClick={() => setActiveView('grid')}
          >
            ← Voltar para as ferramentas
          </button>
        </div>

        <article className="card" style={{ padding: '20px' }}>
          <div className="card-head">
            <div>
              <div className="eyebrow">Protocolo de Desaceleração Fisiológica</div>
              <h2 id="title-frio">Estímulo frio no rosto</h2>
              <p>Ativação do reflexo de mergulho para desacelerar o ritmo cardíaco de forma natural.</p>
            </div>
            <div className="feature-icon" aria-hidden="true">
              ❄️
            </div>
          </div>

          <div className="stack" style={{ gap: '12px', margin: '14px 0' }}>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px' }}>
              <strong style={{ fontSize: '.9rem', color: 'var(--ink)' }}>Como aplicar:</strong>
              <p style={{ fontSize: '.84rem', marginTop: '4px', color: 'var(--muted)', lineHeight: 1.45 }}>
                Molhe o rosto com água fria na pia ou aplique uma toalha úmida e fria sobre os olhos, têmporas e bochechas por cerca de 15 a 30 segundos, inclinando levemente o corpo para frente.
              </p>
            </div>

            <div className="notice" style={{ margin: 0, fontSize: '.82rem' }}>
              <strong>Avisos de segurança e contraindicações importantes:</strong>
              Não use estímulo frio se tiver histórico de problemas cardiovasculares, bradicardia, arritmia cardíaca, síndrome de Raynaud ou alergia severa ao frio.
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            type="button"
            onClick={() => recordPractice('Estímulo frio')}
          >
            ✓ Registrar aplicação de estímulo frio
          </button>

          {renderFeedbackPrompt()}
        </article>
      </section>
    );
  }

  return null;
};
