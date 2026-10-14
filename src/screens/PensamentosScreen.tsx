import React, { useState, useEffect } from 'react';
import { EMOTIONS } from '../constants';
import { Thought, ThoughtDraft, VetorData } from '../types';
import { formatDate, makeId, today } from '../utils/format';

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

  // Draft or initial values
  const draft = data.thoughtDraft || {};
  const [situation, setSituation] = useState<string>(draft.thoughtSituation || '');
  const [automatic, setAutomatic] = useState<string>(draft.thoughtAuto || '');
  const [emotion, setEmotion] = useState<string>(draft.thoughtEmotion || 'Ansiedade');
  const [intensity, setIntensity] = useState<number>(
    typeof draft.thoughtIntensity === 'number'
      ? draft.thoughtIntensity
      : draft.thoughtIntensity ? Number(draft.thoughtIntensity) : 70
  );
  const [evidenceFor, setEvidenceFor] = useState<string>(draft.thoughtFor || '');
  const [evidenceAgainst, setEvidenceAgainst] = useState<string>(draft.thoughtAgainst || '');
  const [balanced, setBalanced] = useState<string>(draft.thoughtBalanced || '');
  const [nextStep, setNextStep] = useState<string>(draft.thoughtNext || '');
  const [draftHint, setDraftHint] = useState<string>(
    'O rascunho é salvo neste navegador enquanto você preenche.'
  );

  // Sync draft on input change
  const updateDraft = (newDraft: ThoughtDraft, notify = false) => {
    const saved = onUpdateData((prev) => ({
      ...prev,
      thoughtDraft: newDraft,
    }));
    if (notify) {
      showToast(saved ? 'Rascunho salvo.' : 'Não foi possível salvar o rascunho.');
    }
    setDraftHint(
      saved
        ? 'Rascunho salvo neste navegador. Você pode voltar depois.'
        : 'Não foi possível persistir o rascunho neste navegador.'
    );
  };

  const handleFieldChange = (field: keyof ThoughtDraft, value: string | number) => {
    if (field === 'thoughtSituation') setSituation(value as string);
    if (field === 'thoughtAuto') setAutomatic(value as string);
    if (field === 'thoughtEmotion') setEmotion(value as string);
    if (field === 'thoughtIntensity') setIntensity(Number(value));
    if (field === 'thoughtFor') setEvidenceFor(value as string);
    if (field === 'thoughtAgainst') setEvidenceAgainst(value as string);
    if (field === 'thoughtBalanced') setBalanced(value as string);
    if (field === 'thoughtNext') setNextStep(value as string);

    updateDraft({
      thoughtSituation: field === 'thoughtSituation' ? (value as string) : situation,
      thoughtAuto: field === 'thoughtAuto' ? (value as string) : automatic,
      thoughtEmotion: field === 'thoughtEmotion' ? (value as string) : emotion,
      thoughtIntensity: field === 'thoughtIntensity' ? Number(value) : intensity,
      thoughtFor: field === 'thoughtFor' ? (value as string) : evidenceFor,
      thoughtAgainst: field === 'thoughtAgainst' ? (value as string) : evidenceAgainst,
      thoughtBalanced: field === 'thoughtBalanced' ? (value as string) : balanced,
      thoughtNext: field === 'thoughtNext' ? (value as string) : nextStep,
    });
  };

  const handleManualSaveDraft = () => {
    updateDraft(
      {
        thoughtSituation: situation,
        thoughtAuto: automatic,
        thoughtEmotion: emotion,
        thoughtIntensity: intensity,
        thoughtFor: evidenceFor,
        thoughtAgainst: evidenceAgainst,
        thoughtBalanced: balanced,
        thoughtNext: nextStep,
      },
      true
    );
  };

  const handleSaveThought = () => {
    const trimmedAuto = automatic.trim();
    const trimmedBalanced = balanced.trim();

    if (!trimmedAuto) {
      showToast('Comece registrando o pensamento automático.');
      setCurrentStep(0);
      return;
    }

    if (!trimmedBalanced) {
      showToast('Escreva uma resposta mais equilibrada, mesmo que provisória.');
      setCurrentStep(2);
      return;
    }

    const newThought: Thought = {
      id: makeId(),
      date: today(),
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

    const saved = onUpdateData((prev) => ({
      ...prev,
      thoughts: [newThought, ...prev.thoughts].slice(0, 200),
      thoughtDraft: {},
    }));

    // Reset form
    setSituation('');
    setAutomatic('');
    setEmotion('Ansiedade');
    setIntensity(70);
    setEvidenceFor('');
    setEvidenceAgainst('');
    setBalanced('');
    setNextStep('');
    setCurrentStep(0);
    setDraftHint('Registro salvo. Um novo rascunho pode ser iniciado quando quiser.');

    showToast(
      saved
        ? 'Registro salvo neste navegador.'
        : 'Registro disponível apenas nesta sessão; armazenamento indisponível.'
    );
  };

  const stepLabels = [
    'Etapa 1 de 3 · Situação e emoção',
    'Etapa 2 de 3 · Examinar as evidências',
    'Etapa 3 de 3 · Resposta equilibrada e próximo passo',
  ];

  const recentThoughts = data.thoughts.slice(0, 6);

  return (
    <section className="screen active" id="screen-pensamentos" aria-labelledby="title-pensamentos">
      <div className="intro">
        <div className="eyebrow">Técnica inspirada na TCC</div>
        <h1 id="title-pensamentos">Examine o pensamento, não o seu valor.</h1>
        <p className="sub">
          Pensamentos podem parecer fatos quando estamos sob pressão. Registre o que aconteceu e procure uma resposta mais equilibrada, sem positividade forçada.
        </p>
      </div>

      <div className="stack">
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Registro breve de pensamento</h2>
              <p>Preencha o que conseguir. Você pode deixar campos opcionais em branco.</p>
            </div>
            <span className="tag">2–5 min</span>
          </div>

          {/* Progress Indicator */}
          <div className="step-progress" aria-label="Etapa do registro">
            <span className={currentStep >= 0 ? 'on' : ''} />
            <span className={currentStep >= 1 ? 'on' : ''} />
            <span className={currentStep >= 2 ? 'on' : ''} />
          </div>

          <p className="hint" style={{ marginBottom: '10px' }}>
            {stepLabels[currentStep]}
          </p>

          {/* Step 0: Situation & Emotion */}
          {currentStep === 0 && (
            <div className="thought-step active">
              <div className="field">
                <label htmlFor="thoughtSituation">1. O que aconteceu?</label>
                <textarea
                  id="thoughtSituation"
                  maxLength={700}
                  placeholder="Descreva a situação como uma câmera registraria."
                  value={situation}
                  onChange={(e) => handleFieldChange('thoughtSituation', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="thoughtAuto">2. Qual pensamento passou pela sua cabeça?</label>
                <textarea
                  id="thoughtAuto"
                  maxLength={700}
                  placeholder="Ex.: vou falhar; não dou conta; nada vai melhorar."
                  value={automatic}
                  onChange={(e) => handleFieldChange('thoughtAuto', e.target.value)}
                />
              </div>
              <div className="split">
                <div className="field">
                  <label htmlFor="thoughtEmotion">Emoção principal</label>
                  <select
                    id="thoughtEmotion"
                    value={emotion}
                    onChange={(e) => handleFieldChange('thoughtEmotion', e.target.value)}
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
                    <label htmlFor="thoughtIntensity">Intensidade</label>
                    <span className="range-value">{intensity}/100</span>
                  </div>
                  <input
                    id="thoughtIntensity"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={intensity}
                    onChange={(e) => handleFieldChange('thoughtIntensity', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Evidences */}
          {currentStep === 1 && (
            <div className="thought-step active">
              <div className="field">
                <label htmlFor="thoughtFor">3. O que parece apoiar esse pensamento?</label>
                <textarea
                  id="thoughtFor"
                  maxLength={700}
                  placeholder="Fatos concretos, não apenas medos ou impressões."
                  value={evidenceFor}
                  onChange={(e) => handleFieldChange('thoughtFor', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="thoughtAgainst">4. O que não combina totalmente com ele? Há outra explicação?</label>
                <textarea
                  id="thoughtAgainst"
                  maxLength={700}
                  placeholder="O que você diria a alguém de quem gosta? O que está deixando de considerar?"
                  value={evidenceAgainst}
                  onChange={(e) => handleFieldChange('thoughtAgainst', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Balanced Response & Next Step */}
          {currentStep === 2 && (
            <div className="thought-step active">
              <div className="field">
                <label htmlFor="thoughtBalanced">5. Uma resposta mais equilibrada</label>
                <textarea
                  id="thoughtBalanced"
                  maxLength={700}
                  placeholder="Realista e justa — não precisa ser otimista. Ex.: está difícil, mas posso começar por uma parte."
                  value={balanced}
                  onChange={(e) => handleFieldChange('thoughtBalanced', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="thoughtNext">6. Qual é o próximo passo possível?</label>
                <input
                  id="thoughtNext"
                  type="text"
                  maxLength={180}
                  placeholder="Uma ação pequena, ou decidir quando retomar o assunto"
                  value={nextStep}
                  onChange={(e) => handleFieldChange('thoughtNext', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="btn-row">
            <button
              className="btn btn-plain"
              type="button"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            >
              Voltar
            </button>
            <button
              className="btn btn-soft"
              style={{ flex: 1 }}
              type="button"
              onClick={() => setCurrentStep((prev) => (prev === 2 ? 0 : prev + 1))}
            >
              {currentStep === 2 ? 'Voltar ao início' : 'Próxima etapa'}
            </button>
          </div>

          <div className="btn-row">
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              type="button"
              onClick={handleSaveThought}
            >
              Salvar registro
            </button>
            <button
              className="btn btn-plain"
              style={{ flex: 1 }}
              type="button"
              onClick={handleManualSaveDraft}
            >
              Salvar parcialmente
            </button>
          </div>

          <p className="hint" role="status" style={{ marginTop: '8px' }}>
            {draftHint}
          </p>
          <p className="hint" style={{ marginTop: '9px' }}>
            Este exercício é uma ferramenta de reflexão. Não é necessário contestar todo pensamento nem fazer isso durante uma crise intensa.
          </p>
        </article>

        {/* Thought History Card */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Seus registros recentes</h2>
              <p>Guardados neste navegador.</p>
            </div>
            <span className="tag">
              {data.thoughts.length} {data.thoughts.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="list">
            {recentThoughts.length === 0 ? (
              <div className="empty">
                Seus registros aparecerão aqui depois que você salvar o primeiro.
              </div>
            ) : (
              recentThoughts.map((t) => (
                <div key={t.id} className="list-item">
                  <div className="list-item-top">
                    <strong>
                      {t.emotion} · {t.intensity}/100
                    </strong>
                    <time>{formatDate(t.date)}</time>
                  </div>
                  <p>
                    <strong>Pensamento:</strong> {t.automatic}
                  </p>
                  <p>
                    <strong>Resposta equilibrada:</strong> {t.balanced}
                  </p>
                  {t.next && (
                    <p>
                      <strong>Próximo passo:</strong> {t.next}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
};
