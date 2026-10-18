/**
 * Gerenciador de modais abertos para suporte ao Botão Voltar do Android.
 * Garante que ao pressionar Voltar no Android, o modal mais recente seja fechado primeiro.
 */

type ModalCloser = () => boolean;

const activeClosers: ModalCloser[] = [];

export function registerModalCloser(closer: ModalCloser): () => void {
  activeClosers.push(closer);
  return () => {
    const idx = activeClosers.lastIndexOf(closer);
    if (idx !== -1) {
      activeClosers.splice(idx, 1);
    }
  };
}

export function closeTopmostModal(): boolean {
  for (let i = activeClosers.length - 1; i >= 0; i--) {
    const closed = activeClosers[i]();
    if (closed) {
      return true;
    }
  }
  return false;
}
