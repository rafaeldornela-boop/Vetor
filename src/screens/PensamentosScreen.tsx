import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EMOTIONS } from '../constants';
import { Thought, ThoughtDraft, VetorData } from '../types';
import { formatDate, makeId, today } from '../utils/format';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportOrShareFile, shareFormattedText } from '../utils/fileExport';

interface PensamentosScreenProps {
  data: VetorData;
  onUpdateData: (updater: (prev: VetorData) => VetorData) => boolean;
  showToast: (msg: string) => void;
}


export const PensamentosScreen: React.FC<PensamentosScreenProps> = ({
  data,
  onUpdateData,
  showToast,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Initial draft load from props
  const initialDraft = data.thoughtDraft || {};
  const [situation, setSituation] = useState<string>(initialDraft.thoughtSituation || '');
  const [automatic, setAutomatic] = useState<string>(initialDraft.thoughtAuto || '');
  const [emotion, setEmotion] = useState<string>(initialDraft.thoughtEmotion || 'Ansiedade');
  const [intensity, setIntensity] = useState<number>(
    typeof initialDraft.thoughtIntensity === 'number'
      ? initialDraft.thoughtIntensity
      : initialDraft.thoughtIntensity
      ? Number(initialDraft.thoughtIntensity)
      : 70
  );
  const [evidenceFor, setEvidenceFor] = useState<string>(initialDraft.thoughtFor || '');
  const [evidenceAgainst, setEvidenceAgainst] = useState<string>(initialDraft.thoughtAgainst || '');
  const [balanced, setBalanced] = useState<string>(initialDraft.thoughtBalanced || '');
  const [nextStep, setNextStep] = useState<string>(initialDraft.thoughtNext || '');

  // Editing existing thought tracking
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);

  // Status message for screen readers and user feedback
  const [saveStatus, setSaveStatus] = useState<string>(
    'Rascunho salvo localmente neste navegador.'
  );

  // Track if user has made local unsaved modifications
  const isDirtyRef = useRef<boolean>(false);

  // Ref to hold the latest draft state to avoid stale closures in debounced saves
  const latestDraftRef = useRef<ThoughtDraft>({
    thoughtSituation: situation,
    thoughtAuto: automatic,
    thoughtEmotion: emotion,
    thoughtIntensity: intensity,
    thoughtFor: evidenceFor,
    thoughtAgainst: evidenceAgainst,
    thoughtBalanced: balanced,
    thoughtNext: nextStep,
  });

  // Keep latestDraftRef in sync with state
  useEffect(() => {
    latestDraftRef.current = {
      thoughtSituation: situation,
      thoughtAuto: automatic,
      thoughtEmotion: emotion,
      thoughtIntensity: intensity,
      thoughtFor: evidenceFor,
      thoughtAgainst: evidenceAgainst,
      thoughtBalanced: balanced,
      thoughtNext: nextStep,
    };
  }, [situation, automatic, emotion, intensity, evidenceFor, evidenceAgainst, balanced, nextStep]);

  // Debounced auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const persistDraft = useCallback(
    (draftToSave: ThoughtDraft, notify = false): boolean => {
      const saved = onUpdateData((prev) => ({
        ...prev,
        thoughtDraft: draftToSave,
      }));

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (saved) {
        setSaveStatus(`✓ Rascunho atualizado às ${nowStr}.`);
        if (notify) showToast('Rascunho salvo com sucesso.');
      } else {
        setSaveStatus('⚠️ Armazenamento indisponível; rascunho mantido apenas nesta sessão.');
        if (notify) showToast('Aviso: armazenamento indisponível. Texto mantido nesta tela.');
      }
      return saved;
    },
    [onUpdateData, showToast]
  );

  // Trigger debounced auto-save when user edits fields
  const queueAutoSave = useCallback(() => {
    isDirtyRef.current = true;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      persistDraft(latestDraftRef.current, false);
    }, 700);
  }, [persistDraft]);

  // Cleanup auto-save on unmount and flush pending draft
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        // Flush final draft on unmount if dirty
        if (isDirtyRef.current) {
          persistDraft(latestDraftRef.current, false);
        }
      }
    };
  }, [persistDraft]);

  // Field change handler that preserves text and triggers debounced draft save
  const handleFieldChange = (field: keyof ThoughtDraft, value: string | number) => {
    if (field === 'thoughtSituation') setSituation(value as string);
    if (field === 'thoughtAuto') setAutomatic(value as string);
    if (field === 'thoughtEmotion') setEmotion(value as string);
    if (field === 'thoughtIntensity') setIntensity(Number(value));
    if (field === 'thoughtFor') setEvidenceFor(value as string);
    if (field === 'thoughtAgainst') setEvidenceAgainst(value as string);
    if (field === 'thoughtBalanced') setBalanced(value as string);
    if (field === 'thoughtNext') setNextStep(value as string);

    queueAutoSave();
  };

  // Manual draft save button handler
  const handleManualSaveDraft = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    persistDraft(latestDraftRef.current, true);
  };

  // Save Thought Record (Final Submission)
  const handleSaveThought = () => {
    const trimmedAuto = automatic.trim();
    const trimmedBalanced = balanced.trim();

    if (!trimmedAuto) {
      showToast('Comece registrando o pensamento automático na Etapa 1.');
      setCurrentStep(0);
      return;
    }

    if (!trimmedBalanced) {
      showToast('Escreva uma resposta mais realista na Etapa 3 antes de finalizar.');
      setCurrentStep(2);
      return;
    }

    const thoughtId = editingThoughtId || makeId();
    const thoughtDate = today();
    const newThought: Thought = {
      id: thoughtId,
      date: thoughtDate,
      createdAt: Date.now(),
      situation: situation.trim(),
      automatic: trimmedAuto,
      emotion,
      intensity,
      evidenceFor: evidenceFor.trim(),
      evidenceAgainst: evidenceAgainst.trim(),
      balanced: trimmedBalanced,
      next: nextStep.trim(),
    };

    // Attempt persistent update
    const saved = onUpdateData((prev) => {
      let updatedThoughts: Thought[];
      if (editingThoughtId) {
        // Update existing thought
        updatedThoughts = prev.thoughts.map((t) => (t.id === editingThoughtId ? newThought : t));
      } else {
        // Prepend new thought, limit to 200
        updatedThoughts = [newThought, ...prev.thoughts].slice(0, 200);
      }
      return {
        ...prev,
        thoughts: updatedThoughts,
        thoughtDraft: {}, // Clear draft on successful save
      };
    });

    // CRITICAL: Only reset form if save succeeded!
    if (saved) {
      // Clear fields safely
      setSituation('');
      setAutomatic('');
      setEmotion('Ansiedade');
      setIntensity(70);
      setEvidenceFor('');
      setEvidenceAgainst('');
      setBalanced('');
      setNextStep('');
      setEditingThoughtId(null);
      setCurrentStep(0);
      isDirtyRef.current = false;
      setSaveStatus('✓ Registro salvo no navegador. Um novo registro pode ser iniciado.');
      showToast(
        editingThoughtId
          ? 'Registro de pensamento atualizado com sucesso.'
          : 'Registro de pensamento salvo com sucesso.'
      );
    } else {
      // KEEP ALL USER FIELDS INTACT ON FAILURE
      setSaveStatus(
        '⚠️ Não foi possível gravar no armazenamento persistente do navegador. Seus dados foram preservados nesta tela.'
      );
      showToast('Aviso: Armazenamento indisponível. O texto preenchido foi preservado nesta tela.');
    }
  };

  // Accessible Modal states for discard and delete
  const [pendingDiscardThought, setPendingDiscardThought] = useState<Thought | null>(null);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState<boolean>(false);
  const [pendingDeleteThoughtId, setPendingDeleteThoughtId] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);

  const applyEditThought = (t: Thought) => {
    setEditingThoughtId(t.id);
    setSituation(t.situation || '');
    setAutomatic(t.automatic || '');
    setEmotion(t.emotion || 'Ansiedade');
    setIntensity(typeof t.intensity === 'number' ? t.intensity : 70);
    setEvidenceFor(t.evidenceFor || '');
    setEvidenceAgainst(t.evidenceAgainst || '');
    setBalanced(t.balanced || '');
    setNextStep(t.next || '');
    setCurrentStep(0);
    isDirtyRef.current = false;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Editando registro de ${formatDate(t.date)}.`);
  };

  // Edit existing thought from history
  const handleBeginEditThought = (t: Thought) => {
    const hasUnsavedContent =
      isDirtyRef.current &&
      (situation.trim() || automatic.trim() || evidenceFor.trim() || evidenceAgainst.trim() || balanced.trim());

    if (hasUnsavedContent) {
      setPendingDiscardThought(t);
      setIsConfirmDiscardOpen(true);
      return;
    }

    applyEditThought(t);
  };

  const handleCancelEdit = () => {
    setEditingThoughtId(null);
    setSituation('');
    setAutomatic('');
    setEmotion('Ansiedade');
    setIntensity(70);
    setEvidenceFor('');
    setEvidenceAgainst('');
    setBalanced('');
    setNextStep('');
    setCurrentStep(0);
    isDirtyRef.current = false;
    showToast('Edição cancelada.');
  };

  // Delete thought with explicit accessible confirmation modal
  const handleDeleteThought = (id: string) => {
    setPendingDeleteThoughtId(id);
    setIsConfirmDeleteOpen(true);
  };

  const executeDeleteThought = () => {
    if (!pendingDeleteThoughtId) return;
    const id = pendingDeleteThoughtId;

    if (editingThoughtId === id) {
      handleCancelEdit();
    }

    const saved = onUpdateData((prev) => ({
      ...prev,
      thoughts: prev.thoughts.filter((t) => t.id !== id),
    }));

    setIsConfirmDeleteOpen(false);
    setPendingDeleteThoughtId(null);

    if (saved) {
      showToast('Registro excluído do histórico.');
    } else {
      showToast('Não foi possível atualizar o armazenamento local.');
    }
  };

  // Export single thought record via native share or file download
  const handleExportSingleThought = async (t: Thought) => {
    const lines = [
      'REGISTRO DE PENSAMENTO (RPD) — VETOR TCC',
      `Data: ${formatDate(t.date)}`,
      '',
      '1. Situação ou gatilho:',
      t.situation || '(Não informado)',
      '',
      '2. Pensamento automático:',
      t.automatic || '(Não informado)',
      '',
      '3. Emoção predominante:',
      `${t.emotion || 'Ansiedade'} (${t.intensity || 0}%)`,
      '',
      '4. Fatos e evidências que apoiam:',
      t.evidenceFor || '(Nenhum fato registrado)',
      '',
      '5. Fatos e evidências que contrariam:',
      t.evidenceAgainst || '(Nenhum fato registrado)',
      '',
      '6. Resposta equilibrada e realista:',
      t.balanced || '(Não informada)',
    ];
    if (t.next) {
      lines.push('', '7. Próximo passo possível:', t.next);
    }
    const textContent = lines.join('\n');
    const filename = `pensamento-${t.date}-${t.id.slice(0, 6)}.txt`;

    const result = await exportOrShareFile({
      filename,
      content: textContent,
      mimeType: 'text/plain',
      dialogTitle: `RPD: ${t.emotion} (${formatDate(t.date)})`,
    });

    if (result.success) {
      showToast('Registro de pensamento compartilhado / salvo.');
    } else {
      showToast(result.message || 'Não foi possível exportar este registro.');
    }
  };

  // Expandable history state
  const [expandedThoughtId, setExpandedThoughtId] = useState<string | null>(null);

  const toggleExpandThought = (id: string) => {
    setExpandedThoughtId((prev) => (prev === id ? null : id));
  };

  const stepMeta = [
    {
      num: 1,
      shortTitle: 'Situação',
      title: 'Situação e emoção',
      subtitle: 'Identificar o gatilho concreto e o pensamento automático imediato.',
    },
    {
      num: 2,
      shortTitle: 'Evidências',
      title: 'Examinar evidências',
      subtitle: 'Comparar fatos observáveis com interpretações alternativas.',
    },
    {
      num: 3,
      shortTitle: 'Equilíbrio',
      title: 'Perspectiva equilibrada',
      subtitle: 'Construir uma visão justa (não necessariamente positiva) e uma microação.',
    },
  ];

  const recentThoughts = data.thoughts.slice(0, 6);

  return (
    <section className="screen active" id="screen-pensamentos" aria-labelledby="title-pensamentos">
      {/* Intro Header */}
      <div className="intro">
        <div className="eyebrow">Registro de Pensamentos Disfuncionais (RPD)</div>
        <h1 id="title-pensamentos">Examine o pensamento, não o seu valor.</h1>
        <p className="sub">
          Pensamentos automáticos são hipóteses da mente, não fatos consumados. Use este roteiro de três passos para analisar a situação com calma e realismo.
        </p>
      </div>

      <div className="stack" style={{ gap: '14px' }}>
        {/* Main 3-Step Interactive Form Card */}
        <article className="card" style={{ padding: '16px 18px' }}>
          {/* Header with edit badge */}
          <div className="card-head" style={{ marginBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.05rem', margin: 0 }}>
                  {editingThoughtId ? 'Editar registro de pensamento' : 'Registro estruturado em 3 etapas'}
                </h2>
                {editingThoughtId && (
                  <span
                    className="mini-tag"
                    style={{ background: 'var(--sand)', color: 'var(--sand-ink)', fontWeight: 700 }}
                  >
                    Modo de edição
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '.82rem', color: 'var(--muted)' }}>
                {editingThoughtId
                  ? 'Altere os campos e clique em Salvar registro para atualizar.'
                  : 'Navegue livremente entre as etapas. Seus textos são preservados.'}
              </p>
            </div>
            {editingThoughtId ? (
              <button
                type="button"
                className="btn btn-plain btn-small"
                style={{ fontSize: '.76rem', padding: '4px 10px' }}
                onClick={handleCancelEdit}
              >
                Cancelar edição
              </button>
            ) : (
              <span className="tag" style={{ fontSize: '.75rem' }}>
                Etapa {currentStep + 1} de 3
              </span>
            )}
          </div>

          {/* Accessible Step Progress Tabs */}
          <nav
            aria-label="Etapas do registro de pensamento"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              marginBottom: '14px',
            }}
          >
            {stepMeta.map((s, idx) => {
              const isCurrent = currentStep === idx;
              const isPast = currentStep > idx;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  style={{
                    background: isCurrent ? 'var(--green-soft)' : 'var(--paper)',
                    border: '1.5px solid',
                    borderColor: isCurrent ? 'var(--green)' : isPast ? 'var(--line)' : 'var(--line)',
                    borderRadius: '12px',
                    padding: '8px 8px',
                    minHeight: '44px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all .15s ease',
                    userSelect: 'none',
                  }}
                  title={s.title}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '.74rem',
                      fontWeight: 700,
                      color: isCurrent ? 'var(--green-dark)' : 'var(--muted)',
                    }}
                  >
                    <span>{isPast ? '✓' : `${s.num}.`}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.shortTitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Current Step Description Callout */}
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '14px',
            }}
          >
            <strong style={{ fontSize: '.86rem', color: 'var(--ink)' }}>
              {stepMeta[currentStep].title}
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
              {stepMeta[currentStep].subtitle}
            </p>
          </div>

          {/* STEP 1: SITUATION & AUTOMATIC THOUGHT & EMOTION */}
          {currentStep === 0 && (
            <div className="thought-step active">
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="thoughtSituation">1. O que aconteceu? (Situação objetiva)</label>
                  <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                    {situation.length}/700
                  </span>
                </div>
                <textarea
                  id="thoughtSituation"
                  maxLength={700}
                  rows={3}
                  placeholder="Descreva a situação como uma câmera registraria (onde estava, com quem, o que ocorria)."
                  value={situation}
                  onChange={(e) => handleFieldChange('thoughtSituation', e.target.value)}
                  style={{ fontSize: '.88rem' }}
                />
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="thoughtAuto">
                    2. Qual pensamento automático passou pela cabeça?{' '}
                    <span style={{ color: 'var(--red-ink)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                    {automatic.length}/700
                  </span>
                </div>
                <textarea
                  id="thoughtAuto"
                  maxLength={700}
                  rows={3}
                  placeholder="A frase ou imagem instantânea que surgiu. Ex.: 'Não vou dar conta de entregar isso a tempo'."
                  value={automatic}
                  onChange={(e) => handleFieldChange('thoughtAuto', e.target.value)}
                  style={{ fontSize: '.88rem' }}
                />
                <p className="hint" style={{ marginTop: '3px', fontSize: '.76rem' }}>
                  Este é o pensamento central a ser investigado nas etapas seguintes.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px', alignItems: 'flex-start' }}>
                <div className="field">
                  <label htmlFor="thoughtEmotion">Emoção predominante</label>
                  <select
                    id="thoughtEmotion"
                    value={emotion}
                    onChange={(e) => handleFieldChange('thoughtEmotion', e.target.value)}
                    style={{ minHeight: '44px', fontSize: '16px' }}
                  >
                    {EMOTIONS.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <div className="range-top">
                    <label htmlFor="thoughtIntensity">Intensidade do desconforto</label>
                    <span
                      className="range-value"
                      style={{
                        background: 'var(--green-soft)',
                        color: 'var(--green-dark)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                      }}
                    >
                      {intensity}/100
                    </span>
                  </div>
                  <input
                    id="thoughtIntensity"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={intensity}
                    onChange={(e) => handleFieldChange('thoughtIntensity', e.target.value)}
                    style={{ minHeight: '44px' }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={intensity}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.74rem', color: 'var(--muted)' }}>
                    <span>0 · Nulo</span>
                    <span>50 · Moderado</span>
                    <span>100 · Máximo</span>
                  </div>
                  <p className="hint" style={{ margin: '4px 0 0', fontSize: '.75rem' }}>
                    Autoavaliação subjetiva do impacto emocional no momento do pensamento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EVIDENCE FOR AND AGAINST */}
          {currentStep === 1 && (
            <div className="thought-step active">
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="thoughtFor">3. Evidências que parecem apoiar o pensamento</label>
                  <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                    {evidenceFor.length}/700
                  </span>
                </div>
                <textarea
                  id="thoughtFor"
                  maxLength={700}
                  rows={4}
                  placeholder="Fatos concretos e comprováveis (não sentimentos, palpites ou medos) que sustentam essa ideia."
                  value={evidenceFor}
                  onChange={(e) => handleFieldChange('thoughtFor', e.target.value)}
                  style={{ fontSize: '.88rem' }}
                />
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="thoughtAgainst">
                    4. Evidências contrárias e outros pontos de vista
                  </label>
                  <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                    {evidenceAgainst.length}/700
                  </span>
                </div>
                <textarea
                  id="thoughtAgainst"
                  maxLength={700}
                  rows={4}
                  placeholder="O que contradiz esse pensamento? O que você diria a um amigo querido? Há outras explicações plausíveis?"
                  value={evidenceAgainst}
                  onChange={(e) => handleFieldChange('thoughtAgainst', e.target.value)}
                  style={{ fontSize: '.88rem' }}
                />
                <p className="hint" style={{ marginTop: '3px', fontSize: '.76rem' }}>
                  Dica: Pergunte a si mesmo: &quot;Que fatos concretos sustentam isso?&quot;, &quot;O que eu diria a um amigo querido?&quot; ou &quot;Qual é o cenário mais provável?&quot;.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: BALANCED PERSPECTIVE & NEXT STEP */}
          {currentStep === 2 && (
            <div className="thought-step active">
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="thoughtBalanced">
                    5. Resposta equilibrada e realista{' '}
                    <span style={{ color: 'var(--red-ink)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                    {balanced.length}/700
                  </span>
                </div>
                <textarea
                  id="thoughtBalanced"
                  maxLength={700}
                  rows={4}
                  placeholder="Uma síntese justa e equilibrada dos fatos. Não precisa ser otimista ou alegre, apenas justa com a realidade."
                  value={balanced}
                  onChange={(e) => handleFieldChange('thoughtBalanced', e.target.value)}
                  style={{ fontSize: '.88rem' }}
                />
                <p className="hint" style={{ marginTop: '4px', fontSize: '.78rem', lineHeight: 1.4 }}>
                  <strong>Lembrete da TCC:</strong> uma resposta equilibrada não é positividade ingênua (&quot;vai dar tudo certo&quot;). Ela reconhece a dificuldade real e aponta o que é possível manejar no momento.
                </p>
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="thoughtNext">6. Qual é o próximo passo possível?</label>
                  <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                    {nextStep.length}/180
                  </span>
                </div>
                <input
                  id="thoughtNext"
                  type="text"
                  maxLength={180}
                  placeholder="Uma microação de 2 a 5 minutos, ou decidir conscientemente retomar o assunto depois"
                  value={nextStep}
                  onChange={(e) => handleFieldChange('thoughtNext', e.target.value)}
                  style={{ minHeight: '42px', fontSize: '.88rem' }}
                />
                <p className="hint" style={{ marginTop: '3px', fontSize: '.76rem' }}>
                  Pode ser enviar uma mensagem, fazer uma pausa física ou agendar um horário para resolver.
                </p>
              </div>
            </div>
          )}

          {/* Step Navigation Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--line)',
            }}
          >
            <button
              className="btn btn-plain btn-small"
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              style={{ minHeight: '38px', padding: '6px 14px' }}
            >
              ← Etapa anterior
            </button>

            <div style={{ display: 'flex', gap: '6px' }}>
              {currentStep < 2 ? (
                <button
                  className="btn btn-soft btn-small"
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(2, prev + 1))}
                  style={{ minHeight: '38px', padding: '6px 16px', fontWeight: 700 }}
                >
                  Próxima etapa →
                </button>
              ) : (
                <button
                  className="btn btn-plain btn-small"
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  style={{ minHeight: '38px', padding: '6px 12px' }}
                >
                  Rever etapa 1
                </button>
              )}
            </div>
          </div>

          {/* Guia Clínico de Reflexão Socrática (TCC 100% Offline) */}
          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1rem' }} aria-hidden="true">💡</span>
              <strong style={{ fontSize: '.86rem', color: 'var(--ink)' }}>
                Perguntas de apoio socrático (Reflexão pessoal)
              </strong>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Na Terapia Cognitivo-Comportamental, o objetivo é desenvolver flexibilidade cognitiva por meio da auto-observação cuidadosa:
            </p>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '.76rem', color: 'var(--muted)', lineHeight: 1.45 }}>
              <li style={{ marginBottom: '3px' }}>
                <strong>Evidências reais:</strong> Que fatos concretos sustentam esse pensamento? E que fatos objetivos apontam em outra direção?
              </li>
              <li style={{ marginBottom: '3px' }}>
                <strong>Descentramento:</strong> Se um amigo de confiança estivesse exatamente na mesma situação com esse pensamento, o que eu diria a ele?
              </li>
              <li>
                <strong>Realismo vs. Catástrofe:</strong> Qual é o pior cenário possível? Qual é o cenário mais provável? Se algo difícil acontecesse, como eu poderia lidar com isso passo a passo?
              </li>
            </ul>
          </div>

          {/* Primary Action Buttons */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                type="button"
                style={{ flex: '2 1 200px', fontWeight: 700, minHeight: '44px', fontSize: '.92rem' }}
                onClick={handleSaveThought}
              >
                ✓ {editingThoughtId ? 'Salvar alterações' : 'Salvar registro concluído'}
              </button>

              <button
                className="btn btn-plain"
                type="button"
                style={{ flex: '1 1 140px', minHeight: '44px', fontSize: '.86rem' }}
                onClick={handleManualSaveDraft}
              >
                Salvar rascunho
              </button>
            </div>

            {/* Accessible Live Status Feedback */}
            <div
              role="status"
              aria-live="polite"
              style={{
                fontSize: '.78rem',
                color: saveStatus.startsWith('⚠️') ? 'var(--red-ink)' : 'var(--muted)',
                marginTop: '4px',
              }}
            >
              {saveStatus}
            </div>
          </div>
        </article>

        {/* Thought History Card */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div className="card-head" style={{ marginBottom: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>Registros anteriores</h2>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Seus pensamentos examinados guardados neste navegador.
              </p>
            </div>
            <span className="tag" style={{ fontSize: '.75rem' }}>
              {data.thoughts.length} {data.thoughts.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="list">
            {recentThoughts.length === 0 ? (
              <div
                className="empty"
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--paper)',
                  borderRadius: '12px',
                  border: '1px dashed var(--line)',
                  fontSize: '.82rem',
                }}
              >
                Nenhum registro de pensamento salvo ainda.
                <br />
                Preencha o formulário acima quando quiser examinar um pensamento desconfortável.
              </div>
            ) : (
              recentThoughts.map((t) => {
                const isExpanded = expandedThoughtId === t.id;

                return (
                  <div
                    key={t.id}
                    className="list-item"
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--line)',
                      background: 'var(--paper)',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      onClick={() => toggleExpandThought(t.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          className="mini-tag"
                          style={{
                            background: 'var(--green-soft)',
                            color: 'var(--green-dark)',
                            fontWeight: 700,
                            fontSize: '.74rem',
                          }}
                        >
                          {t.emotion} · {t.intensity}/100
                        </span>
                        <time style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                          {formatDate(t.date)}
                        </time>
                      </div>

                      <button
                        type="button"
                        className="btn btn-plain btn-small"
                        style={{ fontSize: '.74rem', padding: '3px 8px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandThought(t.id);
                        }}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? 'Recolher ▲' : 'Ver detalhes ▼'}
                      </button>
                    </div>

                    {/* Preview of Automatic Thought */}
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '.86rem',
                        color: 'var(--ink)',
                        lineHeight: 1.35,
                      }}
                    >
                      <strong>Pensamento:</strong> “{t.automatic}”
                    </p>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '10px',
                          borderTop: '1px solid var(--line)',
                          fontSize: '.82rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {t.situation && (
                          <p style={{ margin: 0 }}>
                            <strong style={{ color: 'var(--muted)' }}>Situação:</strong> {t.situation}
                          </p>
                        )}
                        {t.evidenceFor && (
                          <p style={{ margin: 0 }}>
                            <strong style={{ color: 'var(--muted)' }}>Evidências que apoiam:</strong>{' '}
                            {t.evidenceFor}
                          </p>
                        )}
                        {t.evidenceAgainst && (
                          <p style={{ margin: 0 }}>
                            <strong style={{ color: 'var(--muted)' }}>Evidências contrárias:</strong>{' '}
                            {t.evidenceAgainst}
                          </p>
                        )}
                        <p style={{ margin: 0 }}>
                          <strong style={{ color: 'var(--green-dark)' }}>Resposta equilibrada:</strong>{' '}
                          {t.balanced}
                        </p>
                        {t.next && (
                          <p style={{ margin: 0 }}>
                            <strong style={{ color: 'var(--muted)' }}>Próximo passo:</strong> {t.next}
                          </p>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            justifyContent: 'flex-end',
                            marginTop: '8px',
                            paddingTop: '6px',
                            borderTop: '1px dashed var(--line)',
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-plain btn-small"
                            style={{ fontSize: '.74rem', padding: '4px 10px' }}
                            onClick={() => handleExportSingleThought(t)}
                            title="Compartilhar ou exportar este registro em texto"
                          >
                            📤 Compartilhar
                          </button>
                          <button
                            type="button"
                            className="btn btn-plain btn-small"
                            style={{ fontSize: '.74rem', padding: '4px 10px' }}
                            onClick={() => handleBeginEditThought(t)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-plain btn-small"
                            style={{ fontSize: '.74rem', padding: '4px 10px', color: 'var(--red-ink)' }}
                            onClick={() => handleDeleteThought(t.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* Quiet Educational Reassurance & Emergency Information */}
        <div style={{ textAlign: 'center', padding: '4px 12px 16px', fontSize: '.78rem', color: 'var(--muted)' }}>
          <p style={{ margin: '0 0 4px' }}>
            O RPD é uma ferramenta de autorreflexão e não substitui psicoterapia ou suporte clínico.
          </p>
          <p style={{ margin: 0 }}>
            Em situações de crise emocional ou desespero, ligue gratuitamente para o <strong>CVV (188)</strong> ou para o <strong>SAMU (192)</strong>.
          </p>
        </div>
      </div>

      {/* Modal Acessível: Descarte de Rascunho para Edição */}
      <ConfirmModal
        isOpen={isConfirmDiscardOpen}
        title="Substituir rascunho em andamento?"
        message="Você possui alterações não salvas no formulário atual. Deseja descartá-las para carregar este registro do histórico para edição?"
        confirmText="Sim, carregar registro"
        cancelText="Continuar no rascunho"
        isDanger={false}
        onConfirm={() => {
          if (pendingDiscardThought) {
            applyEditThought(pendingDiscardThought);
          }
          setIsConfirmDiscardOpen(false);
          setPendingDiscardThought(null);
        }}
        onCancel={() => {
          setIsConfirmDiscardOpen(false);
          setPendingDiscardThought(null);
        }}
      />

      {/* Modal Acessível: Exclusão de Pensamento */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Excluir este registro de pensamento?"
        message="O registro selecionado será removido permanentemente do histórico local deste dispositivo."
        confirmText="Excluir registro"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={executeDeleteThought}
        onCancel={() => {
          setIsConfirmDeleteOpen(false);
          setPendingDeleteThoughtId(null);
        }}
      />
    </section>
  );
};
