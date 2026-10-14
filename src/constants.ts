import { PracticeItem, VetorData } from './types';

export const STORE_KEY = 'vetor_tcc_data_v2';

export const HABITS = [
  { id: 'med', label: 'Segui a medicação conforme a prescrição', icon: '💊' },
  { id: 'move', label: 'Movimentei o corpo, mesmo que pouco', icon: '🚶' },
  { id: 'light', label: 'Tive alguns minutos de luz natural', icon: '☀️' },
  { id: 'sleep', label: 'Cuidei de algum aspecto da rotina de sono', icon: '🌙' },
  { id: 'connect', label: 'Falei com alguém ou fiz algo significativo', icon: '🤝' },
] as const;

export const MICRO_CHOICES = [
  { emoji: '💧', title: 'Água + luz natural', task: 'Beber água e abrir a janela' },
  { emoji: '🧹', title: 'Organizar um canto', task: 'Organizar apenas uma pequena superfície por 5 minutos' },
  { emoji: '🚶', title: 'Movimentar o corpo', task: 'Caminhar ou se movimentar suavemente por 5 minutos' },
  { emoji: '📝', title: 'Começar por 3 linhas', task: 'Abrir a tarefa pendente e trabalhar nela por apenas 5 minutos' },
] as const;

export const PRACTICE_SUGGESTIONS: PracticeItem[] = [
  { id: 'home-cup', context: 'Casa e ambiente', name: 'Depois de beber água, lavar e guardar o copo', trigger: 'Depois de beber água' },
  { id: 'home-object', context: 'Casa e ambiente', name: 'Devolver um objeto ao lugar depois de usá-lo', trigger: 'Depois de usar um objeto' },
  { id: 'home-small', context: 'Casa e ambiente', name: 'Resolver uma pequena bagunça se levar pouco tempo', trigger: 'Ao perceber algo rápido de resolver' },
  { id: 'home-next', context: 'Casa e ambiente', name: 'Preparar o espaço para a próxima atividade', trigger: 'Ao encerrar uma atividade' },
  { id: 'work-close', context: 'Trabalho e estudos', name: 'Ao encerrar, guardar o notebook e o essencial', trigger: 'Ao encerrar o expediente' },
  { id: 'work-files', context: 'Trabalho e estudos', name: 'Fechar arquivos e guardar materiais que não serão usados', trigger: 'Ao concluir uma tarefa' },
  { id: 'work-note', context: 'Trabalho e estudos', name: 'Anotar uma pendência para não precisar mantê-la na memória', trigger: 'Quando não puder resolver agora' },
  { id: 'work-one', context: 'Trabalho e estudos', name: 'Encerrar uma atividade antes de começar outra, quando possível', trigger: 'Na transição entre tarefas' },
  { id: 'care-anchor', context: 'Autocuidado', name: 'Associar um hábito saudável a uma rotina que já acontece', trigger: 'Escolha um hábito existente' },
  { id: 'care-prepare', context: 'Autocuidado', name: 'Preparar com antecedência algo necessário para a rotina', trigger: 'Na noite anterior ou antes de sair' },
  { id: 'care-pause', context: 'Autocuidado', name: 'Fazer uma pausa consciente entre atividades', trigger: 'Ao trocar de atividade' },
  { id: 'care-tired', context: 'Autocuidado', name: 'Perceber sinais de cansaço e ajustar o ritmo, se possível', trigger: 'Ao notar cansaço' },
  { id: 'routine-start', context: 'Rotina e transições', name: 'Criar um pequeno ritual para começar o dia', trigger: 'Ao acordar' },
  { id: 'routine-end', context: 'Rotina e transições', name: 'Criar um pequeno ritual para encerrar o dia', trigger: 'Antes de dormir' },
  { id: 'routine-morning', context: 'Rotina e transições', name: 'Preparar o necessário para a próxima manhã', trigger: 'Ao encerrar o dia' },
  { id: 'routine-review', context: 'Rotina e transições', name: 'Fazer uma breve revisão do ambiente, sem obrigação', trigger: 'Antes de dormir' },
];

export const EMOTIONS = [
  'Ansiedade',
  'Tristeza',
  'Raiva',
  'Culpa',
  'Vergonha',
  'Frustração',
  'Medo',
  'Outra',
] as const;

export const ROUTINE_ANCHORS = [
  'Ao acordar',
  'Depois de escovar os dentes',
  'Antes de começar o trabalho ou estudo',
  'Antes do almoço',
  'Ao encerrar o trabalho',
  'Antes de dormir',
  'Outro momento habitual',
] as const;

export const PRACTICE_CONTEXTS = [
  'Casa e ambiente',
  'Trabalho e estudos',
  'Autocuidado',
  'Rotina e transições',
] as const;

export const createInitialData = (): VetorData => ({
  checkins: [],
  activities: [],
  thoughts: [],
  thoughtDraft: {},
  worries: [],
  habits: {},
  practices: [],
  aerobic: [],
  customPractices: [],
  dailyPractices: [],
  settings: {
    practiceAnchor: 'Ao acordar',
    weeklyReflection: '',
    practiceFavorites: [],
  },
});
