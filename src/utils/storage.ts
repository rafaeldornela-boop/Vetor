import { STORE_KEY, createInitialData } from '../constants';
import { VetorData } from '../types';
import { today } from './format';

export const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__vetor_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const safeParse = <T>(val: string | null, fallback: T): T => {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
};

export const loadStoredData = (): { data: VetorData; available: boolean } => {
  const available = isStorageAvailable();
  const base = createInitialData();
  if (!available) {
    return { data: base, available: false };
  }

  const current = safeParse<Record<string, unknown> | null>(localStorage.getItem(STORE_KEY), null);
  if (current && typeof current === 'object') {
    return {
      data: {
        ...base,
        ...current,
        settings: { ...base.settings, ...((current.settings as Record<string, unknown>) || {}) },
        practices: Array.isArray(current.practices) ? current.practices : [],
        aerobic: Array.isArray(current.aerobic) ? current.aerobic : [],
        customPractices: Array.isArray(current.customPractices) ? current.customPractices : [],
        dailyPractices: Array.isArray(current.dailyPractices) ? current.dailyPractices : [],
        thoughtDraft: (current.thoughtDraft && typeof current.thoughtDraft === 'object') ? current.thoughtDraft : {},
      } as VetorData,
      available: true,
    };
  }

  // Best-effort migration from older prototypes
  const oldActions = safeParse<Array<{ task?: string; d?: number; p?: number; time?: string }>>(localStorage.getItem('vetor_ba'), []);
  const oldCheckins = safeParse<Array<{ date?: string; h?: number; c?: number }>>(localStorage.getItem('vetor_checkins'), []);
  const migrated = createInitialData();

  if (Array.isArray(oldActions) && oldActions.length > 0) {
    migrated.activities = oldActions.map((a, i) => ({
      id: `old-${i}`,
      date: today(),
      createdAt: Date.now() - i * 1000,
      task: a.task || 'Ação registrada anteriormente',
      mastery: Number(a.d || 3),
      pleasure: Number(a.p || 3),
      legacyTime: a.time || '',
    }));
  }

  if (Array.isArray(oldCheckins) && oldCheckins.length > 0) {
    migrated.checkins = oldCheckins.map((c) => {
      const bits = String(c.date || '').split('/');
      const iso = bits.length === 2 ? `${new Date().getFullYear()}-${bits[1].padStart(2, '0')}-${bits[0].padStart(2, '0')}` : today();
      return {
        date: iso,
        mood: Number(c.h || 3),
        anxiety: Math.max(1, 6 - Number(c.c || 3)),
      };
    });
  }

  return { data: migrated, available: true };
};

export const persistData = (data: VetorData): boolean => {
  if (!isStorageAvailable()) return false;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

export const clearAllData = (): void => {
  try {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem('vetor_ba');
    localStorage.removeItem('vetor_checkins');
  } catch {
    // Ignore
  }
};
