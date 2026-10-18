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
  {
    id: 'home-cup',
    context: 'Casa e ambiente',
    name: 'Lavar e guardar o copo',
    description: 'Evita acúmulo na pia com um gesto imediato de 30 segundos.',
    trigger: 'Depois de beber água',
  },
  {
    id: 'home-object',
    context: 'Casa e ambiente',
    name: 'Devolver objeto ao lugar',
    description: 'Mantém a ordem mínima sem demandar arrumações demoradas.',
    trigger: 'Logo após o uso',
  },
  {
    id: 'home-small',
    context: 'Casa e ambiente',
    name: 'Resolver bagunça rápida',
    description: 'Ações de menos de 2 minutos eliminam fricção visual do espaço.',
    trigger: 'Ao notar algo fora do lugar',
  },
  {
    id: 'home-next',
    context: 'Casa e ambiente',
    name: 'Preparar próximo espaço',
    description: 'Organiza a bancada para a próxima atividade fluir sem esforço.',
    trigger: 'Ao encerrar uma tarefa',
  },
  {
    id: 'work-close',
    context: 'Trabalho e estudos',
    name: 'Guardar notebook e mesa',
    description: 'Cria uma fronteira clara entre o expediente e o descanso pessoal.',
    trigger: 'Ao encerrar o trabalho',
  },
  {
    id: 'work-files',
    context: 'Trabalho e estudos',
    name: 'Fechar abas e arquivos',
    description: 'Desobstrui o computador e a mente antes de trocar de foco.',
    trigger: 'Ao concluir uma etapa',
  },
  {
    id: 'work-note',
    context: 'Trabalho e estudos',
    name: 'Anotar pendência imediata',
    description: 'Esvazia a memória de trabalho sem interromper o foco presente.',
    trigger: 'Quando surgir uma pendência',
  },
  {
    id: 'work-one',
    context: 'Trabalho e estudos',
    name: 'Uma atividade por vez',
    description: 'Reduz a sobrecarga mental de alternar tarefas freneticamente.',
    trigger: 'Na transição entre tarefas',
  },
  {
    id: 'care-anchor',
    context: 'Autocuidado',
    name: 'Ancorar em hábito existente',
    description: 'Vincula um novo cuidado a uma rotina diária já automática.',
    trigger: 'Junto a um hábito consolidado',
  },
  {
    id: 'care-prepare',
    context: 'Autocuidado',
    name: 'Preparar algo na véspera',
    description: 'Poupa energia e cansaço de decisão nas primeiras horas da manhã.',
    trigger: 'Antes de relaxar à noite',
  },
  {
    id: 'care-pause',
    context: 'Autocuidado',
    name: 'Pausa consciente de 1 minuto',
    description: 'Três respirações atentas e soltura dos ombros entre atividades.',
    trigger: 'Ao trocar de atividade',
  },
  {
    id: 'care-tired',
    context: 'Autocuidado',
    name: 'Checagem de cansaço',
    description: 'Percebe sinais de exaustão e reduz exigências quando necessário.',
    trigger: 'Ao notar queda de energia',
  },
  {
    id: 'routine-start',
    context: 'Rotina e transições',
    name: 'Ritual de abertura do dia',
    description: 'Início calmo com luz natural, copo d\'água e respiração tranquila.',
    trigger: 'Ao levantar da cama',
  },
  {
    id: 'routine-end',
    context: 'Rotina e transições',
    name: 'Ritual de desaceleração',
    description: 'Sinaliza ao corpo e ao cérebro que o dia de trabalho foi concluído.',
    trigger: 'Uma hora antes de dormir',
  },
  {
    id: 'routine-morning',
    context: 'Rotina e transições',
    name: 'Separar o essencial matinal',
    description: 'Deixa roupa, chaves e garrafa prontos para o dia seguinte.',
    trigger: 'Ao final da noite',
  },
  {
    id: 'routine-review',
    context: 'Rotina e transições',
    name: 'Revisão suave do ambiente',
    description: 'Uma passada de olho rápida sem cobrança, perfeccionismo ou culpa.',
    trigger: 'Antes de se deitar',
  },
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

export const DAILY_INSIGHTS = [
  { text: 'Você não precisa resolver a semana inteira hoje. Apenas este momento precisa da sua atenção.', theme: 'Presença e ritmo' },
  { text: 'Pensamentos são hipóteses que a mente cria, não ordens imediatas nem fatos consumados.', theme: 'Flexibilidade cognitiva' },
  { text: 'Uma pequena ação de cinco minutos feita imperfeitamente vale mais do que um plano perfeito nunca iniciado.', theme: 'Ativação comportamental' },
  { text: 'Descanso não é uma recompensa por ter feito tudo; é uma necessidade biológica para continuar.', theme: 'Autocuidado' },
  { text: 'Sentir ansiedade é um sinal de que algo importa para você, não de que algo terrível vai acontecer.', theme: 'Desfusão e aceitação' },
  { text: 'Quando tudo parecer pesado demais, diminua a escala: qual é a menor coisa viável agora?', theme: 'Micro-passos' },
  { text: 'Você não precisa esperar a motivação chegar para começar. O movimento quase sempre vem antes da vontade.', theme: 'Ação inicial' },
  { text: 'A incerteza é desconfortável, mas suportável. Você já superou dias difíceis com os recursos que tinha.', theme: 'Tolerância à incerteza' },
  { text: 'Trate a si mesmo hoje com a mesma paciência com que você trataria um amigo querido que está cansado.', theme: 'Autocompaixão' },
  { text: 'A mente que rumina tenta resolver o futuro à força. Traga a atenção para a sua respiração e seus pés no chão.', theme: 'Ancoragem no presente' },
  { text: 'Não meça o seu valor pelo quanto você produziu hoje. Cuidar da mente também é um trabalho essencial.', theme: 'Valor pessoal' },
  { text: 'Permita-se fazer uma versão menor da tarefa. Meio passo ainda é um passo na direção certa.', theme: 'Ritmo sustentável' },
  { text: 'Sentimentos são ondas passageiras: eles sobem, atingem um pico e diminuem quando não lutamos contra eles.', theme: 'Regulação emocional' },
  { text: 'A autocrítica severa raramente ajudou você a evoluir. Tente a curiosidade e o acolhimento.', theme: 'Gentileza interna' },
  { text: 'Foque no que está sob o seu alcance nos próximos dez minutos. O resto pode esperar a sua vez.', theme: 'Foco delimitado' },
  { text: 'Ter um dia difícil não apaga o aprendizado nem o progresso que você já construiu.', theme: 'Continuidade' },
  { text: 'Preocupar-se antecipadamente não evita imprevistos; apenas consome a energia do seu presente.', theme: 'Manejo da preocupação' },
  { text: 'Você tem o direito de pausar, respirar fundo e não ter todas as respostas neste instante.', theme: 'Pausa consciente' },
  { text: 'Observe o que está funcionando hoje, mesmo que seja apenas o ato de abrir este espaço para se cuidar.', theme: 'Atenção ao positivo' },
  { text: 'A coragem raramente parece heroica no cotidiano; quase sempre é apenas dar o próximo passo possível.', theme: 'Pequena coragem' },
  { text: 'Acolha o seu cansaço em vez de lutar contra ele. Reconhecer limites é sinal de maturidade, não de fraqueza.', theme: 'Limites saudáveis' },
  { text: "Em vez de 'e se der errado?', experimente: 'e se eu conseguir lidar com o que vier, como sempre fiz?'.", theme: 'Reenquadre cognitivo' },
  { text: 'Cuidar do básico — água, sono, comida e luz natural — costuma clarear a mente mais rápido do que tentar pensar mais.', theme: 'Cuidado de base' },
  { text: 'Seja paciente com suas tentativas. Manejar a ansiedade é um treino diário, não uma prova final.', theme: 'Treino contínuo' },
  { text: 'Você não precisa provar nada a ninguém hoje. Apenas viva este dia com respeito ao seu ritmo.', theme: 'Serenidade' },
  { text: 'O momento presente é o único lugar onde você tem poder de escolha. Comece por aqui.', theme: 'Aqui e agora' },
  { text: 'O amanhã cuidará de si mesmo. O que você precisa para ficar um pouco mais em paz agora?', theme: 'Alívio imediato' },
] as const;

export const getDailyInsight = (dateStr: string) => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  const index = hash % DAILY_INSIGHTS.length;
  return DAILY_INSIGHTS[index];
};

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
    theme: 'system',
    reminderEnabled: false,
    reminderTime: '09:00',
    reminderText: 'Um momento para respirar e cuidar do próximo passo possível.',
  },
});
