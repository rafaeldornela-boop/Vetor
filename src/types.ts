export type ScreenName = 'hoje' | 'acalmar' | 'praticas' | 'pensamentos' | 'audios' | 'progresso';

export interface Checkin {
  date: string; // YYYY-MM-DD
  mood: number; // 1 - 5
  anxiety: number; // 1 - 5
  updatedAt?: number;
}

export interface Activity {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  task: string;
  mastery: number; // 1 - 5
  pleasure: number; // 1 - 5
  timerStarted?: number;
  legacyTime?: string;
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
  custom?: boolean;
}

export interface DailyPractice {
  id: string;
  practiceId: string;
  name: string;
  context: string;
  trigger: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface VetorSettings {
  practiceAnchor: string;
  weeklyReflection: string;
  practiceFavorites: string[];
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
