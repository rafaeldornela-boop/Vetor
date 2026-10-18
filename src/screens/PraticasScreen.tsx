import React, { useState, useEffect } from 'react';
import { HABITS, PRACTICE_CONTEXTS, PRACTICE_SUGGESTIONS } from '../constants';
import { DailyPractice, PracticeItem, ScreenName, VetorData } from '../types';
import { formatDate, makeId, today } from '../utils/format';
import { ConfirmModal } from '../components/ConfirmModal';
import { registerModalCloser } from '../utils/modalRegistry';

interface PraticasScreenProps {
  data: VetorData;
  onUpdateData: (updater: (prev: VetorData) => VetorData) => boolean;
  showToast: (msg: string) => void;
  onNavigate?: (screen: ScreenName) => void;
}

export const PraticasScreen: React.FC<PraticasScreenProps> = ({
  data,
  onUpdateData,
  showToast,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<string>('Todas');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customDesc, setCustomDesc] = useState<string>('');
  const [customContext, setCustomContext] = useState<string>('Casa e ambiente');
  const [customTrigger, setCustomTrigger] = useState<string>('');
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);

  const allPractices: PracticeItem[] = [
    ...PRACTICE_SUGGESTIONS,
    ...(data.customPractices || []),
  ];

  const favoritesSet = new Set(data.settings.practiceFavorites || []);
  const todayStr = today();

  // 1. Base Habits state
  const todayHabits = data.habits[todayStr] || {};
  const completedHabitsCount = HABITS.filter((h) => todayHabits[h.id]).length;
  const habitsProgressPct = Math.round((completedHabitsCount / HABITS.length) * 100);

  const handleToggleHabit = (habitId: string) => {
    const currentChecked = !!todayHabits[habitId];
    const saved = onUpdateData((prev) => {
      const currentDay = prev.habits[todayStr] || {};
      return {
        ...prev,
        habits: {
          ...prev.habits,
          [todayStr]: {
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

  // 2. Physical Activity state
  const [aerobicType, setAerobicType] = useState<string>('Caminhada');
  const [aerobicMinutes, setAerobicMinutes] = useState<number>(15);
  const todayAerobic = (data.aerobic || []).filter((a) => a.date === todayStr);

  const handleSaveAerobic = () => {
    const saved = onUpdateData((prev) => ({
      ...prev,
      aerobic: [
        {
          id: makeId(),
          date: todayStr,
          createdAt: Date.now(),
          type: aerobicType,
          minutes: aerobicMinutes,
        },
        ...prev.aerobic,
      ].slice(0, 300),
    }));
    showToast(
      saved
        ? `${aerobicType} (${aerobicMinutes} min) registrada com sucesso.`
        : 'Atividade anotada apenas nesta sessão; armazenamento indisponível.'
    );
  };

  const isPracticeLoggedToday = (id: string): boolean => {
    return (data.dailyPractices || []).some(
      (dp) => dp.practiceId === id && dp.date === todayStr
    );
  };

  const handleToggleFavorite = (id: string) => {
    const isFav = favoritesSet.has(id);
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
    showToast(isFav ? 'Removida dos favoritos.' : 'Prática adicionada aos favoritos.');
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
        description: p.description,
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
        ? 'Prática registrada com sucesso.'
        : 'Prática anotada apenas nesta sessão; armazenamento indisponível.'
    );
  };

  // Open modal for creating new practice
  const handleOpenCreateModal = () => {
    setEditingCustomId(null);
    setCustomName('');
    setCustomDesc('');
    setCustomContext('Casa e ambiente');
    setCustomTrigger('');
    setIsModalOpen(true);
  };

  // Open modal for editing custom or adapting suggested practice
  const handleBeginEdit = (p: PracticeItem) => {
    setCustomName(p.name);
    setCustomDesc(p.description || '');
    setCustomContext(p.context);
    setCustomTrigger(p.trigger || '');
    setEditingCustomId(p.custom ? p.id : null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomId(null);
    setCustomName('');
    setCustomDesc('');
    setCustomTrigger('');
  };

  // Close modal on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSaveCustomPractice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) {
      showToast('Escreva o nome da prática.');
      return;
    }

    const item: PracticeItem = {
      id: editingCustomId || `custom-${makeId()}`,
      name: trimmed,
      description: customDesc.trim() || undefined,
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
        : 'Armazenamento indisponível nesta sessão.'
    );
    handleCloseModal();
  };

  const [deleteCustomId, setDeleteCustomId] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);

  // Register modal close handler for Android back button
  useEffect(() => {
    if (!isModalOpen) return;
    return registerModalCloser(() => {
      handleCloseModal();
      return true;
    });
  }, [isModalOpen]);

  const handleDeleteCustom = (id: string) => {
    setDeleteCustomId(id);
    setIsConfirmDeleteOpen(true);
  };

  const executeDeleteCustom = () => {
    if (!deleteCustomId) return;
    const id = deleteCustomId;

    if (editingCustomId === id) handleCloseModal();

    onUpdateData((prev) => ({
      ...prev,
      customPractices: (prev.customPractices || []).filter((p) => p.id !== id),
      settings: {
        ...prev.settings,
        practiceFavorites: (prev.settings.practiceFavorites || []).filter((x) => x !== id),
      },
    }));

    setIsConfirmDeleteOpen(false);
    setDeleteCustomId(null);
    showToast('Prática personalizada removida.');
  };

  // Filtered suggested list
  const filteredPractices = allPractices.filter(
    (p) => filter === 'Todas' || p.context === filter
  );

  // My practices (favorites + custom)
  const myPractices = allPractices.filter((p) => favoritesSet.has(p.id) || p.custom);

  // Recent 3 logged practices for compact display
  const recentHistory = [...(data.dailyPractices || [])]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 3);

  return (
    <section className="screen active" id="screen-praticas" aria-labelledby="title-praticas">
      {/* Intro Header */}
      <div className="intro" style={{ marginBottom: '14px' }}>
        <div className="eyebrow">Autocuidado cotidiano</div>
        <h1 id="title-praticas" style={{ fontSize: '1.65rem', lineHeight: 1.25, margin: '4px 0 6px' }}>
          Práticas e Rotinas
        </h1>
        <p className="sub" style={{ fontSize: '.88rem', margin: 0 }}>
          Pequenas ações de baixo atrito para sustentar o seu ritmo, sem regras rígidas.
        </p>
      </div>

      <div className="stack" style={{ gap: '14px' }}>
        {/* 1. HÁBITOS DE BASE (Compact & Discrete Progress) */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <strong style={{ fontSize: '.94rem', color: 'var(--ink)' }}>Hábitos de base</strong>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Cuidados fundamentais para hoje. Faça o que for viável.
              </p>
            </div>
            <span
              className="mini-tag"
              style={{
                background: completedHabitsCount === HABITS.length ? 'var(--green-soft)' : 'var(--paper)',
                color: completedHabitsCount === HABITS.length ? 'var(--green-dark)' : 'var(--muted)',
                border: '1px solid var(--line)',
                fontWeight: 700,
                fontSize: '.78rem',
              }}
            >
              {completedHabitsCount}/{HABITS.length} concluídos
            </span>
          </div>

          {/* Discreet progress line */}
          <div
            style={{
              width: '100%',
              height: '4px',
              background: 'var(--line)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: `${habitsProgressPct}%`,
                height: '100%',
                background: 'var(--green)',
                borderRadius: '999px',
                transition: 'width .25s ease',
              }}
            />
          </div>

          {/* Compact habits grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '7px',
            }}
          >
            {HABITS.map((h) => {
              const isChecked = !!todayHabits[h.id];
              return (
                <div
                  key={h.id}
                  onClick={() => handleToggleHabit(h.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: isChecked ? 'var(--green)' : 'var(--line)',
                    background: isChecked ? 'var(--green-soft)' : 'var(--paper)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all .15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '6px',
                      border: '1.5px solid',
                      borderColor: isChecked ? 'var(--green)' : 'var(--muted)',
                      background: isChecked ? 'var(--green)' : 'transparent',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '.72rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {isChecked ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }} aria-hidden="true">
                    {h.icon}
                  </span>
                  <span
                    style={{
                      fontSize: '.82rem',
                      color: isChecked ? 'var(--green-dark)' : 'var(--ink)',
                      fontWeight: isChecked ? 650 : 500,
                      lineHeight: 1.3,
                    }}
                  >
                    {h.label}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        {/* 2. ATIVIDADE FÍSICA LEVE (Compact Card) */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <strong style={{ fontSize: '.94rem', color: 'var(--ink)' }}>Atividade física leve</strong>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Movimento diário para oxigenar o corpo e aliviar o estresse.
              </p>
            </div>
            {data.aerobic.length > 0 && (
              <span className="mini-tag" style={{ fontSize: '.76rem', color: 'var(--muted)' }}>
                {data.aerobic.length} registro{data.aerobic.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 180px' }}>
              <select
                id="aerobicTypeSelect"
                value={aerobicType}
                onChange={(e) => setAerobicType(e.target.value)}
                style={{ width: '100%', minHeight: '38px', fontSize: '.84rem' }}
                aria-label="Tipo de movimento"
              >
                <option value="Caminhada">Caminhada</option>
                <option value="Alongamento">Alongamento / Yoga</option>
                <option value="Bicicleta">Bicicleta</option>
                <option value="Subir escadas">Subir escadas</option>
                <option value="Outro movimento">Outra atividade</option>
              </select>
            </div>

            {/* Quick Duration selector pills */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              {[10, 15, 20, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`btn btn-small ${aerobicMinutes === mins ? 'btn-primary' : 'btn-plain'}`}
                  style={{
                    fontSize: '.75rem',
                    padding: '4px 8px',
                    minHeight: '34px',
                    fontWeight: 650,
                  }}
                  onClick={() => setAerobicMinutes(mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-small"
              type="button"
              style={{
                minHeight: '36px',
                fontSize: '.82rem',
                fontWeight: 700,
                padding: '6px 14px',
                whiteSpace: 'nowrap',
              }}
              onClick={handleSaveAerobic}
            >
              ✓ Registrar
            </button>
          </div>

          {todayAerobic.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.78rem' }}>
              <span style={{ color: 'var(--green-dark)', fontWeight: 650 }}>
                ✓ Feito hoje: {todayAerobic[0].type} ({todayAerobic[0].minutes} min)
                {todayAerobic.length > 1 ? ` (+${todayAerobic.length - 1} registro${todayAerobic.length > 2 ? 's' : ''})` : ''}
              </span>
              <span style={{ color: 'var(--muted)' }}>
                {todayAerobic.reduce((sum, a) => sum + (a.minutes || 0), 0)} min no total hoje
              </span>
            </div>
          )}
        </article>

        {/* 3. MINHAS PRÁTICAS: FAVORITAS E PERSONALIZADAS (Separate Section) */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <strong style={{ fontSize: '.96rem', color: 'var(--ink)' }}>Minhas práticas</strong>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Seus itens favoritos e práticas personalizadas para fácil acesso.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-small"
              style={{ fontSize: '.78rem', padding: '6px 12px', fontWeight: 650 }}
              onClick={handleOpenCreateModal}
            >
              + Nova prática
            </button>
          </div>

          {myPractices.length === 0 ? (
            <div
              style={{
                padding: '14px',
                textAlign: 'center',
                background: 'var(--paper)',
                border: '1px dashed var(--line)',
                borderRadius: '12px',
                fontSize: '.82rem',
                color: 'var(--muted)',
              }}
            >
              Nenhuma prática personalizada ou favorita ainda.
              <br />
              Clique em <strong>+ Nova prática</strong> acima ou favorite opções na biblioteca abaixo.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '8px',
              }}
            >
              {myPractices.map((p) => {
                const done = isPracticeLoggedToday(p.id);
                const isCustom = !!p.custom;

                return (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--paper)',
                      border: '1px solid var(--line)',
                      borderRadius: '13px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                        <strong style={{ fontSize: '.86rem', color: 'var(--ink)', lineHeight: 1.35 }}>
                          {p.name}
                        </strong>
                        <span
                          className="mini-tag"
                          style={{
                            fontSize: '.7rem',
                            flexShrink: 0,
                            background: isCustom ? 'var(--lilac)' : 'var(--sand)',
                            color: isCustom ? 'var(--lilac-ink)' : 'var(--sand-ink)',
                            fontWeight: 700,
                          }}
                        >
                          {isCustom ? 'Personalizada' : 'Favorita'}
                        </span>
                      </div>
                      {p.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                          {p.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span className="mini-tag" style={{ fontSize: '.68rem' }}>
                          {p.context}
                        </span>
                        {p.trigger && (
                          <span className="mini-tag" style={{ fontSize: '.68rem' }}>
                            Gatilho: {p.trigger}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--line)' }}>
                      <button
                        className={`btn btn-small ${done ? 'btn-plain' : 'btn-primary'}`}
                        type="button"
                        style={{ fontSize: '.74rem', padding: '4px 8px' }}
                        onClick={() => handleLogPractice(p)}
                      >
                        {done ? '✓ Feita hoje' : 'Registrar'}
                      </button>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-plain btn-small"
                          type="button"
                          style={{ fontSize: '.72rem', padding: '4px 6px' }}
                          onClick={() => handleBeginEdit(p)}
                        >
                          {isCustom ? 'Editar' : 'Adaptar'}
                        </button>
                        {isCustom ? (
                          <button
                            className="btn btn-plain btn-small"
                            type="button"
                            style={{ fontSize: '.72rem', padding: '4px 6px', color: 'var(--red-ink)' }}
                            onClick={() => handleDeleteCustom(p.id)}
                            title="Remover prática personalizada"
                          >
                            Excluir
                          </button>
                        ) : (
                          <button
                            className="btn btn-plain btn-small"
                            type="button"
                            style={{ fontSize: '.72rem', padding: '4px 6px' }}
                            onClick={() => handleToggleFavorite(p.id)}
                            title="Remover dos favoritos"
                          >
                            ★
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* 4. BIBLIOTECA DE PRÁTICAS (Compact cards & Context filter pills) */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ fontSize: '.96rem', color: 'var(--ink)' }}>Biblioteca de práticas</strong>
            <p style={{ margin: '2px 0 8px', fontSize: '.8rem', color: 'var(--muted)' }}>
              Ajustes de baixo atrito para o ambiente e a rotina.
            </p>

            {/* Context filter pill bar */}
            <div
              style={{
                display: 'flex',
                gap: '5px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'none',
              }}
              role="group"
              aria-label="Filtrar por contexto"
            >
              {['Todas', ...PRACTICE_CONTEXTS].map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  className={`btn btn-small ${filter === ctx ? 'btn-primary' : 'btn-plain'}`}
                  style={{
                    fontSize: '.74rem',
                    padding: '4px 10px',
                    minHeight: '30px',
                    whiteSpace: 'nowrap',
                    fontWeight: filter === ctx ? 700 : 500,
                  }}
                  onClick={() => setFilter(ctx)}
                >
                  {ctx}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '8px',
            }}
          >
            {filteredPractices.length === 0 ? (
              <div className="empty" style={{ gridColumn: '1 / -1' }}>
                Nenhuma prática nesta categoria.
              </div>
            ) : (
              filteredPractices.map((p) => {
                const done = isPracticeLoggedToday(p.id);
                const isFav = favoritesSet.has(p.id);

                return (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--paper)',
                      border: '1px solid var(--line)',
                      borderRadius: '13px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                        <strong style={{ fontSize: '.85rem', color: 'var(--ink)', lineHeight: 1.35 }}>
                          {p.name}
                        </strong>
                        <button
                          type="button"
                          className="btn btn-plain btn-small"
                          style={{
                            fontSize: '.78rem',
                            padding: '2px 6px',
                            minHeight: '26px',
                            color: isFav ? 'var(--green-dark)' : 'var(--muted)',
                          }}
                          onClick={() => handleToggleFavorite(p.id)}
                          aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          {isFav ? '★' : '☆'}
                        </button>
                      </div>
                      {p.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                          {p.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span className="mini-tag" style={{ fontSize: '.68rem' }}>
                          {p.context}
                        </span>
                        {p.trigger && (
                          <span className="mini-tag" style={{ fontSize: '.68rem' }}>
                            Gatilho: {p.trigger}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--line)' }}>
                      <button
                        className={`btn btn-small ${done ? 'btn-plain' : 'btn-primary'}`}
                        type="button"
                        style={{ fontSize: '.74rem', padding: '4px 8px' }}
                        onClick={() => handleLogPractice(p)}
                      >
                        {done ? '✓ Feita hoje' : 'Registrar'}
                      </button>
                      <button
                        className="btn btn-plain btn-small"
                        type="button"
                        style={{ fontSize: '.72rem', padding: '4px 8px' }}
                        onClick={() => handleBeginEdit(p)}
                      >
                        Adaptar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* 5. HISTÓRICO DE PRÁTICAS (Compact with link to Progresso) */}
        <article className="card" style={{ padding: '15px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <strong style={{ fontSize: '.92rem', color: 'var(--ink)' }}>Histórico recente de práticas</strong>
              <p style={{ margin: '2px 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>
                Últimas práticas experimentadas na rotina.
              </p>
            </div>
            {onNavigate && (
              <button
                type="button"
                className="inline-link"
                style={{ fontSize: '.78rem', fontWeight: 650 }}
                onClick={() => onNavigate('progresso')}
              >
                Ver tudo no Progresso →
              </button>
            )}
          </div>

          {recentHistory.length === 0 ? (
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '4px 0' }}>
              Nenhuma prática registrada recentemente. Registre uma prática acima quando for conveniente.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    fontSize: '.8rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{item.context}</span>
                    <time style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{formatDate(item.date)}</time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      {/* 4. MODAL / JANELA SEPARADA: CRIAR / EDITAR PRÁTICA PERSONALIZADA */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalPracticeTitle"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: '20px',
              maxWidth: '460px',
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              width: '100%',
              padding: '18px 20px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <strong id="modalPracticeTitle" style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                  {editingCustomId ? 'Editar prática personalizada' : 'Nova prática personalizada'}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                  Defina um passo pequeno e de baixo atrito para sua rotina.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-plain btn-small"
                style={{ padding: '4px 8px', fontSize: '.85rem' }}
                onClick={handleCloseModal}
                aria-label="Fechar janela"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomPractice}>
              <div className="field">
                <label htmlFor="customModalName">Nome da prática</label>
                <input
                  id="customModalName"
                  type="text"
                  maxLength={160}
                  autoFocus
                  placeholder="Ex.: Deixar a garrafa cheia na mesa à noite"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ minHeight: '44px', fontSize: '16px' }}
                />
              </div>

              <div className="field">
                <label htmlFor="customModalDesc">Descrição breve (opcional)</label>
                <input
                  id="customModalDesc"
                  type="text"
                  maxLength={180}
                  placeholder="Ex.: Evita sobrecarga visual com um gesto de 1 minuto"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  style={{ minHeight: '44px', fontSize: '16px' }}
                />
              </div>

              <div className="field">
                <label htmlFor="customModalContext">Contexto</label>
                <select
                  id="customModalContext"
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  style={{ minHeight: '44px', fontSize: '16px' }}
                >
                  {PRACTICE_CONTEXTS.map((ctx) => (
                    <option key={ctx} value={ctx}>
                      {ctx}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="customModalTrigger">Gatilho natural (quando fazer)</label>
                <input
                  id="customModalTrigger"
                  maxLength={120}
                  type="text"
                  placeholder="Ex.: Ao terminar o jantar / Antes de abrir o computador"
                  value={customTrigger}
                  onChange={(e) => setCustomTrigger(e.target.value)}
                  style={{ minHeight: '44px', fontSize: '16px' }}
                />
                <p className="hint" style={{ marginTop: '4px', fontSize: '.76rem' }}>
                  Ancorar em uma ação que você já realiza facilita a execução automática.
                </p>
              </div>

              <div className="btn-row" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-plain"
                  style={{ flex: 1, minHeight: '44px' }}
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 700, minHeight: '44px' }}
                >
                  {editingCustomId ? 'Salvar alterações' : 'Salvar prática'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Acessível: Exclusão de Prática Personalizada */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Remover prática personalizada?"
        message="Deseja remover esta prática da sua lista de práticas personalizadas? Os registros anteriores continuarão preservados no seu histórico."
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={executeDeleteCustom}
        onCancel={() => {
          setIsConfirmDeleteOpen(false);
          setDeleteCustomId(null);
        }}
      />
    </section>
  );
};
