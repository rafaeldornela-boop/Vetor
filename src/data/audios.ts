import { AudioCategory, AudioTrack } from '../types';

export interface CategoryInfo {
  id: AudioCategory;
  title: string;
  icon: string;
  description: string;
}

export const AUDIO_CATEGORIES: CategoryInfo[] = [
  {
    id: 'Meditação guiada',
    title: 'Meditação guiada',
    icon: '🎧',
    description: 'Práticas conduzidas de atenção plena, respiração consciente e ancoragem no momento presente.',
  },
  {
    id: 'Relaxamento corporal',
    title: 'Relaxamento corporal',
    icon: '🌿',
    description: 'Exercícios guiados para liberação de tensão muscular, relaxamento progressivo e alívio físico.',
  },
  {
    id: 'Sons da natureza',
    title: 'Sons da natureza',
    icon: '🌧️',
    description: 'Paisagens sonoras orgânicas (chuva suave, brisa, água corrente) para acalmar a mente.',
  },
  {
    id: 'Concentração e pausa',
    title: 'Concentração e pausa',
    icon: '🎯',
    description: 'Sinos suaves e ambiências acústicas para intervalos conscientes e foco sustentável.',
  },
  {
    id: 'Desacelerar antes de dormir',
    title: 'Desacelerar antes de dormir',
    icon: '🌙',
    description: 'Áudios calmantes para compor a rotina noturna e sinalizar ao corpo a hora de descansar.',
  },
];

/**
 * Catálogo centralizado de áudios do Vetor TCC.
 *
 * Como adicionar um novo áudio:
 * 1. Coloque o arquivo de áudio (preferencialmente .mp3 ou .wav) na pasta `public/audio/`.
 * 2. Adicione um novo objeto a este array com os metadados:
 *    - id: identificador único (ex: 'respira-4-7-8')
 *    - title: título amigável (ex: 'Respiração 4-7-8 Guiada')
 *    - category: uma das 5 categorias acima
 *    - description: breve síntese do exercício
 *    - src: caminho relativo iniciando com '/audio/' (ex: '/audio/respira-4-7-8.mp3')
 *    - duration: duração em segundos (opcional, calculada automaticamente pelo reprodutor se omitida)
 *    - format: tipo MIME (ex: 'audio/mpeg', 'audio/wav')
 */
export const AUDIO_CATALOG: AudioTrack[] = [
  {
    id: 'sino-pausa-consciente',
    title: 'Sino de pausa consciente',
    category: 'Concentração e pausa',
    description: 'Toque suave de sino harmônico para marcar o início de uma pausa consciente de foco ou respiração.',
    src: '/audio/exemplo-pausa-consciente.wav',
    duration: 4,
    format: 'audio/wav',
  },
];
