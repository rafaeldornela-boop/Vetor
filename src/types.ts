export type ScreenName = 'hoje' | 'acalmar' | 'praticas' | 'pensamentos' | 'audios' | 'progresso';

export interface Checkin {
  date: string; // YYYY-MM-DD
  mood: number; // 1 - 5
  anxiety: number; // 1 - 5
  updatedAt?: number;
}

export type PracticeFeedback = 'helped' | 'partial' | 'not_helped';

export interface Activity {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  task: string;
  mastery: number; // 1 - 5
  pleasure: number; // 1 - 5
  timerStarted?: number;
  legacyTime?: string;
  feedback?: PracticeFeedback;
}

export interface Thought {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  situation: string;
  automatic: string;
  emotion: string;
  intensity: number; // 0 - 100
  evidenceFor: string;
  evidenceAgainst: string;
  balanced: string;
  next: string;
}

export interface ThoughtDraft {
  thoughtSituation?: string;
  thoughtAuto?: string;
  thoughtEmotion?: string;
  thoughtIntensity?: number | string;
  thoughtFor?: string;
  thoughtAgainst?: string;
  thoughtBalanced?: string;
  thoughtNext?: string;
}

export interface Worry {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  text: string;
  status: 'action' | 'later';
}

export interface Practice {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  label: string;
  anchor?: string;
  feedback?: PracticeFeedback;
}

export interface Aerobic {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  type: string;
  minutes: number;
}

export interface PracticeItem {
  id: string;
  context: string;
  name: string;
  trigger: string;
  description?: string;
  custom?: boolean;
}

export interface DailyPractice {
  id: string;
  practiceId: string;
  name: string;
  context: string;
  trigger: string;
  description?: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface VetorSettings {
  practiceAnchor: string;
  weeklyReflection: string;
  practiceFavorites: string[];
  theme?: 'light' | 'dark' | 'system';
  reminderEnabled?: boolean;
  reminderMode?: 'fixed' | 'random';
  reminderTime?: string; // HH:mm (fixed mode)
  reminderWindowStart?: string; // HH:mm (window start, e.g. 09:00)
  reminderWindowEnd?: string; // HH:mm (window end, e.g. 21:00)
  randomReminderTimeToday?: string; // HH:mm (chosen random time for today)
  randomReminderDate?: string; // YYYY-MM-DD
  reminderText?: string;
  lastReminderDate?: string; // YYYY-MM-DD
}

export interface VetorData {
  checkins: Checkin[];
  activities: Activity[];
  thoughts: Thought[];
  thoughtDraft: ThoughtDraft;
  worries: Worry[];
  habits: Record<string, Record<string, boolean>>; // date -> { habitId: boolean }
  practices: Practice[];
  aerobic: Aerobic[];
  customPractices: PracticeItem[];
  dailyPractices: DailyPractice[];
  settings: VetorSettings;
}

export type AudioCategory =
  | 'Meditação guiada'
  | 'Relaxamento corporal'
  | 'Sons da natureza'
  | 'Concentração e pausa'
  | 'Desacelerar antes de dormir';

export interface AudioTrack {
  id: string;
  title: string;
  category: AudioCategory;
  description: string;
  src: string;
  duration?: number; // Duração em segundos, somente quando verificada
  format?: string;
}

