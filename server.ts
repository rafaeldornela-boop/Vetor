import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Support audio upload payloads
app.use(express.json({ limit: '60mb' }));

// Operational health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    mode: isProd ? 'production' : 'development',
    offlineReady: true,
  });
});

// Static serving for local audio files in public/audio
const audioDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}
app.use('/audio', express.static(audioDir));

const catalogPath = path.join(audioDir, 'catalog.json');

function getCatalog() {
  try {
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Audio Catalog] Error reading catalog:', err);
  }
  return [
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
}

function saveCatalog(catalog: any[]) {
  try {
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Audio Catalog] Error saving catalog:', err);
  }
}

// Get registered audio catalog
app.get('/api/audios', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    tracks: getCatalog(),
  });
});

// Upload and register new audio track directly from browser
app.post('/api/upload-audio', (req: Request, res: Response) => {
  try {
    const { filename, title, category, description, base64Data, mimeType, duration } = req.body;
    if (!filename || !base64Data || !title || !category) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes (arquivo, título ou categoria).' });
    }

    const safeName = filename.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
    const targetFile = path.join(audioDir, safeName);

    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    fs.writeFileSync(targetFile, buffer);

    const catalog = getCatalog();
    const id = safeName.replace(/\.[^/.]+$/, '');
    const existingIndex = catalog.findIndex((t: any) => t.id === id || t.src === `/audio/${safeName}`);

    const newTrack = {
      id,
      title: String(title).trim(),
      category: String(category).trim(),
      description: String(description || '').trim(),
      src: `/audio/${safeName}`,
      duration: typeof duration === 'number' && duration > 0 ? Math.round(duration) : undefined,
      format: mimeType || 'audio/mpeg',
    };

    if (existingIndex >= 0) {
      catalog[existingIndex] = newTrack;
    } else {
      catalog.push(newTrack);
    }

    saveCatalog(catalog);

    return res.json({
      success: true,
      track: newTrack,
      message: `Arquivo ${safeName} gravado com sucesso em public/audio/`,
    });
  } catch (err: any) {
    console.error('[Upload Audio] Error:', err);
    return res.status(500).json({ error: 'Erro ao processar e salvar o arquivo de áudio.' });
  }
});

// Delete audio track
app.delete('/api/audios/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === 'sino-pausa-consciente') {
      return res.status(400).json({ error: 'O áudio padrão do sistema não pode ser excluído.' });
    }
    const catalog = getCatalog();
    const trackToDelete = catalog.find((t: any) => t.id === id);
    if (!trackToDelete) {
      return res.status(404).json({ error: 'Faixa não encontrada no catálogo.' });
    }

    const updatedCatalog = catalog.filter((t: any) => t.id !== id);
    saveCatalog(updatedCatalog);

    if (trackToDelete.src && trackToDelete.src.startsWith('/audio/')) {
      const fileName = path.basename(trackToDelete.src);
      const filePath = path.join(audioDir, fileName);
      if (fs.existsSync(filePath) && fileName !== 'exemplo-pausa-consciente.wav') {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('[Audio Delete] Could not unlink audio file:', e);
        }
      }
    }

    return res.json({ success: true, message: 'Áudio removido do catálogo com sucesso.' });
  } catch (err: any) {
    console.error('[Audio Delete] Error:', err);
    return res.status(500).json({ error: 'Erro ao remover áudio.' });
  }
});

// Setup development server with Vite or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Vetor Server] Running on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
