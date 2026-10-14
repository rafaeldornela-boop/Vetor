import React, { useState, useEffect, useRef } from 'react';
import { ROUTINE_ANCHORS } from '../constants';
import { ScreenName, VetorData } from '../types';
import { makeId, today } from '../utils/format';

interface AcalmarScreenProps {
  data: VetorData;
  onUpdateData: (updater: (prev: VetorData) => VetorData) => boolean;
  onNavigate: (screen: ScreenName) => void;
  showToast: (msg: string) => void;
  onSetHojeTask?: (task: string) => void;
}

const BREATH_TOTAL = 300; // 5 minutes

export const AcalmarScreen: React.FC<AcalmarScreenProps> = ({
  data,
  onUpdateData,
  onNavigate,
  showToast,
  onSetHojeTask,
}) => {
  // Breathing state
  const [breathStartedAt, setBreathStartedAt] = useState<number | null>(null);
  const [breathElapsedBefore, setBreathElapsedBefore] = useState<number>(0);
  const [isBreathRunning, setIsBreathRunning] = useState<boolean>(false);
  const [breathMode, setBreathMode] = useState<'regular' | 'diaphragm'>('regular');
  const [pendingPracticeLabel, setPendingPracticeLabel] = useState<string>('');
  const [hasPause, setHasPause] = useState<boolean>(false);

  // Aerobic form
  const [aerobicType, setAerobicType] = useState<string>('Caminhada');
  const [aerobicMinutes, setAerobicMinutes] = useState<number>(5);

  // Worry form
  const [worryInput, setWorryInput] = useState<string>('');
  const [worryResult, setWorryResult] = useState<{ status: 'action' | 'later'; text: string } | null>(null);

  // Ref for breath card
  const breathCardRef = useRef<HTMLElement>(null);

  // Routine anchor
  const currentAnchor = data.settings.practiceAnchor || 'Ao acordar';

  const recordPractice = (label: string, notify = true) => {
    const saved = onUpdateData((prev) => {
      const newPractice = {
        id: makeId(),
        date: today(),
        createdAt: Date.now(),
        label,
        anchor: label === 'Respiração preventiva' ? (prev.settings.practiceAnchor || '') : '',
      };
      return {
        ...prev,
        practices: [newPractice, ...prev.practices].slice(0, 300),
      };
    });
    if (notify) {
      showToast(
        saved
          ? 'Prática registrada.'
          : 'Prática anotada apenas nesta sessão; armazenamento indisponível.'
      );
    }
    return saved;
  };

  // Breathing elapsed calculation
  const getElapsed = () => {
    return breathElapsedBefore + (breathStartedAt ? (Date.now() - breathStartedAt) / 1000 : 0);
  };

  const [currentElapsed, setCurrentElapsed] = useState<number>(0);

  useEffect(() => {
    if (!isBreathRunning) return;

    const interval = setInterval(() => {
      const elapsed = getElapsed();
      setCurrentElapsed(elapsed);

      if (elapsed >= BREATH_TOTAL) {
        setIsBreathRunning(false);
        setBreathStartedAt(null);
        setBreathElapsedBefore(0);
        setCurrentElapsed(0);
        const label =
          pendingPracticeLabel ||
          (breathMode === 'diaphragm' ? 'Respiração diafragmática' : 'Respiração controlada');
        setPendingPracticeLabel('');
        const saved = recordPractice(label, false);
        showToast(
          saved
            ? 'Pausa concluída. Prática registrada.'
            : 'Pausa concluída; o navegador não permitiu salvar o registro.'
        );
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isBreathRunning, breathStartedAt, breathElapsedBefore, pendingPracticeLabel, breathMode]);

  // Derived breath states
  const remaining = Math.max(0, Math.ceil(BREATH_TOTAL - currentElapsed));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const formattedTimer = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const cycleLength = hasPause ? 11 : 10;
  const cycle = currentElapsed % cycleLength;

  let circleClass = 'breath-circle';
  let instruction = 'Vamos começar';
  let subInstruction = 'No seu ritmo';

  if (isBreathRunning) {
    if (cycle < 5) {
      circleClass = 'breath-circle inhale';
      instruction = 'Inspire suavemente';
      subInstruction =
        breathMode === 'diaphragm' ? 'Observe o abdômen, sem forçar' : 'Pelo nariz, se confortável';
    } else if (hasPause && cycle < 6) {
      circleClass = 'breath-circle';
      instruction = 'Transição breve';
      subInstruction = 'Sem prender o ar à força';
    } else {
      circleClass = 'breath-circle exhale';
      instruction = 'Solte o ar';
      subInstruction = 'Lentamente, se confortável';
    }
  } else if (currentElapsed > 0 && currentElapsed < BREATH_TOTAL) {
    circleClass = 'breath-circle';
    instruction = 'Pausa';
    subInstruction = 'Respire naturalmente';
  } else if (currentElapsed >= BREATH_TOTAL) {
    circleClass = 'breath-circle';
    instruction = 'Exercício concluído';
    subInstruction = 'Volte ao seu ritmo natural';
  }

  const handleToggleBreath = () => {
    if (isBreathRunning) {
      // Pause
      setBreathElapsedBefore(getElapsed());
      setBreathStartedAt(null);
      setIsBreathRunning(false);
    } else {
      // Start or Resume
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
    setPendingPracticeLabel('');
  };

  const prepareBreathing = (mode: 'regular' | 'diaphragm', label: string) => {
    setIsBreathRunning(false);
    setBreathStartedAt(null);
    setBreathElapsedBefore(0);
    setCurrentElapsed(0);
    setBreathMode(mode);
    setPendingPracticeLabel(label);

    breathCardRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    showToast(
      label === 'Respiração preventiva'
        ? 'Quando estiver pronto, inicie a prática.'
        : 'Exercício preparado. Comece quando estiver pronto.'
    );
  };

  // Routine Anchor Change
  const handleAnchorChange = (val: string) => {
    const saved = onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        practiceAnchor: val,
      },
    }));
    if (!saved) {
      showToast('Escolha mantida apenas nesta sessão; armazenamento indisponível.');
    }
  };

  // Save Aerobic
  const handleSaveAerobic = () => {
    if (!Number.isInteger(aerobicMinutes) || aerobicMinutes < 1 || aerobicMinutes > 240) {
      showToast('Informe um tempo entre 1 e 240 minutos.');
      return;
    }
    const saved = onUpdateData((prev) => {
      const newAerobic = {
        id: makeId(),
        date: today(),
        createdAt: Date.now(),
        type: aerobicType,
        minutes: aerobicMinutes,
      };
      return {
        ...prev,
        aerobic: [newAerobic, ...prev.aerobic].slice(0, 300),
      };
    });
    showToast(
      saved
        ? 'Atividade física registrada.'
        : 'Atividade anotada apenas nesta sessão; armazenamento indisponível.'
    );
  };

  // Worry handler
  const handleSaveWorry = (status: 'action' | 'later') => {
    const trimmed = worryInput.trim();
    if (!trimmed) {
      showToast('Escreva uma frase sobre a preocupação.');
      return;
    }

    const saved = onUpdateData((prev) => {
      const newWorry = {
        id: makeId(),
        date: today(),
        createdAt: Date.now(),
        text: trimmed,
        status,
      };
      return {
        ...prev,
        worries: [newWorry, ...prev.worries].slice(0, 100),
      };
    });

    if (status === 'action') {
      setWorryResult({
        status: 'action',
        text: 'A preocupação foi colocada no campo de ação da tela Hoje. Ajuste-a até virar uma tarefa concreta e segura.',
      });
      setWorryInput('');
      if (onSetHojeTask) {
        onSetHojeTask(`Primeiro passo: ${trimmed}`);
      }
      onNavigate('hoje');
      showToast(
        saved
          ? 'Preocupação convertida em um passo pequeno.'
          : 'Passo preparado; o registro não ficou salvo no aparelho.'
      );
    } else {
      setWorryResult({
        status: 'later',
        text: 'Você pode retomar isso depois. Se for útil, anote um horário para pensar no assunto. Por agora, volte a uma atividade presente e manejável. Adiar não significa que a preocupação seja falsa ou irrelevante.',
      });
      setWorryInput('');
      showToast(
        saved
          ? 'Preocupação anotada para retomar depois.'
          : 'Preocupação anotada apenas nesta sessão.'
      );
    }
  };

  return (
    <section className="screen active" id="screen-acalmar" aria-labelledby="title-acalmar">
      <div className="intro">
        <div className="eyebrow">Pausa breve</div>
        <h1 id="title-acalmar">Acalmar, sem brigar com o que sente.</h1>
        <p className="sub">
          A meta não é obrigar a ansiedade a sumir. É abrir um pouco de espaço para decidir o próximo passo.
        </p>
      </div>

      <div className="stack">
        {/* Breathing Exercise Card */}
        <article className="card" id="breathCard" ref={breathCardRef}>
          <div className="card-head">
            <div>
              <h2>2. Respiração controlada durante o desconforto</h2>
              <p>
                Para praticar com tranquilidade ou atravessar um momento de desconforto. Respire suavemente, sem encher os pulmões à força.
              </p>
            </div>
            <span className="tag">Até 5 min</span>
          </div>

          <div className="breath-layout">
            <div className={circleClass} id="breathCircle">
              <div>
                <div className="breath-instruction" id="breathInstruction">
                  {instruction}
                </div>
                <div className="breath-sub" id="breathSub">
                  {subInstruction}
                </div>
              </div>
            </div>

            <div className="timer" id="breathTimer" style={{ fontSize: '2rem' }}>
              {formattedTimer}
            </div>

            <p className="hint" id="breathStatus">
              {breathMode === 'diaphragm'
                ? 'Coloque uma mão no abdômen e outra no peito, se confortável. Respire suavemente e observe o movimento sem forçar.'
                : 'Como referência, inspire suavemente pelo nariz por cerca de 5 segundos e solte o ar lentamente por cerca de 5. A contagem é opcional: respire naturalmente se acompanhar o ritmo aumentar o desconforto.'}
            </p>

            <label className="inline-control">
              <input
                type="checkbox"
                id="breathPauseToggle"
                checked={hasPause}
                onChange={(e) => setHasPause(e.target.checked)}
              />
              <span>
                Incluir uma pausa muito breve entre inspirar e expirar (opcional). Não force a retenção; desmarque se piorar o desconforto.
              </span>
            </label>

            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                id="breathBtn"
                type="button"
                onClick={handleToggleBreath}
              >
                {isBreathRunning
                  ? 'Ⅱ Pausar'
                  : currentElapsed > 0 && currentElapsed < BREATH_TOTAL
                  ? '▶ Retomar'
                  : currentElapsed >= BREATH_TOTAL
                  ? '▶ Fazer novamente'
                  : '▶ Iniciar exercício'}
              </button>
              <button
                className="btn btn-plain"
                id="breathResetBtn"
                type="button"
                onClick={handleResetBreath}
              >
                Reiniciar
              </button>
            </div>
          </div>

          <p className="hint" style={{ marginTop: '14px' }}>
            Se sentir tontura ou desconforto, interrompa o ritmo guiado e deixe a respiração voltar ao natural. Você não precisa concluir os cinco minutos. Falta de ar nova, intensa, persistente ou diferente do habitual não deve ser atribuída automaticamente à ansiedade.
          </p>
        </article>

        {/* Other Management Techniques */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Outras ferramentas de manejo</h2>
              <p>Escolha uma técnica conforme o momento. Não é necessário fazer todas, nem fazê-las perfeitamente.</p>
            </div>
            <span className="tag">Escolha livre</span>
          </div>

          <div className="technique-list">
            <details open>
              <summary>1. Respiração preventiva — praticar quando estiver tranquilo</summary>
              <p>
                A prática regular ajuda você a se familiarizar com a técnica antes de precisar dela. A orientação recebida sugeriu três ou quatro momentos breves ao longo do dia; use essa frequência apenas como referência, sem transformar a prática em cobrança. Escolha um momento que já faça parte da rotina, em vez de depender apenas da memória.
              </p>
              <div className="field compact">
                <label htmlFor="practiceAnchor">Associar a este momento da rotina</label>
                <select
                  id="practiceAnchor"
                  value={currentAnchor}
                  onChange={(e) => handleAnchorChange(e.target.value)}
                >
                  {ROUTINE_ANCHORS.map((anchor) => (
                    <option key={anchor} value={anchor}>
                      {anchor}
                    </option>
                  ))}
                </select>
              </div>
              <p className="hint">
                O aplicativo guarda sua escolha, mas não envia alarmes nem notificações em segundo plano. O objetivo é usar um hábito já existente como lembrete.
              </p>
              <button
                className="btn btn-primary btn-full"
                type="button"
                onClick={() => prepareBreathing('regular', 'Respiração preventiva')}
              >
                Preparar prática de 5 minutos
              </button>
              <p className="status-inline" id="preventiveNote">
                Lembrete escolhido: “{currentAnchor}”. Ao concluir o exercício guiado, a prática será registrada no histórico.
              </p>
            </details>

            <details>
              <summary>3. Respiração diafragmática</summary>
              <p>
                Sente-se com apoio ou deite-se se for confortável. Coloque uma mão no abdômen e outra no peito. Inspire suavemente e observe se o abdômen se move um pouco; solte o ar sem empurrá-lo para fora. Não tente imobilizar o tórax nem conseguir uma respiração “perfeita”.
              </p>
              <p>
                Se focar na respiração aumentar o desconforto, abandone esta técnica e volte a atenção para o ambiente.
              </p>
              <button
                className="btn btn-soft btn-full"
                type="button"
                onClick={() => prepareBreathing('diaphragm', 'Respiração diafragmática')}
              >
                Usar no exercício respiratório acima
              </button>
            </details>

            <details>
              <summary>4. Ajuste da postura e relaxamento corporal</summary>
              <p>Encontre uma posição estável, sentado ou deitado. Sem mudar tudo de uma vez, observe e alivie a tensão em:</p>
              <ol>
                <li>Ombros e pescoço: deixe-os baixar sem forçar.</li>
                <li>Mandíbula: afaste levemente os dentes e solte a língua.</li>
                <li>Mãos: descruze os dedos e reduza a força com que os contrai.</li>
              </ol>
              <p>Combine com uma expiração tranquila. O objetivo é reduzir um pouco a tensão, não atingir relaxamento total.</p>
              <button
                className="btn btn-soft btn-full"
                type="button"
                onClick={() => recordPractice('Postura e relaxamento corporal')}
              >
                Registrar que pratiquei
              </button>
            </details>

            <details>
              <summary>5. Redirecionamento da atenção</summary>
              <p>
                A ideia não é apagar a ansiedade, mas evitar que toda a atenção fique presa aos batimentos, à respiração ou ao medo. Escolha uma opção:
              </p>
              <ul>
                <li>
                  <strong>Visão:</strong> descreva a forma, a cor, a textura e os detalhes de um objeto.
                </li>
                <li>
                  <strong>Audição:</strong> identifique sons próximos e distantes.
                </li>
                <li>
                  <strong>Atenção alternada:</strong> observe um objeto, depois outro, descrevendo mentalmente cada um.
                </li>
                <li>
                  <strong>Olhos fechados:</strong> só se for confortável e seguro; use os sons como referência.
                </li>
              </ul>
              <p>O exercício 5–4–3–2–1 logo abaixo é outra forma de orientar os sentidos.</p>
              <button
                className="btn btn-soft btn-full"
                type="button"
                onClick={() => recordPractice('Redirecionamento da atenção')}
              >
                Registrar prática de atenção
              </button>
            </details>

            <details>
              <summary>6. Afastamento temporário de um ambiente estimulante</summary>
              <p>
                Se o local estiver intensificando o desconforto e for seguro fazê-lo, peça licença e vá por alguns minutos para um espaço menos estimulante. Ajuste a postura, use uma técnica confortável e avalie quando retomar a atividade.
              </p>
              <div className="subtle-box">
                <strong>Importante:</strong> sair não precisa ser uma condição para enfrentar toda situação. Quando possível, retome suas atividades gradualmente, evitando transformar a saída em uma regra obrigatória para se sentir seguro.
              </div>
              <button
                className="btn btn-soft btn-full"
                type="button"
                onClick={() => recordPractice('Pausa temporária em ambiente estimulante')}
              >
                Registrar que usei uma pausa
              </button>
            </details>

            <details>
              <summary>7. Estímulo frio — recurso opcional</summary>
              <p>
                Se for confortável, segure brevemente uma bolsa fria envolvida em tecido ou use um pano fresco. Observe a sensação e continue percebendo o ambiente. Os efeitos variam; não há garantia de que interrompa a crise e isso não é uma técnica essencial.
              </p>
              <div className="notice" style={{ marginTop: '10px' }}>
                <strong>Segurança</strong> Não coloque gelo diretamente sobre a pele, não prolongue a exposição e não use estímulos extremos. Evite o recurso se tiver uma condição que torne o frio inadequado.
              </div>
              <button
                className="btn btn-soft btn-full"
                type="button"
                onClick={() => recordPractice('Estímulo frio opcional')}
              >
                Registrar uso opcional
              </button>
            </details>

            <details>
              <summary>8. Exercício aeróbico leve e regular</summary>
              <p>
                Caminhada ou bicicleta em intensidade que permita conversar sem grande dificuldade são opções. Comece pelo que é tolerável e aumente gradualmente. Não é necessário evitar toda elevação dos batimentos; o ritmo deve respeitar seu condicionamento e as orientações profissionais.
              </p>
              <p>
                Como referência geral, a OMS recomenda para adultos 150–300 minutos semanais de atividade moderada. É uma meta de saúde pública, não uma exigência imediata: alguma atividade é melhor do que nenhuma, e você pode começar com poucos minutos.
              </p>
              <div className="split">
                <div className="field compact">
                  <label htmlFor="aerobicType">Atividade</label>
                  <select
                    id="aerobicType"
                    value={aerobicType}
                    onChange={(e) => setAerobicType(e.target.value)}
                  >
                    <option value="Caminhada">Caminhada</option>
                    <option value="Bicicleta">Bicicleta</option>
                    <option value="Outra atividade leve">Outra atividade leve</option>
                  </select>
                </div>
                <div className="field compact">
                  <label htmlFor="aerobicMinutes">Minutos realizados</label>
                  <input
                    id="aerobicMinutes"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="240"
                    step="1"
                    value={aerobicMinutes}
                    onChange={(e) => setAerobicMinutes(Number(e.target.value))}
                  />
                </div>
              </div>
              <button
                className="btn btn-primary btn-full"
                type="button"
                onClick={handleSaveAerobic}
              >
                Registrar atividade física
              </button>
            </details>
          </div>
        </article>

        {/* 5-4-3-2-1 Sensory Card */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Orientação sensorial: 5–4–3–2–1</h2>
              <p>Prática guiada da técnica de redirecionamento da atenção. Não há respostas certas ou erradas.</p>
            </div>
            <span className="tag">5–4–3–2–1</span>
          </div>
          <div className="sense-step">
            <span className="sense-num">5</span>
            <div>
              <strong>Veja cinco coisas</strong>
              <span>Observe cores, formas e objetos ao seu redor.</span>
            </div>
          </div>
          <div className="sense-step">
            <span className="sense-num">4</span>
            <div>
              <strong>Sinta quatro sensações físicas</strong>
              <span>Note os pés no chão, o encosto, a roupa ou a temperatura.</span>
            </div>
          </div>
          <div className="sense-step">
            <span className="sense-num">3</span>
            <div>
              <strong>Escute três sons</strong>
              <span>Inclua sons distantes e próximos, sem julgá-los.</span>
            </div>
          </div>
          <div className="sense-step">
            <span className="sense-num">2</span>
            <div>
              <strong>Perceba dois cheiros</strong>
              <span>Se não sentir cheiros, apenas pule esta etapa.</span>
            </div>
          </div>
          <div className="sense-step">
            <span className="sense-num">1</span>
            <div>
              <strong>Note um gosto ou uma sensação na boca</strong>
              <span>Não force nada; basta direcionar a atenção.</span>
            </div>
          </div>
        </article>

        {/* Worry Card */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Separar preocupação de ação</h2>
              <p>Nem todo pensamento precisa ser resolvido neste instante.</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="worryInput">O que está ocupando sua cabeça?</label>
            <textarea
              id="worryInput"
              maxLength={500}
              placeholder="Escreva em uma frase, sem precisar organizar tudo."
              value={worryInput}
              onChange={(e) => setWorryInput(e.target.value)}
            />
          </div>
          <p className="field-label">
            Existe algo concreto e seguro que você possa fazer nos próximos 10 minutos?
          </p>
          <div className="split" style={{ marginTop: '9px' }}>
            <button
              className="btn btn-primary btn-full"
              type="button"
              onClick={() => handleSaveWorry('action')}
            >
              Sim, dar um passo
            </button>
            <button
              className="btn btn-plain btn-full"
              type="button"
              onClick={() => handleSaveWorry('later')}
            >
              Não agora
            </button>
          </div>
          {worryResult && (
            <div className="notice" style={{ marginTop: '12px' }} role="status">
              <strong>
                {worryResult.status === 'action'
                  ? 'Transforme em um passo pequeno.'
                  : 'Você pode retomar isso depois.'}
              </strong>
              {worryResult.text}
            </div>
          )}
        </article>

        {/* Medical and Emergency Notices */}
        <details>
          <summary>Quando a falta de ar precisa de avaliação médica</summary>
          <p>
            Não atribua automaticamente à ansiedade todo episódio de falta de ar, dor no peito ou palpitação. Procure atendimento urgente se a falta de ar for nova, intensa, persistente ou diferente do habitual, especialmente se houver dor/pressão no peito, desmaio, confusão ou dificuldade importante para respirar. Em emergência no Brasil, ligue para o SAMU 192 ou vá a um pronto-socorro.
          </p>
        </details>

        <details>
          <summary>Quando procurar ajuda imediata</summary>
          <p>
            Se houver risco de se machucar ou você não conseguir se manter em segurança, procure uma pessoa de confiança e atendimento presencial imediatamente. No Brasil, ligue para o SAMU (192) em emergência ou vá a uma UPA/pronto-socorro. O CVV atende pelo 188 para apoio emocional, gratuitamente; ele não substitui o atendimento de emergência.
          </p>
          <p style={{ marginTop: '8px' }}>
            <a
              href="https://www.gov.br/saude/pt-br/composicao/saes/samu-192"
              target="_blank"
              rel="noopener noreferrer"
            >
              Informações oficiais sobre o SAMU 192
            </a>{' '}
            ·{' '}
            <a href="https://cvv.org.br/" target="_blank" rel="noopener noreferrer">
              CVV
            </a>
          </p>
        </details>
      </div>
    </section>
  );
};
