import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface ExportOptions {
  filename: string;
  content: string;
  mimeType: string;
  dialogTitle: string;
}

export interface ExportResult {
  success: boolean;
  message?: string;
}

/**
 * Exporta ou compartilha arquivos de forma nativa no Android via Capacitor
 * e mantém o download clássico via Blob no navegador.
 */
export async function exportOrShareFile(options: ExportOptions): Promise<ExportResult> {
  const { filename, content, mimeType, dialogTitle } = options;

  if (Capacitor.isNativePlatform()) {
    try {
      // Grava o arquivo temporário no cache do aplicativo
      await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // Obtém a URI nativa gerada pelo FileProvider
      const fileUri = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache,
      });

      if (!fileUri?.uri) {
        return { success: false, message: 'Não foi possível obter o caminho do arquivo gerado.' };
      }

      // Abre a folha de compartilhamento nativa do Android
      await Share.share({
        title: dialogTitle,
        dialogTitle,
        url: fileUri.uri,
      });

      return { success: true };
    } catch (err: any) {
      // Se o usuário apenas cancelou a folha de compartilhamento, não é erro crítico
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return { success: true };
      }
      console.warn('Erro ao compartilhar arquivo nativamente:', err);
      return { success: false, message: 'Falha ao salvar ou compartilhar arquivo no Android.' };
    }
  }

  // Comportamento Web padrão (download via Blob)
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 250);
    return { success: true };
  } catch (err) {
    console.warn('Erro ao gerar download no navegador:', err);
    return { success: false, message: 'Não foi possível gerar o download neste navegador.' };
  }
}

/**
 * Compartilha texto formatado (ex: resumo semanal ou pensamento) via folha nativa ou clipboard
 */
export async function shareFormattedText(title: string, text: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text,
        dialogTitle: title,
      });
      return true;
    } catch (err: any) {
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return true;
      }
      return false;
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch {
      // fallback to clipboard
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
