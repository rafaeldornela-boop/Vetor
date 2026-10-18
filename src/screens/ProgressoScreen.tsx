import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { VetorData } from '../types';
import {
  copyText,
  formatDate,
  formatTime,
  generateSummaryText,
  localDate,
  makeId,
  today,
} from '../utils/format';
import { clearAllData, persistData } from '../utils/storage';
import { createInitialData } from '../constants';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportOrShareFile, shareFormattedText } from '../utils/fileExport';

interface ProgressoScreenProps {
  data: VetorData;
  onUpdateData: (updater: (prev: VetorData) => VetorData) => boolean;
  onResetData: () => void;
  showToast: (msg: string) => void;
}

// Validation function for structural backup safety
function validateAndSanitizeBackup(
  parsed: unknown
): { valid: true; data: VetorData } | { valid: false; reason: string } {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, reason: 'O arquivo não contém um objeto JSON válido.' };
  }

  const rawObj = parsed as Record<string, unknown>;
  const payload =
    rawObj.data && typeof rawObj.data === 'object' && !Array.isArray(rawObj.data)
      ? (rawObj.data as Record<string, unknown>)
      : rawObj;

  const hasVetorKeys =
    'checkins' in payload ||
    'activities' in payload ||
    'thoughts' in payload ||
    'practices' in payload ||
    'habits' in payload ||
    'settings' in payload ||
    'aerobic' in payload ||
    'dailyPractices' in payload;

  if (!hasVetorKeys) {
    return {
      valid: false,
      reason: 'O arquivo JSON não possui coleções compatíveis com o aplicativo Vetor.',
    };
  }

  const base = createInitialData();
  const sanitized: VetorData = { ...base };

  // 1. checkins validation
  if ('checkins' in payload) {
    if (!Array.isArray(payload.checkins)) {
      return { valid: false, reason: 'O campo "checkins" deve ser uma lista.' };
    }
    const validatedCheckins: VetorData['checkins'] = [];
    for (let i = 0; i < payload.checkins.length; i++) {
      const c = payload.checkins[i];
      if (!c || typeof c !== 'object') {
        return { valid: false, reason: `Check-in na posição ${i} está malformado.` };
      }
      const dateStr = String((c as Record<string, unknown>).date || '').trim();
      if (!dateStr || !dateStr.includes('-')) {
        return { valid: false, reason: `Check-in na posição ${i} possui data inválida.` };
      }
      const moodVal = Number((c as Record<string, unknown>).mood);
      const anxietyVal = Number((c as Record<string, unknown>).anxiety);
      if (
        isNaN(moodVal) ||
        moodVal < 1 ||
        moodVal > 5 ||
        isNaN(anxietyVal) ||
        anxietyVal < 1 ||
        anxietyVal > 5
      ) {
        return {
          valid: false,
          reason: `Check-in de ${dateStr} possui valores de ânimo ou ansiedade fora da escala 1 a 5.`,
        };
      }
      validatedCheckins.push({
        date: dateStr,
        mood: Math.round(moodVal),
        anxiety: Math.round(anxietyVal),
        updatedAt:
          typeof (c as Record<string, unknown>).updatedAt === 'number'
            ? ((c as Record<string, unknown>).updatedAt as number)
            : undefined,
      });
    }
    sanitized.checkins = validatedCheckins;
  }

  // 2. activities validation
  if ('activities' in payload && Array.isArray(payload.activities)) {
    sanitized.activities = payload.activities
      .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object' && a.task))
      .map((a, i) => ({
        id: typeof a.id === 'string' ? a.id : `act-${i}-${makeId()}`,
        date: typeof a.date === 'string' ? a.date : today(),
        createdAt: typeof a.createdAt === 'number' ? a.createdAt : Date.now(),
        task: String(a.task),
        mastery: typeof a.mastery === 'number' ? Math.max(1, Math.min(5, a.mastery)) : 3,
        pleasure: typeof a.pleasure === 'number' ? Math.max(1, Math.min(5, a.pleasure)) : 3,
        legacyTime: typeof a.legacyTime === 'string' ? a.legacyTime : undefined,
        feedback:
          a.feedback === 'helped' || a.feedback === 'partial' || a.feedback === 'not_helped'
            ? a.feedback
            : undefined,
      }));
  }

  // 3. thoughts validation
  if ('thoughts' in payload && Array.isArray(payload.thoughts)) {
    sanitized.thoughts = payload.thoughts
      .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object' && t.automatic))
      .map((t, i) => ({
        id: typeof t.id === 'string' ? t.id : `thought-${i}-${makeId()}`,
        date: typeof t.date === 'string' ? t.date : today(),
        createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
        situation: typeof t.situation === 'string' ? t.situation : '',
        automatic: String(t.automatic),
        emotion: typeof t.emotion === 'string' ? t.emotion : 'Ansiedade',
        intensity: typeof t.intensity === 'number' ? Math.max(0, Math.min(100, t.intensity)) : 70,
        evidenceFor: typeof t.evidenceFor === 'string' ? t.evidenceFor : '',
        evidenceAgainst: typeof t.evidenceAgainst === 'string' ? t.evidenceAgainst : '',
        balanced: typeof t.balanced === 'string' ? t.balanced : '',
        next: typeof t.next === 'string' ? t.next : '',
      }));
  }

  // 4. practices
  if ('practices' in payload && Array.isArray(payload.practices)) {
    sanitized.practices = payload.practices
      .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object' && p.label))
      .map((p, i) => ({
        id: typeof p.id === 'string' ? p.id : `p-${i}-${makeId()}`,
        date: typeof p.date === 'string' ? p.date : today(),
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
        label: String(p.label),
        anchor: typeof p.anchor === 'string' ? p.anchor : undefined,
        feedback:
          p.feedback === 'helped' || p.feedback === 'partial' || p.feedback === 'not_helped'
            ? p.feedback
            : undefined,
      }));
  }

  // 5. aerobic
  if ('aerobic' in payload && Array.isArray(payload.aerobic)) {
    sanitized.aerobic = payload.aerobic
      .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object' && a.type))
      .map((a, i) => ({
        id: typeof a.id === 'string' ? a.id : `a-${i}-${makeId()}`,
        date: typeof a.date === 'string' ? a.date : today(),
        createdAt: typeof a.createdAt === 'number' ? a.createdAt : Date.now(),
        type: String(a.type),
        minutes: typeof a.minutes === 'number' ? Math.max(1, a.minutes) : 15,
      }));
  }

  // 6. customPractices
  if ('customPractices' in payload && Array.isArray(payload.customPractices)) {
    sanitized.customPractices = payload.customPractices
      .filter((cp): cp is Record<string, unknown> => Boolean(cp && typeof cp === 'object' && cp.name))
      .map((cp, i) => ({
        id: typeof cp.id === 'string' ? cp.id : `cp-${i}-${makeId()}`,
        context: typeof cp.context === 'string' ? cp.context : 'Casa e ambiente',
        name: String(cp.name),
        trigger: typeof cp.trigger === 'string' ? cp.trigger : '',
        description: typeof cp.description === 'string' ? cp.description : undefined,
        custom: true,
      }));
  }

  // 7. dailyPractices
  if ('dailyPractices' in payload && Array.isArray(payload.dailyPractices)) {
    sanitized.dailyPractices = payload.dailyPractices
      .filter((dp): dp is Record<string, unknown> => Boolean(dp && typeof dp === 'object' && dp.name))
      .map((dp, i) => ({
        id: typeof dp.id === 'string' ? dp.id : `dp-${i}-${makeId()}`,
        practiceId: typeof dp.practiceId === 'string' ? dp.practiceId : `pid-${i}`,
        name: String(dp.name),
        context: typeof dp.context === 'string' ? dp.context : 'Rotina e transições',
        trigger: typeof dp.trigger === 'string' ? dp.trigger : '',
        description: typeof dp.description === 'string' ? dp.description : undefined,
        date: typeof dp.date === 'string' ? dp.date : today(),
        createdAt: typeof dp.createdAt === 'number' ? dp.createdAt : Date.now(),
      }));
  }

  // 8. worries
  if ('worries' in payload && Array.isArray(payload.worries)) {
    sanitized.worries = payload.worries
      .filter((w): w is Record<string, unknown> => Boolean(w && typeof w === 'object' && w.text))
      .map((w, i) => ({
        id: typeof w.id === 'string' ? w.id : `w-${i}-${makeId()}`,
        date: typeof w.date === 'string' ? w.date : today(),
        createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now(),
        text: String(w.text),
        status: w.status === 'later' ? 'later' : 'action',
      }));
  }

  // 9. habits
  if (
    'habits' in payload &&
    payload.habits &&
    typeof payload.habits === 'object' &&
    !Array.isArray(payload.habits)
  ) {
    sanitized.habits = payload.habits as Record<string, Record<string, boolean>>;
  }

  // 10. settings
  if (
    'settings' in payload &&
    payload.settings &&
    typeof payload.settings === 'object' &&
    !Array.isArray(payload.settings)
  ) {
    sanitized.settings = {
      ...base.settings,
      ...(payload.settings as Record<string, unknown>),
    };
  }

  // 11. thoughtDraft
  if (
    'thoughtDraft' in payload &&
    payload.thoughtDraft &&
    typeof payload.thoughtDraft === 'object' &&
    !Array.isArray(payload.thoughtDraft)
  ) {
    sanitized.thoughtDraft = payload.thoughtDraft as VetorData['thoughtDraft'];
  }

  return { valid: true, data: sanitized };
}

export const ProgressoScreen: React.FC<ProgressoScreenProps> = ({
  data,
  onUpdateData,
  onResetData,
  showToast,
}) => {
  const restoreFileRef = useRef<HTMLInputElement>(null);

  // Today checkin computation
  const todayDate = today();
  const existingCheckin = useMemo(
    () => (data.checkins || []).find((c) => c.date === todayDate),
    [data.checkins, todayDate]
  );

  // Checkin state with synchronization tracking
  const [mood, setMood] = useState<number>(existingCheckin ? existingCheckin.mood : 3);
  const [anxiety, setAnxiety] = useState<number>(existingCheckin ? existingCheckin.anxiety : 3);
  const hasUserModifiedCheckinRef = useRef<boolean>(false);

  // Sync state if external checkin updates and user has not dirtied slider
  useEffect(() => {
    if (!hasUserModifiedCheckinRef.current) {
      if (existingCheckin) {
        setMood(existingCheckin.mood);
        setAnxiety(existingCheckin.anxiety);
      }
    }
  }, [existingCheckin]);

  const [checkinSavedHint, setCheckinSavedHint] = useState<string>(
    existingCheckin
      ? `Check-in de hoje salvo${
          existingCheckin.updatedAt ? ` às ${formatTime(existingCheckin.updatedAt)}` : ''
        }. Você pode ajustá-lo a qualquer momento.`
      : 'Registre como você se sente hoje para alimentar o acompanhamento semanal.'
  );

  const handleSaveCheckin = () => {
    const now = Date.now();
    const currentToday = today();
    const entry = {
      date: currentToday,
      mood,
      anxiety,
      updatedAt: now,
    };

    const saved = onUpdateData((prev) => {
      const list = Array.isArray(prev.checkins) ? prev.checkins : [];
      const existingIdx = list.findIndex((c) => c.date === currentToday);
      let updatedCheckins = [...list];
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

    if (saved) {
      hasUserModifiedCheckinRef.current = false;
      setCheckinSavedHint(
        `✓ Check-in de hoje salvo às ${formatTime(now)}. As médias e o histórico foram atualizados.`
      );
      showToast('Check-in diário salvo com sucesso.');
    } else {
      setCheckinSavedHint(
        '⚠️ Não foi possível gravar no armazenamento do navegador. Os valores permanecem nesta tela.'
      );
      showToast('Armazenamento indisponível. Valores mantidos nesta sessão.');
    }
  };

  // 7-day accurate calendar window computation
  const days = useMemo(() => {
    const list: {
      iso: string;
      dateObj: Date;
      checkin: VetorData['checkins'][number] | undefined;
    }[] = [];
    const baseNow = new Date();
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(baseNow.getFullYear(), baseNow.getMonth(), baseNow.getDate() - offset);
      const iso = localDate(d);
      list.push({
        iso,
        dateObj: d,
        checkin: (data.checkins || []).find((c) => c.date === iso),
      });
    }
    return list;
  }, [data.checkins]);

  const weekStartIso = days[0].iso;
  const weekEndIso = days[6].iso;

  // Checkins exclusively registered within this 7-day window
  const checkinRecords = useMemo(
    () => days.map((d) => d.checkin).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [days]
  );

  const avgMood = useMemo(() => {
    if (!checkinRecords.length) return '—';
    const sum = checkinRecords.reduce((acc, c) => acc + Number(c.mood || 0), 0);
    return (sum / checkinRecords.length).toFixed(1).replace('.', ',');
  }, [checkinRecords]);

  const avgAnxiety = useMemo(() => {
    if (!checkinRecords.length) return '—';
    const sum = checkinRecords.reduce((acc, c) => acc + Number(c.anxiety || 0), 0);
    return (sum / checkinRecords.length).toFixed(1).replace('.', ',');
  }, [checkinRecords]);

  const weekActivitiesCount = useMemo(() => {
    return (data.activities || []).filter(
      (a) => a.date >= weekStartIso && a.date <= weekEndIso
    ).length;
  }, [data.activities, weekStartIso, weekEndIso]);

  const weekPracticesCount = useMemo(() => {
    const regCount = (data.practices || []).filter(
      (p) => p.date >= weekStartIso && p.date <= weekEndIso
    ).length;
    const dailyCount = (data.dailyPractices || []).filter(
      (dp) => dp.date >= weekStartIso && dp.date <= weekEndIso
    ).length;
    return regCount + dailyCount;
  }, [data.practices, data.dailyPractices, weekStartIso, weekEndIso]);

  const weekAerobicMinutes = useMemo(() => {
    return (data.aerobic || [])
      .filter((a) => a.date >= weekStartIso && a.date <= weekEndIso)
      .reduce((sum, a) => sum + Number(a.minutes || 0), 0);
  }, [data.aerobic, weekStartIso, weekEndIso]);

  // Weekly reflection state with dirty flag tracking
  const [weeklyReflection, setWeeklyReflection] = useState<string>(
    data.settings.weeklyReflection || ''
  );
  const isReflectionDirtyRef = useRef<boolean>(false);
  const [reflectionSavedHint, setReflectionSavedHint] = useState<string>(
    data.settings.weeklyReflection ? 'Reflexão salva anteriormente.' : ''
  );

  useEffect(() => {
    if (!isReflectionDirtyRef.current) {
      setWeeklyReflection(data.settings.weeklyReflection || '');
    }
  }, [data.settings.weeklyReflection]);

  const handleSaveReflection = () => {
    const saved = onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        weeklyReflection,
      },
    }));

    if (saved) {
      isReflectionDirtyRef.current = false;
      setReflectionSavedHint('✓ Reflexão salva no navegador.');
      showToast('Reflexão semanal salva com sucesso.');
    } else {
      setReflectionSavedHint(
        '⚠️ Não foi possível salvar no armazenamento. Seu texto permanece nesta tela.'
      );
      showToast('Armazenamento indisponível; reflexão mantida na tela.');
    }
  };

  // Practice evaluation perceptions (helped / partial / not_helped)
  const evaluatedItems = useMemo(() => {
    const actFeed = (data.activities || []).filter((a) => a.feedback);
    const pracFeed = (data.practices || []).filter((p) => p.feedback);
    return [...actFeed, ...pracFeed];
  }, [data.activities, data.practices]);

  const totalFeedbackCount = evaluatedItems.length;
  const helpedCount = evaluatedItems.filter((x) => x.feedback === 'helped').length;
  const partialCount = evaluatedItems.filter((x) => x.feedback === 'partial').length;
  const notHelpedCount = evaluatedItems.filter((x) => x.feedback === 'not_helped').length;

  // Combined management practices history
  const combinedPractices = useMemo(() => {
    const list = [
      ...(data.practices || []).map((x) => ({
        date: x.date,
        createdAt: x.createdAt,
        label: x.label,
        detail: x.anchor ? `Rotina associada: ${x.anchor}` : 'Prática de regulação',
      })),
      ...(data.dailyPractices || []).map((x) => ({
        date: x.date,
        createdAt: x.createdAt,
        label: x.name,
        detail: x.trigger ? `Gatilho: ${x.trigger} · ${x.context}` : x.context,
      })),
      ...(data.aerobic || []).map((x) => ({
        date: x.date,
        createdAt: x.createdAt,
        label: x.type,
        detail: `${x.minutes} minuto(s) de movimento`,
      })),
    ];
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [data.practices, data.dailyPractices, data.aerobic]);

  // Expandable list controls for historical logs
  const [showAllActivities, setShowAllActivities] = useState<boolean>(false);
  const [showAllPractices, setShowAllPractices] = useState<boolean>(false);

  // Accessible Modal states for destructive operations
  const [pendingRestoreData, setPendingRestoreData] = useState<VetorData | null>(null);
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState<boolean>(false);
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState<boolean>(false);

  // Backup & Restore
  const handleCopySummary = async () => {
    const summaryText = generateSummaryText(data);
    const ok = await shareFormattedText('Resumo Semanal - Vetor TCC', summaryText);
    showToast(ok ? 'Resumo semanal copiado ou compartilhado com sucesso.' : 'Não foi possível compartilhar o texto.');
  };

  const handleDownloadBackup = async () => {
    try {
      const payload = {
        app: 'Vetor TCC',
        version: 4,
        exportedAt: new Date().toISOString(),
        data,
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      const filename = `vetor-backup-${today()}.json`;

      const result = await exportOrShareFile({
        filename,
        content: jsonStr,
        mimeType: 'application/json',
        dialogTitle: 'Cópia de Segurança - Vetor TCC',
      });

      if (result.success) {
        showToast('Cópia de segurança JSON exportada com sucesso.');
      } else {
        showToast(result.message || 'Não foi possível exportar a cópia de segurança.');
      }
    } catch {
      showToast('Erro ao gerar o arquivo de backup.');
    }
  };

  const handleRestoreBackup = async () => {
    const file = restoreFileRef.current?.files?.[0];
    if (!file) {
      showToast('Selecione um arquivo de backup (.json).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Arquivo excessivamente grande (limite: 5MB).');
      return;
    }

    try {
      const text = await file.text();
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        showToast('O arquivo selecionado não contém um JSON válido.');
        return;
      }

      const validation = validateAndSanitizeBackup(parsedJson);
      if (!validation.valid) {
        showToast(`Backup inválido: ${validation.reason}`);
        return;
      }

      // Abre modal acessível de confirmação em vez de window.confirm
      setPendingRestoreData(validation.data);
      setIsConfirmRestoreOpen(true);
    } catch {
      showToast('Erro ao processar o arquivo de backup.');
    }
  };

  const executeRestoreBackup = () => {
    if (!pendingRestoreData) return;

    const saved = onUpdateData(() => pendingRestoreData);
    if (saved) {
      hasUserModifiedCheckinRef.current = false;
      isReflectionDirtyRef.current = false;
      if (restoreFileRef.current) restoreFileRef.current.value = '';
      showToast('Backup restaurado e salvo com sucesso.');
    } else {
      showToast('Aviso: Armazenamento indisponível; dados carregados apenas nesta sessão.');
    }

    setIsConfirmRestoreOpen(false);
    setPendingRestoreData(null);
  };

  // Delete all local data via accessible modal
  const handleDeleteAllData = () => {
    setIsConfirmDeleteAllOpen(true);
  };

  const executeDeleteAllData = () => {
    try {
      clearAllData();
      persistData(createInitialData());
      onResetData();
      hasUserModifiedCheckinRef.current = false;
      isReflectionDirtyRef.current = false;
      setWeeklyReflection('');
      setMood(3);
      setAnxiety(3);
      setCheckinSavedHint('Nenhum registro no momento.');
      setIsConfirmDeleteAllOpen(false);
      showToast('Todos os registros locais foram apagados.');
    } catch {
      showToast('Erro ao tentar limpar o armazenamento local.');
    }
  };

  // Theme change with persistent verification
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    const saved = onUpdateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: newTheme,
      },
    }));

    if (saved) {
      showToast(
        newTheme === 'dark'
          ? 'Tema escuro ativado.'
          : newTheme === 'light'
          ? 'Tema claro ativado.'
          : 'Tema ajustado para seguir o sistema.'
      );
    } else {
      showToast('Aviso: Não foi possível gravar o tema no armazenamento local.');
    }
  };

  // Descriptors for Mood and Anxiety
  const moodLabels = [
    '1 · Muito baixo',
    '2 · Baixo',
    '3 · Neutro / Regular',
    '4 · Bom',
    '5 · Muito bom',
  ];

  const anxietyLabels = [
    '1 · Tranquilo / Pouca',
    '2 · Leve',
    '3 · Moderada',
    '4 · Elevada',
    '5 · Muito intensa',
  ];

  return (
    <section className="screen active" id="screen-progresso" aria-labelledby="title-progresso">
      {/* Intro Header */}
      <div className="intro">
        <div className="eyebrow">Painel pessoal de acompanhamento</div>
        <h1 id="title-progresso">Progresso não é uma linha reta.</h1>
        <p className="sub">
          Observe tendências e padrões no seu próprio ritmo, sem notas de desempenho nem julgamentos.
        </p>
      </div>

      <div className="stack" style={{ gap: '14px' }}>
        {/* =========================================================================
            A. RESUMO DA SEMANA (Compact 7-Day Overview)
           ========================================================================= */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div className="card-head" style={{ marginBottom: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Resumo da semana</h2>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Período de {formatDate(weekStartIso)} a {formatDate(weekEndIso)} (últimos 7 dias).
              </p>
            </div>
            <span className="tag" style={{ fontSize: '.75rem' }}>
              {checkinRecords.length}/7 dias com check-in
            </span>
          </div>

          {/* Primary High-Priority Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '.72rem', color: 'var(--muted)', display: 'block' }}>
                Check-ins
              </span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>
                {checkinRecords.length}
                <span style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--muted)' }}> / 7</span>
              </strong>
            </div>

            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '.72rem', color: 'var(--muted)', display: 'block' }}>
                Ânimo médio
              </span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--green-dark)' }}>
                {avgMood}
                {avgMood !== '—' && (
                  <span style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--muted)' }}> / 5</span>
                )}
              </strong>
            </div>

            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '.72rem', color: 'var(--muted)', display: 'block' }}>
                Ansiedade
              </span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>
                {avgAnxiety}
                {avgAnxiety !== '—' && (
                  <span style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--muted)' }}> / 5</span>
                )}
              </strong>
            </div>
          </div>

          {/* Complementary Indicators Row */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              padding: '10px 12px',
              background: 'var(--paper)',
              borderRadius: '12px',
              border: '1px solid var(--line)',
              fontSize: '.78rem',
              color: 'var(--muted)',
              justifyContent: 'space-between',
            }}
          >
            <span>
              <strong style={{ color: 'var(--ink)' }}>{weekActivitiesCount}</strong> ações
            </span>
            <span>·</span>
            <span>
              <strong style={{ color: 'var(--ink)' }}>{weekPracticesCount}</strong> práticas
            </span>
            <span>·</span>
            <span>
              <strong style={{ color: 'var(--ink)' }}>{weekAerobicMinutes}m</strong> movimento
            </span>
          </div>

          <p style={{ margin: '8px 0 0', fontSize: '.74rem', color: 'var(--muted)', lineHeight: 1.35 }}>
            As médias consideram exclusivamente os dias preenchidos. Dias sem registro não são tratados como zero.
          </p>
        </article>

        {/* =========================================================================
            B. CHECK-IN DE HOJE (Daily Mood & Anxiety Registration)
           ========================================================================= */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div className="card-head" style={{ marginBottom: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Check-in de hoje</h2>
                <span className="mini-tag" style={{ fontSize: '.74rem' }}>
                  {formatDate(todayDate)}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Autoavaliação subjetiva do momento. Não é um diagnóstico nem uma nota de valor.
              </p>
            </div>
          </div>

          {/* Mood Scale Control */}
          <div className="field" style={{ marginBottom: '14px' }}>
            <div className="range-top">
              <label htmlFor="moodRange">1. Como está seu ânimo hoje?</label>
              <span
                className="range-value"
                style={{
                  background: 'var(--green-soft)',
                  color: 'var(--green-dark)',
                  padding: '2px 10px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '.82rem',
                }}
              >
                {moodLabels[mood - 1]}
              </span>
            </div>
            <input
              id="moodRange"
              type="range"
              min="1"
              max="5"
              step="1"
              value={mood}
              onChange={(e) => {
                hasUserModifiedCheckinRef.current = true;
                setMood(Number(e.target.value));
              }}
              style={{ minHeight: '44px' }}
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={mood}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.74rem', color: 'var(--muted)', marginTop: '2px' }}>
              <span>1 · Muito baixo</span>
              <span>3 · Neutro</span>
              <span>5 · Muito bom</span>
            </div>
          </div>

          {/* Anxiety Scale Control */}
          <div className="field" style={{ marginBottom: '14px' }}>
            <div className="range-top">
              <label htmlFor="anxietyRange">2. Quanto pesa a ansiedade agora?</label>
              <span
                className="range-value"
                style={{
                  background: 'var(--sand)',
                  color: 'var(--sand-ink)',
                  padding: '2px 10px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '.82rem',
                }}
              >
                {anxietyLabels[anxiety - 1]}
              </span>
            </div>
            <input
              id="anxietyRange"
              type="range"
              min="1"
              max="5"
              step="1"
              value={anxiety}
              onChange={(e) => {
                hasUserModifiedCheckinRef.current = true;
                setAnxiety(Number(e.target.value));
              }}
              style={{ minHeight: '44px' }}
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={anxiety}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.74rem', color: 'var(--muted)', marginTop: '2px' }}>
              <span>1 · Tranquilo</span>
              <span>3 · Moderada</span>
              <span>5 · Muito intensa</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            type="button"
            style={{ fontWeight: 700, minHeight: '48px', fontSize: '.92rem' }}
            onClick={handleSaveCheckin}
          >
            ✓ Salvar check-in de hoje
          </button>

          <p
            className="hint"
            role="status"
            style={{
              marginTop: '8px',
              fontSize: '.78rem',
              color: checkinSavedHint.startsWith('⚠️') ? 'var(--red-ink)' : 'var(--muted)',
            }}
          >
            {checkinSavedHint}
          </p>
        </article>

        {/* =========================================================================
            C. HISTÓRICO VISUAL DOS ÚLTIMOS 7 DIAS (Visual Chart)
           ========================================================================= */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div className="card-head" style={{ marginBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Histórico dos últimos 7 dias</h2>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Evolução diária. Dias sem registro são claramente diferenciados de valores baixos.
              </p>
            </div>
          </div>

          <div
            className="week-chart"
            id="weekChart"
            role="img"
            aria-label={`Gráfico de ânimo dos últimos 7 dias. ${checkinRecords.length} de 7 dias possuem registro.`}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {days.map((d) => {
              const isToday = d.iso === todayDate;
              const hasData = Boolean(d.checkin);
              const moodVal = d.checkin ? Math.max(1, Math.min(5, Number(d.checkin.mood))) : null;
              const anxietyVal = d.checkin ? Math.max(1, Math.min(5, Number(d.checkin.anxiety))) : null;

              return (
                <div
                  key={d.iso}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr auto',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '.78rem',
                  }}
                >
                  {/* Day label */}
                  <div style={{ color: isToday ? 'var(--green-dark)' : 'var(--ink)', fontWeight: isToday ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatDate(d.iso, { weekday: 'short', day: '2-digit' })}
                    {isToday && <span style={{ fontSize: '.68rem', marginLeft: '2px' }}>*</span>}
                  </div>

                  {/* Visual Bar vs Missing State */}
                  {hasData && moodVal !== null ? (
                    <div
                      style={{
                        background: 'var(--line)',
                        borderRadius: '999px',
                        height: '14px',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={`Ânimo: ${moodVal}/5 · Ansiedade: ${anxietyVal}/5`}
                    >
                      <div
                        style={{
                          width: `${moodVal * 20}%`,
                          height: '100%',
                          background: 'var(--green)',
                          borderRadius: '999px',
                          transition: 'width .2s ease',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '14px',
                        borderRadius: '999px',
                        border: '1px dashed var(--line)',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '.66rem', color: 'var(--muted)', letterSpacing: '.02em' }}>
                        — sem registro —
                      </span>
                    </div>
                  )}

                  {/* Value tag */}
                  <div style={{ minWidth: '60px', textAlign: 'right' }}>
                    {hasData && moodVal !== null ? (
                      <span
                        className="mini-tag"
                        style={{
                          fontSize: '.7rem',
                          background: 'var(--green-soft)',
                          color: 'var(--green-dark)',
                          fontWeight: 700,
                          padding: '3px 6px',
                        }}
                      >
                        {moodVal}/5
                      </span>
                    ) : (
                      <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ margin: '12px 0 0', fontSize: '.74rem', color: 'var(--muted)' }}>
            Dica: dias com linhas tracejadas indicam ausência de registro e não afetam a média do seu bem-estar.
          </p>
        </article>

        {/* =========================================================================
            D. REFLEXÃO SEMANAL (Optional Weekly Review)
           ========================================================================= */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div className="card-head" style={{ marginBottom: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Reflexão semanal opcional</h2>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Um espaço voluntário para notar o que funcionou e o que pode ser ajustado com gentileza.
              </p>
            </div>
            <span className="tag" style={{ fontSize: '.74rem' }}>Opcional</span>
          </div>

          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="weeklyReflection">
                O que pareceu útil nesta semana? O que você gostaria de ajustar?
              </label>
              <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                {weeklyReflection.length}/1200
              </span>
            </div>
            <textarea
              id="weeklyReflection"
              maxLength={1200}
              rows={3}
              placeholder="Sem autocobrança: observe pequenas vitórias, momentos difíceis e um ajuste viável para o próximo ciclo."
              value={weeklyReflection}
              onChange={(e) => {
                isReflectionDirtyRef.current = true;
                setWeeklyReflection(e.target.value);
              }}
              style={{ fontSize: '.88rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <button
              className="btn btn-soft btn-small"
              type="button"
              style={{ minHeight: '38px', padding: '6px 16px', fontWeight: 650 }}
              onClick={handleSaveReflection}
            >
              Salvar reflexão
            </button>

            {reflectionSavedHint && (
              <span
                role="status"
                style={{
                  fontSize: '.78rem',
                  color: reflectionSavedHint.startsWith('⚠️') ? 'var(--red-ink)' : 'var(--muted)',
                }}
              >
                {reflectionSavedHint}
              </span>
            )}
          </div>
        </article>

        {/* =========================================================================
            E. O QUE VOCÊ TEM OBSERVADO (Practices Evaluation & Recent Actions)
           ========================================================================= */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div className="card-head" style={{ marginBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>O que você tem observado</h2>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Reconheça suas tentativas e o que tem trazido alívio real ao seu ritmo.
              </p>
            </div>
          </div>

          {/* Synthesis of practice evaluations */}
          {totalFeedbackCount > 0 ? (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                Percepção pessoal sobre práticas de autocuidado ({totalFeedbackCount} retornos):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ padding: '8px 10px', background: 'var(--green-soft)', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--line)' }}>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--green-dark)', display: 'block' }}>{helpedCount}</strong>
                  <span style={{ fontSize: '.74rem', color: 'var(--green-dark)', fontWeight: 650 }}>🌿 Ajudou</span>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--paper)', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--line)' }}>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--ink)', display: 'block' }}>{partialCount}</strong>
                  <span style={{ fontSize: '.74rem', color: 'var(--muted)', fontWeight: 650 }}>⚖️ Parcial</span>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--sand)', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--line)' }}>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--red-ink)', display: 'block' }}>{notHelpedCount}</strong>
                  <span style={{ fontSize: '.74rem', color: 'var(--red-ink)', fontWeight: 650 }}>🌧️ Não ajudou</span>
                </div>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '.73rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                Estes retornos são anotações pessoais para guiar seus momentos de sobrecarga, sem constituir medição clínica.
              </p>
            </div>
          ) : null}

          {/* Recent 5-minute Actions */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <strong style={{ fontSize: '.86rem', color: 'var(--ink)' }}>
                Ações de ativação (5 minutos)
              </strong>
              <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                {data.activities.length} no histórico
              </span>
            </div>

            {data.activities.length === 0 ? (
              <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '4px 0' }}>
                Nenhuma ação registrada ainda. Quando realizar uma ativação na aba Hoje, ela aparecerá aqui.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(showAllActivities ? data.activities.slice(0, 12) : data.activities.slice(0, 4)).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--paper)',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      fontSize: '.8rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--ink)' }}>{a.task}</strong>
                      <span style={{ fontSize: '.74rem', color: 'var(--muted)', marginLeft: '6px' }}>
                        (realização {a.mastery}/5 · prazer {a.pleasure}/5)
                      </span>
                    </div>
                    <time style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{formatDate(a.date)}</time>
                  </div>
                ))}

                {data.activities.length > 4 && (
                  <button
                    type="button"
                    className="inline-link"
                    style={{ fontSize: '.76rem', alignSelf: 'flex-start', marginTop: '2px' }}
                    onClick={() => setShowAllActivities(!showAllActivities)}
                  >
                    {showAllActivities ? 'Mostrar menos ▲' : `Ver mais ações (${data.activities.length}) ▼`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Management & Aerobic Practices */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <strong style={{ fontSize: '.86rem', color: 'var(--ink)' }}>
                Práticas de manejo e movimento
              </strong>
              <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
                {combinedPractices.length} no histórico
              </span>
            </div>

            {combinedPractices.length === 0 ? (
              <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '4px 0' }}>
                Nenhuma prática ou movimento registrado ainda.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(showAllPractices ? combinedPractices.slice(0, 12) : combinedPractices.slice(0, 4)).map((x, idx) => (
                  <div
                    key={`${x.label}-${x.createdAt || idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--paper)',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      fontSize: '.8rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--ink)' }}>{x.label}</strong>
                      {x.detail && (
                        <span style={{ fontSize: '.74rem', color: 'var(--muted)', marginLeft: '6px' }}>
                          · {x.detail}
                        </span>
                      )}
                    </div>
                    <time style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{formatDate(x.date)}</time>
                  </div>
                ))}

                {combinedPractices.length > 4 && (
                  <button
                    type="button"
                    className="inline-link"
                    style={{ fontSize: '.76rem', alignSelf: 'flex-start', marginTop: '2px' }}
                    onClick={() => setShowAllPractices(!showAllPractices)}
                  >
                    {showAllPractices ? 'Mostrar menos ▲' : `Ver mais práticas (${combinedPractices.length}) ▼`}
                  </button>
                )}
              </div>
            )}
          </div>
        </article>

        {/* =========================================================================
            F. RECURSOS, CONFIGURAÇÕES E PRIVACIDADE (Tools, Backup, Theme, Danger)
           ========================================================================= */}
        <article className="card" style={{ padding: '16px 18px' }}>
          <div className="card-head" style={{ marginBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Recursos e privacidade</h2>
              <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                Gerenciamento de dados, cópias de segurança e configurações do aplicativo.
              </p>
            </div>
          </div>

          {/* Theme Preference Selection */}
          <div className="field" style={{ marginBottom: '14px' }}>
            <label htmlFor="themeSelect">Tema visual do aplicativo</label>
            <select
              id="themeSelect"
              value={data.settings.theme || 'system'}
              onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
              style={{ minHeight: '40px', fontSize: '.86rem' }}
            >
              <option value="system">Seguir preferência do sistema (automático)</option>
              <option value="light">Tema claro</option>
              <option value="dark">Tema escuro</option>
            </select>
          </div>

          {/* Export & Summary Tools */}
          <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <strong style={{ fontSize: '.88rem', display: 'block', marginBottom: '4px', color: 'var(--ink)' }}>
              Cópia e exportação de dados
            </strong>
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '0 0 10px' }}>
              Guarde uma cópia de segurança no seu computador ou copie o resumo dos últimos 7 dias.
            </p>
            <div className="btn-row" style={{ gap: '8px' }}>
              <button
                className="btn btn-soft btn-small"
                type="button"
                style={{ fontSize: '.82rem', padding: '6px 14px' }}
                onClick={handleCopySummary}
              >
                📋 Copiar resumo em texto
              </button>
              <button
                className="btn btn-soft btn-small"
                type="button"
                style={{ fontSize: '.82rem', padding: '6px 14px' }}
                onClick={handleDownloadBackup}
              >
                💾 Baixar cópia de segurança (JSON)
              </button>
            </div>
          </div>

          {/* Safe Backup Restoration */}
          <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <strong style={{ fontSize: '.88rem', display: 'block', marginBottom: '4px', color: 'var(--ink)' }}>
              Restaurar cópia de segurança
            </strong>
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '0 0 8px' }}>
              Substitui os dados locais pelos registros validados do arquivo JSON.
            </p>
            <input
              id="restoreFileInput"
              ref={restoreFileRef}
              type="file"
              accept=".json,application/json"
              style={{ fontSize: '.82rem', marginBottom: '8px' }}
            />
            <button
              className="btn btn-plain btn-small"
              type="button"
              style={{ fontSize: '.82rem', padding: '6px 14px' }}
              onClick={handleRestoreBackup}
            >
              Validar e restaurar backup
            </button>
          </div>

          {/* Privacy Statement */}
          <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <strong style={{ fontSize: '.86rem', display: 'block', marginBottom: '4px', color: 'var(--ink)' }}>
              Transparência sobre privacidade
            </strong>
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '0 0 6px', lineHeight: 1.4 }}>
              • <strong>Armazenamento local:</strong> Seus registros de check-in, hábitos diários, ações e reflexões ficam salvos na memória do seu navegador neste dispositivo e não são sincronizados entre aparelhos.
            </p>
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
              • <strong>Recursos com IA:</strong> Ao utilizar voluntariamente a assistência de IA na aba Pensamentos ou na análise de preocupações, o texto daquele registro específico é transmitido de forma criptografada para gerar perguntas socráticas temporárias, sem persistência em bancos de dados do servidor.
            </p>
          </div>

          {/* Educational Rationale (Collapsible Details) */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '.86rem', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--ink)' }}>
              Princípios das ferramentas
            </span>
            <details style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 12px', marginBottom: '6px' }}>
              <summary style={{ fontSize: '.82rem', fontWeight: 650, cursor: 'pointer' }}>
                Ativação comportamental e auto-observação
              </summary>
              <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '6px 0 4px', lineHeight: 1.4 }}>
                A prática de notar a relação entre pequenas ações e o ânimo é alinhada às diretrizes da TCC. O app oferece suporte para dar os primeiros passos com baixo atrito.
              </p>
              <a href="https://www.nice.org.uk/guidance/ng222/chapter/Recommendations" target="_blank" rel="noopener noreferrer" style={{ fontSize: '.74rem' }}>
                NICE — recomendações para depressão em adultos →
              </a>
            </details>

            <details style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 12px', marginBottom: '6px' }}>
              <summary style={{ fontSize: '.82rem', fontWeight: 650, cursor: 'pointer' }}>
                Respiração e regulação fisiológica
              </summary>
              <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '6px 0 4px', lineHeight: 1.4 }}>
                Respirações calmas e regulares auxiliam na redução da ativação autonômica. Não force os pulmões nem prenda o ar além do confortável.
              </p>
              <a href="https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '.74rem' }}>
                NHS — exercícios de respiração para estresse →
              </a>
            </details>

            <details style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 12px', marginBottom: '6px' }}>
              <summary style={{ fontSize: '.82rem', fontWeight: 650, cursor: 'pointer' }}>
                Atenção plena e desfusão cognitiva
              </summary>
              <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '6px 0 4px', lineHeight: 1.4 }}>
                Observar pensamentos como eventos mentais passageiros diminui a ruminação. Se um exercício gerar desconforto, interrompa e retome quando estiver em paz.
              </p>
              <a href="https://www.nhs.uk/mental-health/self-help/tips-and-support/mindfulness/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '.74rem' }}>
                NHS — introdução à atenção plena →
              </a>
            </details>

            <details style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 12px' }}>
              <summary style={{ fontSize: '.82rem', fontWeight: 650, cursor: 'pointer' }}>
                Movimento físico e manejo do estresse
              </summary>
              <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '6px 0 4px', lineHeight: 1.4 }}>
                Atividades físicas leves estimulam neurotransmissores e reduzem a tensão muscular. Faça apenas o que seu ritmo corporal permitir.
              </p>
              <a href="https://www.who.int/initiatives/behealthy/physical-activity/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '.74rem' }}>
                OMS — diretrizes sobre atividade física →
              </a>
            </details>
          </div>

          {/* Destructive Action Zone (Clearly Differentiated) */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid #eccbc4',
              background: '#fdf6f5',
            }}
          >
            <strong style={{ fontSize: '.86rem', color: '#8e4438', display: 'block', marginBottom: '4px' }}>
              Zona de exclusão definitiva
            </strong>
            <p style={{ fontSize: '.78rem', color: '#6e4741', margin: '0 0 10px', lineHeight: 1.35 }}>
              Esta ação apaga todos os registros salvos neste navegador. Ela é irreversível e exige confirmação digitada.
            </p>
            <button
              className="btn btn-danger btn-small"
              type="button"
              style={{ fontSize: '.8rem', padding: '6px 14px' }}
              onClick={handleDeleteAllData}
            >
              Apagar todos os dados locais
            </button>
          </div>

          {/* Emergency Helpline Callout */}
          <div className="notice" style={{ marginTop: '16px' }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Apoio de emergência e escuta:</strong>
            <p style={{ margin: '0 0 8px', fontSize: '.78rem', lineHeight: 1.4 }}>
              Este aplicativo é exclusivamente uma ferramenta de autocuidado e não substitui psicoterapia nem atendimento médico de urgência. Em momentos de sofrimento agudo ou desespero, procure atendimento presencial ou ligue gratuitamente para:
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                className="btn btn-soft btn-small"
                style={{ fontSize: '.76rem', padding: '4px 10px' }}
                href="tel:188"
              >
                📞 CVV 188 (Apoio Emocional)
              </a>
              <a
                className="btn btn-plain btn-small"
                style={{ fontSize: '.76rem', padding: '4px 10px' }}
                href="tel:192"
              >
                🚑 SAMU 192 (Emergência)
              </a>
            </div>
          </div>
        </article>
      </div>

      {/* Modal Acessível: Confirmação de Restauração de Backup */}
      <ConfirmModal
        isOpen={isConfirmRestoreOpen}
        title="Substituir dados atuais pelo backup?"
        message="Atenção: A restauração substituirá todos os registros atuais deste aplicativo pelos dados contidos no arquivo selecionado. Esta operação não poderá ser desfeita."
        confirmText="Sim, restaurar dados"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={executeRestoreBackup}
        onCancel={() => {
          setIsConfirmRestoreOpen(false);
          setPendingRestoreData(null);
        }}
      />

      {/* Modal Acessível: Exclusão Total de Dados Locais */}
      <ConfirmModal
        isOpen={isConfirmDeleteAllOpen}
        title="Excluir todos os dados permanentemente?"
        message="Esta ação é definitiva e apagará todos os seus check-ins, registros de pensamentos, práticas e hábitos salvos neste dispositivo."
        confirmText="Excluir permanentemente"
        cancelText="Voltar e manter dados"
        isDanger={true}
        requirePromptText="APAGAR"
        promptPlaceholder="Digite APAGAR para liberar o botão"
        onConfirm={executeDeleteAllData}
        onCancel={() => setIsConfirmDeleteAllOpen(false)}
      />
    </section>
  );
};
