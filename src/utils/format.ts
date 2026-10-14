import { VetorData } from '../types';

export const localDate = (date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const today = (): string => localDate(new Date());

export const formatDate = (
  iso: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', options);
};

export const formatTime = (stamp?: number): string => {
  if (!stamp) return '';
  return new Date(stamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const makeId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }
  try {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand('copy');
    temp.remove();
    return ok;
  } catch {
    return false;
  }
};

export const generateSummaryText = (data: VetorData): string => {
  let text = 'VETOR — RESUMO DOS ÚLTIMOS 7 DIAS\n';
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(localDate(d));
  }
  const checks = dates.map(date => data.checkins.find(c => c.date === date)).filter(Boolean);
  text += `Check-ins: ${checks.length}/7 dias\n`;
  if (checks.length) {
    const avgM = (checks.reduce((s, c) => s + Number(c?.mood || 0), 0) / checks.length).toFixed(1);
    const avgA = (checks.reduce((s, c) => s + Number(c?.anxiety || 0), 0) / checks.length).toFixed(1);
    text += `Ânimo médio: ${avgM}/5\n`;
    text += `Ansiedade média: ${avgA}/5\n`;
    checks.forEach(c => {
      if (c) {
        text += `- ${formatDate(c.date, { day: '2-digit', month: '2-digit' })}: ânimo ${c.mood}/5; ansiedade ${c.anxiety}/5\n`;
      }
    });
  }

  text += '\nAÇÕES REGISTRADAS\n';
  const acts = data.activities.slice(0, 10);
  if (!acts.length) {
    text += 'Nenhuma ação registrada.\n';
  } else {
    acts.forEach(a => {
      text += `- ${formatDate(a.date, { day: '2-digit', month: '2-digit' })}: ${a.task} (realização ${a.mastery}/5; prazer ${a.pleasure}/5)\n`;
    });
  }

  const practices = data.practices.filter(p => dates.includes(p.date));
  const dailyEveryday = (data.dailyPractices || []).filter(p => dates.includes(p.date));
  const aerobic = data.aerobic.filter(a => dates.includes(a.date));

  text += `\nPRÁTICAS DE MANEJO\n${practices.length} prática(s) registrada(s) nos últimos 7 dias\n`;
  practices.slice(0, 10).forEach(p => {
    text += `- ${formatDate(p.date, { day: '2-digit', month: '2-digit' })}: ${p.label}${p.anchor ? ` (rotina: ${p.anchor})` : ''}\n`;
  });

  text += `\nPRÁTICAS COTIDIANAS\n${dailyEveryday.length} prática(s) registrada(s) nos últimos 7 dias\n`;
  dailyEveryday.slice(0, 15).forEach(p => {
    text += `- ${formatDate(p.date, { day: '2-digit', month: '2-digit' })}: ${p.name} (${p.context})\n`;
  });

  const totalAerobicMins = aerobic.reduce((sum, a) => sum + Number(a.minutes || 0), 0);
  text += `\nATIVIDADE AERÓBICA\n${totalAerobicMins} minuto(s) nos últimos 7 dias\n`;
  aerobic.slice(0, 10).forEach(a => {
    text += `- ${formatDate(a.date, { day: '2-digit', month: '2-digit' })}: ${a.type}, ${a.minutes} min\n`;
  });

  text += `\nRegistros de pensamento salvos: ${data.thoughts.length}\n\nEste resumo é uma ferramenta de autorreflexão, não uma avaliação clínica.`;
  return text;
};
