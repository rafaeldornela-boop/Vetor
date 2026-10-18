# Diretório de Áudios — Vetor TCC

Este diretório (`public/audio/`) armazena os arquivos de áudio estáticos produzidos para o aplicativo.

## Formatos recomendados
- **MP3 (`.mp3`)**: taxa de bits de 128 kbps ou 192 kbps (ideal para equilíbrio entre qualidade e leveza em conexões móveis).
- **WAV (`.wav`)**: aceito para sinos, toques curtos ou alta fidelidade.
- **M4A / AAC (`.m4a`)**: compatível com navegadores modernos.

## Como disponibilizar um novo áudio no aplicativo

1. **Copie o arquivo para esta pasta**:
   Exemplo: `public/audio/meditacao-respiracao-consciente.mp3`

2. **Abra o catálogo em `src/data/audios.ts`** e adicione o registro no array `AUDIO_CATALOG`:

```typescript
{
  id: 'meditacao-respiracao-consciente',
  title: 'Respiração e ancoragem no presente',
  category: 'Meditação guiada', // Uma das 5 categorias disponíveis
  description: 'Condução serena para estabilizar o ritmo respiratório e aliviar a sobrecarga mental.',
  src: '/audio/meditacao-respiracao-consciente.mp3',
  duration: 300, // Duração em segundos (opcional: o reprodutor detecta automaticamente se omitido)
  format: 'audio/mpeg'
}
```

3. **Pronto!** O áudio aparecerá automaticamente na aba **Áudios** do aplicativo, com reprodutor integrado (reproduzir, pausar, barra de progresso, volume e tratamento de falhas).

## Categorias disponíveis no catálogo
- `Meditação guiada`
- `Relaxamento corporal`
- `Sons da natureza`
- `Concentração e pausa`
- `Desacelerar antes de dormir`
