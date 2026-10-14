import React, { useState, useRef } from 'react';
import { VetorData } from '../types';
import {
  copyText,
  formatDate,
  generateSummaryText,
  localDate,
  today,
} from '../utils/format';
import { clearAllData } from '../utils/storage';
import { createInitialData } from '../constants';

interface ProgressoScreenProps {
  data: VetorData;
  onUpdateData: (updater: (prev: VetorData) => VetorData) => boolean;
  onResetData: () => void;
  showToast: (msg: string) => void;
}

export const ProgressoScreen: React.FC<ProgressoScreenProps> = ({
  data,
  onUpdateData,
  onResetData,
  showToast,
}) => {
  const [weeklyReflection, setWeeklyReflection] = useState<string>(
    data.settings.weeklyReflection || ''
  );
  const restoreFileRef = useRef<HTMLInputElement>(null);

  // Calculate 7-day stats
  const days: { iso: string; checkin: VetorData['checkins'][number] | undefined }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const iso = localDate(d);
    days.push({ iso, checkin: data.checkins.find((c) => c.date === iso) });
  }

  const checkinRecords = days.map((d) => d.checkin).filter(Boolean);
  const avgMood = checkinRecords.length
    ? (
        checkinRecords.reduce((s, c) => s + Number(c?.mood || 0), 0) /
        checkinRecords.length
      )
        .toFixed(1)
        .replace('.', ',')
    : '—';

  const avgAnxiety = checkinRecords.length
    ? (
        checkinRecords.reduce((s, c) => s + Number(c?.anxiety || 0), 0) /
        checkinRecords.length
      )
        .toFixed(1)
        .replace('.', ',')
    : '—';

  const weekCheckinsCount = `${checkinRecords.length}/7`;
  const weekStartIso = days[0].iso;
  const weekEndIso = days[6].iso;

  const weekActivitiesCount = data.activities.filter(
    (a) => a.date >= weekStartIso && a.date <= weekEndIso
  ).length;

  const weekTechniquesCount = data.practices.filter(
    (p) => p.date >= weekStartIso && p.date <= weekEndIso
  ).length;

  const weekAerobicMinutes = data.aerobic
    .filter((a) => a.date >= weekStartIso && a.date <= weekEndIso)
    .reduce((sum, a) => sum + Number(a.minutes || 0), 0);

  // Save weekly reflection
  const handleSaveReflection = () => {
    const saved = onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        weeklyReflection,
      },
    }));
    showToast(
      saved
        ? 'Reflexão semanal salva.'
        : 'Não foi possível salvar neste navegador.'
    );
  };

  // Copy summary
  const handleCopySummary = async () => {
    const ok = await copyText(generateSummaryText(data));
    showToast(ok ? 'Resumo copiado.' : 'Não foi possível copiar. Tente pelo navegador.');
  };

  // Download backup
  const handleDownloadBackup = () => {
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              app: 'Vetor TCC',
              version: 4,
              exportedAt: new Date().toISOString(),
              data,
            },
            null,
            2
          ),
        ],
        { type: 'application/json;charset=utf-8' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vetor-backup-${today()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Backup preparado para download.');
    } catch {
      showToast('Não foi possível gerar o backup neste navegador.');
    }
  };

  // Restore backup
  const handleRestoreBackup = async () => {
    const file = restoreFileRef.current?.files?.[0];
    if (!file) {
      showToast('Selecione um arquivo de backup JSON.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('O arquivo é grande demais para restaurar com segurança.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const incoming = (
        parsed && typeof parsed === 'object'
          ? (parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed)
          : null
      ) as Partial<VetorData> | null;

      if (
        !incoming ||
        !Array.isArray(incoming.checkins) ||
        !Array.isArray(incoming.activities) ||
        !Array.isArray(incoming.thoughts)
      ) {
        showToast('O arquivo não parece ser um backup válido do Vetor.');
        return;
      }

      if (
        !window.confirm(
          'Restaurar esta cópia substituirá os dados atuais deste aplicativo neste navegador. Continue?'
        )
      ) {
        return;
      }

      const base = createInitialData();
      const merged: VetorData = {
        ...base,
        ...incoming,
        checkins: incoming.checkins,
        activities: incoming.activities,
        thoughts: incoming.thoughts,
        worries: Array.isArray(incoming.worries) ? incoming.worries : [],
        practices: Array.isArray(incoming.practices) ? incoming.practices : [],
        aerobic: Array.isArray(incoming.aerobic) ? incoming.aerobic : [],
        customPractices: Array.isArray(incoming.customPractices)
          ? incoming.customPractices
          : [],
        dailyPractices: Array.isArray(incoming.dailyPractices)
          ? incoming.dailyPractices
          : [],
        thoughtDraft:
          incoming.thoughtDraft && typeof incoming.thoughtDraft === 'object'
            ? incoming.thoughtDraft
            : {},
        habits:
          incoming.habits && typeof incoming.habits === 'object'
            ? incoming.habits
            : {},
        settings: { ...base.settings, ...(incoming.settings || {}) },
      };

      const saved = onUpdateData(() => merged);
      if (restoreFileRef.current) restoreFileRef.current.value = '';
      setWeeklyReflection(merged.settings.weeklyReflection || '');
      showToast(
        saved
          ? 'Backup restaurado neste navegador.'
          : 'Dados carregados apenas nesta sessão; armazenamento indisponível.'
      );
    } catch {
      showToast('Não foi possível ler este arquivo. Verifique se é um backup JSON válido.');
    }
  };

  // Delete all data
  const handleDeleteAllData = () => {
    const confirmation = window.prompt(
      'Para apagar todos os registros deste app neste navegador, digite APAGAR.'
    );
    if (confirmation !== 'APAGAR') {
      showToast('Nenhum dado foi apagado.');
      return;
    }

    clearAllData();
    onResetData();
    setWeeklyReflection('');
    showToast('Registros locais apagados.');
  };

  // Practice & Aerobic combined history
  const combinedPractices = [
    ...data.practices.map((x) => ({
      date: x.date,
      createdAt: x.createdAt,
      label: x.label,
      detail: x.anchor ? `Rotina associada: ${x.anchor}` : '',
    })),
    ...data.aerobic.map((x) => ({
      date: x.date,
      createdAt: x.createdAt,
      label: x.type,
      detail: `${x.minutes} minuto(s) de atividade aeróbica`,
    })),
  ]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 8);

  return (
    <section className="screen active" id="screen-progresso" aria-labelledby="title-progresso">
      <div className="intro">
        <div className="eyebrow">Perceber padrões sem se julgar</div>
        <h1 id="title-progresso">Progresso não é uma linha reta.</h1>
        <p className="sub">
          Use os dados como informação, não como avaliação de sucesso ou fracasso.
        </p>
      </div>

      <div className="stack">
        {/* 7 Days Overview */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Últimos 7 dias</h2>
              <p>Resumo baseado nos seus check-ins salvos.</p>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat">
              <strong id="avgMood">{avgMood}</strong>
              <span>Ânimo médio / 5</span>
            </div>
            <div className="stat">
              <strong id="avgAnxiety">{avgAnxiety}</strong>
              <span>Ansiedade média / 5</span>
            </div>
            <div className="stat">
              <strong id="weekCheckins">{weekCheckinsCount}</strong>
              <span>Dias com check-in</span>
            </div>
            <div className="stat">
              <strong id="weekActivities">{weekActivitiesCount}</strong>
              <span>Ações registradas</span>
            </div>
            <div className="stat">
              <strong id="weekTechniques">{weekTechniquesCount}</strong>
              <span>Práticas de regulação</span>
            </div>
            <div className="stat">
              <strong id="weekAerobic">{weekAerobicMinutes} min</strong>
              <span>Atividade aeróbica</span>
            </div>
          </div>

          <div className="section-label" style={{ marginTop: '17px' }}>
            Ânimo registrado por dia
          </div>

          <div className="week-chart" id="weekChart">
            {days.map((d) => {
              const mood = d.checkin ? Math.max(0, Math.min(5, Number(d.checkin.mood || 0))) : 0;
              return (
                <div key={d.iso} className="week-row">
                  <span>{formatDate(d.iso, { weekday: 'short' })}</span>
                  <div
                    className="bar-track"
                    aria-label={`Ânimo ${d.checkin ? mood + '/5' : 'sem registro'}`}
                  >
                    <div className="bar-fill" style={{ width: `${mood * 20}%` }} />
                  </div>
                  <span>{d.checkin ? `${mood}/5` : '—'}</span>
                </div>
              );
            })}
          </div>

          <div className="review-prompt">
            <div className="field">
              <label htmlFor="weeklyReflection">
                Revisão semanal opcional: o que pareceu útil? O que gostaria de ajustar?
              </label>
              <textarea
                id="weeklyReflection"
                maxLength={1200}
                placeholder="Sem nota nem julgamento: observe o que ajudou, o que pesou e um ajuste possível."
                value={weeklyReflection}
                onChange={(e) => setWeeklyReflection(e.target.value)}
              />
              <button
                className="btn btn-soft btn-full"
                type="button"
                id="saveWeeklyReflectionBtn"
                onClick={handleSaveReflection}
              >
                Salvar reflexão
              </button>
            </div>
            <p className="hint">
              A frequência de registros mostra apenas o que foi anotado no app; não mede sua saúde mental nem seu valor.
            </p>
          </div>
        </article>

        {/* Recent Actions */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Ações recentes</h2>
              <p>Conta ter tentado, inclusive em dias difíceis.</p>
            </div>
            <span className="tag">{data.activities.length}</span>
          </div>

          <div className="list">
            {data.activities.length === 0 ? (
              <div className="empty">
                Suas ações registradas aparecerão aqui. O tamanho do passo não determina o seu valor.
              </div>
            ) : (
              data.activities.slice(0, 7).map((a) => (
                <div key={a.id} className="list-item">
                  <div className="list-item-top">
                    <strong>{a.task}</strong>
                    <time>
                      {formatDate(a.date)}
                      {a.legacyTime ? ` · ${a.legacyTime}` : ''}
                    </time>
                  </div>
                  <p>
                    Realização: {a.mastery}/5 · Prazer: {a.pleasure}/5
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Management Practices */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Práticas de manejo</h2>
              <p>Um registro simples para reconhecer o que você experimentou.</p>
            </div>
            <span className="tag">
              {data.practices.length + data.aerobic.length}
            </span>
          </div>

          <div className="list">
            {combinedPractices.length === 0 ? (
              <div className="empty">
                As práticas de respiração, relaxamento, atenção e atividade física aparecerão aqui quando forem registradas.
              </div>
            ) : (
              combinedPractices.map((x, idx) => (
                <div key={`${x.label}-${x.createdAt || idx}`} className="list-item">
                  <div className="list-item-top">
                    <strong>{x.label}</strong>
                    <time>{formatDate(x.date)}</time>
                  </div>
                  {x.detail && <p>{x.detail}</p>}
                </div>
              ))
            )}
          </div>
        </article>

        {/* Data & Privacy */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Dados e privacidade</h2>
              <p>O que você registra pode ser pessoal.</p>
            </div>
          </div>
          <p className="sub" style={{ fontSize: '.83rem' }}>
            Os dados ficam no armazenamento local deste navegador e não são enviados por este arquivo a um servidor. Não há sincronização entre aparelhos. Quem tiver acesso ao seu aparelho ou perfil de navegador poderá eventualmente ver esses registros. Exporte uma cópia de segurança quando precisar e apague os dados se compartilhar o dispositivo.
          </p>

          <div className="btn-row">
            <button
              className="btn btn-soft"
              id="exportSummaryBtn"
              type="button"
              onClick={handleCopySummary}
            >
              Copiar resumo
            </button>
            <button
              className="btn btn-soft"
              id="backupBtn"
              type="button"
              onClick={handleDownloadBackup}
            >
              Baixar backup
            </button>
          </div>

          <div className="field">
            <label htmlFor="restoreFileInput">Restaurar um backup JSON</label>
            <input
              id="restoreFileInput"
              ref={restoreFileRef}
              type="file"
              accept=".json,application/json"
            />
            <p className="hint">
              A restauração substitui os registros atuais pelos dados da cópia selecionada. Faça um backup atual antes de substituir.
            </p>
            <button
              className="btn btn-plain btn-full"
              id="restoreBackupBtn"
              type="button"
              onClick={handleRestoreBackup}
            >
              Restaurar cópia selecionada
            </button>
          </div>

          <div className="field">
            <label>Apagar todos os dados locais</label>
            <p className="hint">
              Isso remove check-ins, hábitos, ações, pensamentos e preocupações registrados neste app neste navegador. A ação não pode ser desfeita.
            </p>
            <button
              className="btn btn-danger btn-full"
              id="deleteDataBtn"
              type="button"
              onClick={handleDeleteAllData}
            >
              Apagar meus registros
            </button>
          </div>
        </article>

        {/* Educational Rationale */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>O que sustenta estas ferramentas?</h2>
              <p>Ferramentas de apoio baseadas em princípios estudados, sem promessa de resultado.</p>
            </div>
          </div>
          <details>
            <summary>Ativação comportamental e auto-observação</summary>
            <p>
              Planejar atividades concretas e observar a relação entre atividade e humor é compatível com a ativação comportamental. Diretrizes clínicas incluem intervenções estruturadas de ativação comportamental e TCC; o app oferece apenas exercícios breves, não o tratamento completo.
            </p>
            <p>
              <a
                href="https://www.nice.org.uk/guidance/ng222/chapter/Recommendations"
                target="_blank"
                rel="noopener noreferrer"
              >
                NICE — recomendações para depressão em adultos
              </a>
            </p>
          </details>
          <details>
            <summary>Respiração confortável</summary>
            <p>
              Exercícios suaves e regulares de respiração podem ajudar a lidar com o estresse. Não force o ar nem prenda a respiração; interrompa se houver desconforto.
            </p>
            <p>
              <a
                href="https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/"
                target="_blank"
                rel="noopener noreferrer"
              >
                NHS — exercício respiratório para estresse
              </a>
            </p>
          </details>
          <details>
            <summary>Atenção plena e pensamentos</summary>
            <p>
              Notar pensamentos e emoções sem tratá-los automaticamente como fatos pode ajudar algumas pessoas. Isso não funciona igual para todos; se um exercício aumentar seu desconforto, pare e procure uma forma de apoio mais adequada.
            </p>
            <p>
              <a
                href="https://www.nhs.uk/mental-health/self-help/tips-and-support/mindfulness/"
                target="_blank"
                rel="noopener noreferrer"
              >
                NHS — atenção plena
              </a>
            </p>
          </details>
          <details>
            <summary>Atividade física e ansiedade</summary>
            <p>
              As recomendações da OMS apoiam atividade física regular e gradual para a saúde geral, incluindo saúde mental. A meta semanal é uma referência para adultos, não uma cobrança diária nem uma exigência para começar.
            </p>
            <p>
              <a
                href="https://www.who.int/initiatives/behealthy/physical-activity/"
                target="_blank"
                rel="noopener noreferrer"
              >
                OMS — atividade física
              </a>{' '}
              ·{' '}
              <a
                href="https://www.nice.org.uk/guidance/cg113/chapter/Recommendations"
                target="_blank"
                rel="noopener noreferrer"
              >
                NICE — ansiedade e transtorno do pânico
              </a>
            </p>
          </details>
          <div className="notice" style={{ marginTop: '12px' }}>
            <strong>Importante</strong>
            Este aplicativo é um apoio de autocuidado, não diagnostica nem substitui psicoterapia, acompanhamento médico ou medicação prescrita. Não altere nem interrompa medicamentos por conta própria.
          </div>
        </article>

        {/* Immediate Help */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Precisa de ajuda agora?</h2>
              <p>Quando a situação ultrapassa o que um exercício de autocuidado pode oferecer.</p>
            </div>
          </div>
          <p className="sub" style={{ fontSize: '.84rem' }}>
            Se você estiver em risco de se machucar ou não conseguir se manter em segurança, procure alguém de confiança e atendimento presencial imediato. Em emergência, ligue para o SAMU 192 ou vá a uma UPA/pronto-socorro. O CVV oferece apoio emocional pelo 188.
          </p>
          <div className="btn-row">
            <a
              className="btn btn-soft"
              href="https://cvv.org.br/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Acessar CVV
            </a>
            <a
              className="btn btn-plain"
              href="https://www.gov.br/saude/pt-br/composicao/saes/samu-192"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sobre SAMU 192
            </a>
          </div>
        </article>
      </div>
    </section>
  );
};
