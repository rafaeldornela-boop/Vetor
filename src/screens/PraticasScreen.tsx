import React, { useState, useRef } from 'react';
import { PRACTICE_CONTEXTS, PRACTICE_SUGGESTIONS } from '../constants';
import { DailyPractice, PracticeItem, VetorData } from '../types';
import { formatDate, makeId, today } from '../utils/format';

interface PraticasScreenProps {
  data: VetorData;
  onUpdateData: (updater: (prev: VetorData) => VetorData) => boolean;
  showToast: (msg: string) => void;
}

export const PraticasScreen: React.FC<PraticasScreenProps> = ({
  data,
  onUpdateData,
  showToast,
}) => {
  const [filter, setFilter] = useState<string>('Todas');
  const [customName, setCustomName] = useState<string>('');
  const [customContext, setCustomContext] = useState<string>('Casa e ambiente');
  const [customTrigger, setCustomTrigger] = useState<string>('');
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);

  const customFormRef = useRef<HTMLDivElement>(null);

  const allPractices: PracticeItem[] = [
    ...PRACTICE_SUGGESTIONS,
    ...(data.customPractices || []),
  ];

  const favoritesSet = new Set(data.settings.practiceFavorites || []);
  const todayStr = today();

  const isPracticeLoggedToday = (id: string): boolean => {
    return (data.dailyPractices || []).some(
      (dp) => dp.practiceId === id && dp.date === todayStr
    );
  };

  const handleToggleFavorite = (id: string) => {
    onUpdateData((prev) => {
      const currentFavs = new Set(prev.settings.practiceFavorites || []);
      if (currentFavs.has(id)) {
        currentFavs.delete(id);
      } else {
        currentFavs.add(id);
      }
      return {
        ...prev,
        settings: {
          ...prev.settings,
          practiceFavorites: Array.from(currentFavs),
        },
      };
    });
  };

  const handleLogPractice = (p: PracticeItem) => {
    if (isPracticeLoggedToday(p.id)) {
      showToast('Esta prática já foi registrada hoje.');
      return;
    }

    const saved = onUpdateData((prev) => {
      const newEntry: DailyPractice = {
        id: makeId(),
        practiceId: p.id,
        name: p.name,
        context: p.context,
        trigger: p.trigger || '',
        date: todayStr,
        createdAt: Date.now(),
      };
      return {
        ...prev,
        dailyPractices: [newEntry, ...(prev.dailyPractices || [])],
      };
    });

    showToast(
      saved
        ? 'Prática registrada, sem obrigação de repetir amanhã.'
        : 'Prática anotada apenas nesta sessão; armazenamento indisponível.'
    );
  };

  const handleBeginEdit = (p: PracticeItem) => {
    setCustomName(p.name);
    setCustomContext(p.context);
    setCustomTrigger(p.trigger || '');
    setEditingCustomId(p.custom ? p.id : null);

    customFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!p.custom) {
      showToast('Adapte o exemplo e salve como uma prática sua.');
    }
  };

  const handleCancelEdit = () => {
    setEditingCustomId(null);
    setCustomName('');
    setCustomTrigger('');
  };

  const handleSaveCustomPractice = () => {
    const trimmed = customName.trim();
    if (!trimmed) {
      showToast('Escreva o nome da prática.');
      return;
    }

    const item: PracticeItem = {
      id: editingCustomId || `custom-${makeId()}`,
      name: trimmed,
      context: customContext,
      trigger: customTrigger.trim(),
      custom: true,
    };

    const saved = onUpdateData((prev) => {
      let updatedCustom: PracticeItem[];
      if (editingCustomId) {
        updatedCustom = (prev.customPractices || []).map((p) =>
          p.id === editingCustomId ? item : p
        );
      } else {
        updatedCustom = [item, ...(prev.customPractices || [])];
      }
      return {
        ...prev,
        customPractices: updatedCustom,
      };
    });

    showToast(
      saved
        ? editingCustomId
          ? 'Prática atualizada.'
          : 'Prática personalizada salva.'
        : 'Não foi possível salvar o registro permanentemente.'
    );
    handleCancelEdit();
  };

  const handleDeleteCustom = (id: string) => {
    if (
      !window.confirm(
        'Remover esta prática personalizada? Os registros anteriores serão mantidos.'
      )
    ) {
      return;
    }

    if (editingCustomId === id) handleCancelEdit();

    onUpdateData((prev) => ({
      ...prev,
      customPractices: (prev.customPractices || []).filter((p) => p.id !== id),
      settings: {
        ...prev.settings,
        practiceFavorites: (prev.settings.practiceFavorites || []).filter((x) => x !== id),
      },
    }));

    showToast('Prática removida.');
  };

  // Filtered suggested list
  const filteredPractices = allPractices.filter(
    (p) => filter === 'Todas' || p.context === filter
  );

  // My practices (favorites + custom)
  const myPractices = allPractices.filter((p) => favoritesSet.has(p.id) || p.custom);

  // Daily practices history
  const sortedHistory = [...(data.dailyPractices || [])]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 30);

  return (
    <section className="screen active" id="screen-praticas" aria-labelledby="title-praticas">
      <div className="intro">
        <div className="eyebrow">Menos atrito no dia a dia</div>
        <h1 id="title-praticas">Deixe o próximo passo mais fácil.</h1>
        <p className="sub">
          “Não deixar rastros” é um convite: quando for simples e viável, resolva um pequeno resíduo da atividade. Não é uma regra de organização perfeita.
        </p>
      </div>

      <div className="stack">
        {/* Suggested Practices */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Práticas sugeridas</h2>
              <p>Favorite as que combinam com sua rotina. Você não precisa fazer todas.</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="practiceFilter">Filtrar por contexto</label>
            <select
              id="practiceFilter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="Casa e ambiente">Casa e ambiente</option>
              <option value="Trabalho e estudos">Trabalho e estudos</option>
              <option value="Autocuidado">Autocuidado</option>
              <option value="Rotina e transições">Rotina e transições</option>
              <option value="Todas">Todos os contextos</option>
            </select>
          </div>

          <div id="suggestedPractices" className="list">
            {filteredPractices.length === 0 ? (
              <div className="empty">Nenhuma prática nesta categoria.</div>
            ) : (
              filteredPractices.map((p) => {
                const done = isPracticeLoggedToday(p.id);
                const isFav = favoritesSet.has(p.id);
                const isCustom = !!p.custom;

                return (
                  <div key={p.id} className="list-item">
                    <div className="list-item-top">
                      <strong>{p.name}</strong>
                      <button
                        className="btn btn-plain btn-small"
                        type="button"
                        onClick={() => handleToggleFavorite(p.id)}
                        aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        {isFav ? '★ Favorita' : '☆ Favoritar'}
                      </button>
                    </div>
                    <div className="practice-meta">
                      <span className="mini-tag">{p.context}</span>
                      <span className="mini-tag">Gatilho: {p.trigger || 'A definir'}</span>
                      {isCustom && <span className="mini-tag">Personalizada</span>}
                    </div>
                    <div className="practice-actions">
                      <button
                        className={`btn ${done ? 'btn-plain' : 'btn-primary'} btn-small`}
                        type="button"
                        onClick={() => handleLogPractice(p)}
                      >
                        {done ? 'Realizada hoje' : 'Marcar como realizada'}
                      </button>
                      <button
                        className="btn btn-plain btn-small"
                        type="button"
                        onClick={() => handleBeginEdit(p)}
                      >
                        {isCustom ? 'Editar' : 'Adaptar'}
                      </button>
                      {isCustom && (
                        <button
                          className="btn btn-plain btn-small"
                          type="button"
                          onClick={() => handleDeleteCustom(p.id)}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* Create / Edit Custom Practice */}
        <article className="card" ref={customFormRef}>
          <div className="card-head">
            <div>
              <h2>{editingCustomId ? 'Editar prática personalizada' : 'Criar prática personalizada'}</h2>
              <p>Escolha algo pequeno, contextual e possível.</p>
            </div>
          </div>
          <div className="field">
            <label htmlFor="customPracticeName">Prática</label>
            <input
              id="customPracticeName"
              type="text"
              maxLength={180}
              placeholder="Ex.: deixar a garrafa pronta para amanhã"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>
          <div className="split">
            <div className="field">
              <label htmlFor="customPracticeContext">Contexto</label>
              <select
                id="customPracticeContext"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
              >
                {PRACTICE_CONTEXTS.map((ctx) => (
                  <option key={ctx} value={ctx}>
                    {ctx}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="customPracticeTrigger">Gatilho natural</label>
              <input
                id="customPracticeTrigger"
                maxLength={120}
                type="text"
                placeholder="Ex.: após o jantar"
                value={customTrigger}
                onChange={(e) => setCustomTrigger(e.target.value)}
              />
            </div>
          </div>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              id="addCustomPracticeBtn"
              type="button"
              onClick={handleSaveCustomPractice}
            >
              {editingCustomId
                ? 'Atualizar prática'
                : 'Salvar prática'}
            </button>
            {editingCustomId && (
              <button
                className="btn btn-plain"
                id="cancelEditPracticeBtn"
                type="button"
                onClick={handleCancelEdit}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </article>

        {/* Favorites and Custom */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Favoritas e personalizadas</h2>
              <p>Edite, favorite ou remova as suas práticas personalizadas.</p>
            </div>
          </div>
          <div id="myPractices" className="list">
            {myPractices.length === 0 ? (
              <div className="empty">Suas favoritas e práticas personalizadas aparecerão aqui.</div>
            ) : (
              myPractices.map((p) => (
                <div key={p.id} className="list-item">
                  <div className="list-item-top">
                    <strong>{p.name}</strong>
                    <span className="mini-tag">{p.custom ? 'Personalizada' : 'Favorita'}</span>
                  </div>
                  <p>
                    {p.context} · Gatilho: {p.trigger || 'não definido'}
                  </p>
                  <div className="practice-actions">
                    <button
                      className="btn btn-soft btn-small"
                      type="button"
                      onClick={() => handleLogPractice(p)}
                    >
                      Registrar prática
                    </button>
                    <button
                      className="btn btn-plain btn-small"
                      type="button"
                      onClick={() => handleBeginEdit(p)}
                    >
                      {p.custom ? 'Editar' : 'Adaptar'}
                    </button>
                    {p.custom && (
                      <button
                        className="btn btn-plain btn-small"
                        type="button"
                        onClick={() => handleDeleteCustom(p.id)}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Daily Practices History */}
        <article className="card">
          <div className="card-head">
            <div>
              <h2>Histórico de práticas</h2>
              <p>Um registro do que você experimentou, sem metas obrigatórias.</p>
            </div>
          </div>
          <div id="dailyPracticeHistory" className="list">
            {sortedHistory.length === 0 ? (
              <div className="empty">
                Nenhuma prática registrada ainda. Você pode experimentar uma quando fizer sentido.
              </div>
            ) : (
              sortedHistory.map((item) => (
                <div key={item.id} className="list-item">
                  <div className="list-item-top">
                    <strong>{item.name}</strong>
                    <time>{formatDate(item.date)}</time>
                  </div>
                  <p>
                    {item.context}
                    {item.trigger ? ` · ${item.trigger}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
};
