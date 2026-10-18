import React, { useState, useRef, useEffect } from 'react';
import { AUDIO_CATALOG, AUDIO_CATEGORIES } from '../data/audios';
import { AudioCategory, AudioTrack } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { registerModalCloser } from '../utils/modalRegistry';

const LOCAL_STORAGE_KEY = 'vetor_audio_catalog_custom_v1';

function formatAudioTime(seconds?: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AudiosScreen: React.FC = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with built-in catalog to make sure defaults exist
          const merged = [...parsed];
          AUDIO_CATALOG.forEach((item) => {
            if (!merged.some((m) => m.id === item.id)) {
              merged.push(item);
            }
          });
          return merged;
        }
      }
    } catch (e) {
      console.warn('Could not read cached audio catalog:', e);
    }
    return AUDIO_CATALOG;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Add Audio Modal/Panel state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<AudioCategory>('Meditação guiada');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [detectedDuration, setDetectedDuration] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch updated catalog from server if available
  useEffect(() => {
    let isMounted = true;
    fetch('/api/audios')
      .then((res) => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then((data) => {
        if (isMounted && data.tracks && Array.isArray(data.tracks)) {
          setTracks(data.tracks);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.tracks));
        }
      })
      .catch(() => {
        // Fallback to local storage / offline
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Clean stop when unmounting
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handleSelectTrack = (track: AudioTrack) => {
    setPlaybackError(null);

    // If tapping the already loaded track: toggle play/pause
    if (currentTrack?.id === track.id) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              setPlaybackError('Não foi possível iniciar a reprodução deste arquivo.');
              setIsPlaying(false);
            });
        }
      }
      return;
    }

    // Switching to a new track
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 0);
    setIsLoadingAudio(true);
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = track.src;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
        })
        .catch(() => {
          setPlaybackError('Arquivo de áudio não encontrado ou formato indisponível.');
          setIsPlaying(false);
          setIsLoadingAudio(false);
        });
    }
  };

  const handleTogglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    setPlaybackError(null);

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setPlaybackError('Não foi possível reproduzir este áudio.');
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      audioRef.current.muted = nextMuted;
    }
  };

  // Handle file picker selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setFormFeedback(null);

    // Auto-generate clean title from filename if not yet typed
    const cleanName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (!uploadTitle) {
      setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    // Try detecting duration from audio object
    try {
      const tempUrl = URL.createObjectURL(file);
      const tempAudio = new Audio(tempUrl);
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration)) {
          setDetectedDuration(Math.round(tempAudio.duration));
        }
        URL.revokeObjectURL(tempUrl);
      };
      tempAudio.onerror = () => {
        URL.revokeObjectURL(tempUrl);
      };
    } catch {
      // Ignored
    }
  };

  // Submit audio upload
  const handleSaveAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setFormFeedback({ type: 'error', message: 'Selecione um arquivo de áudio no seu computador ou celular.' });
      return;
    }
    if (!uploadTitle.trim()) {
      setFormFeedback({ type: 'error', message: 'Preencha o título do áudio.' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(uploadFile);
      });

      // Try sending to /api/upload-audio to save on disk
      let savedTrack: AudioTrack;
      let usedServer = false;

      try {
        const response = await fetch('/api/upload-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: uploadFile.name,
            title: uploadTitle.trim(),
            category: uploadCategory,
            description: uploadDescription.trim(),
            base64Data,
            mimeType: uploadFile.type || 'audio/mpeg',
            duration: detectedDuration,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          savedTrack = resData.track;
          usedServer = true;
        } else {
          throw new Error('Falha no upload do servidor.');
        }
      } catch {
        // Fallback: save locally in browser storage with Data URL / Blob URL for offline
        const safeId = 'audio-' + Date.now();
        savedTrack = {
          id: safeId,
          title: uploadTitle.trim(),
          category: uploadCategory,
          description: uploadDescription.trim(),
          src: base64Data,
          duration: detectedDuration,
          format: uploadFile.type || 'audio/mpeg',
        };
      }

      // Update state
      const updated = [savedTrack, ...tracks.filter((t) => t.id !== savedTrack.id)];
      setTracks(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

      setFormFeedback({
        type: 'success',
        message: usedServer
          ? `Áudio gravado com sucesso na pasta public/audio e adicionado à biblioteca!`
          : `Áudio salvo e disponível para escutar neste dispositivo!`,
      });

      // Reset form fields
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setDetectedDuration(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Automatically select and allow playing
      setTimeout(() => {
        setIsAddOpen(false);
        handleSelectTrack(savedTrack);
      }, 1000);
    } catch (err: any) {
      console.error('Error uploading audio:', err);
      setFormFeedback({
        type: 'error',
        message: 'Ocorreu um erro ao processar o arquivo de áudio. Verifique se o formato é suportado.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [trackToDelete, setTrackToDelete] = useState<AudioTrack | null>(null);
  const [isConfirmDeleteTrackOpen, setIsConfirmDeleteTrackOpen] = useState<boolean>(false);

  // Register modal closer for upload form
  useEffect(() => {
    if (!isAddOpen) return;
    return registerModalCloser(() => {
      setIsAddOpen(false);
      return true;
    });
  }, [isAddOpen]);

  // Delete an audio track with accessible modal
  const handleDeleteTrack = (track: AudioTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    if (track.id === 'sino-pausa-consciente') return;
    setTrackToDelete(track);
    setIsConfirmDeleteTrackOpen(true);
  };

  const executeDeleteTrack = async () => {
    if (!trackToDelete) return;
    const track = trackToDelete;

    if (currentTrack?.id === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentTrack(null);
      setIsPlaying(false);
    }

    try {
      await fetch(`/api/audios/${encodeURIComponent(track.id)}`, { method: 'DELETE' });
    } catch {
      // offline fallback
    }

    const updated = tracks.filter((t) => t.id !== track.id);
    setTracks(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    setIsConfirmDeleteTrackOpen(false);
    setTrackToDelete(null);
  };

  // Grouped tracks by category
  const categoriesList: {
    category: AudioCategory;
    title: string;
    icon: string;
    description: string;
    tracks: AudioTrack[];
  }[] = AUDIO_CATEGORIES.map((cat) => ({
    category: cat.id,
    title: cat.title,
    icon: cat.icon,
    description: cat.description,
    tracks: tracks.filter((t) => t.category === cat.id),
  }));

  const filteredCategories =
    selectedCategory === 'Todas'
      ? categoriesList
      : categoriesList.filter((c) => c.category === selectedCategory);

  const totalRegisteredTracks = tracks.length;

  return (
    <section className="screen active" id="screen-audios" aria-labelledby="title-audios">
      {/* Hidden single authoritative HTMLAudioElement */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || currentTrack?.duration || 0);
            setIsLoadingAudio(false);
          }
        }}
        onCanPlay={() => setIsLoadingAudio(false)}
        onWaiting={() => setIsLoadingAudio(true)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setPlaybackError('Arquivo de áudio não encontrado ou indisponível.');
          setIsPlaying(false);
          setIsLoadingAudio(false);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => {
          setIsPlaying(true);
          setPlaybackError(null);
        }}
      />

      {/* Intro Header */}
      <div className="intro">
        <div className="eyebrow">Práticas sonoras e regulação</div>
        <h1 id="title-audios">Um espaço para escutar com calma.</h1>
        <p className="sub">
          Áudios dedicados para desacelerar, praticar respiração guiada e criar pausas conscientes no seu dia.
        </p>
      </div>

      <div className="stack" style={{ gap: '14px' }}>
        {/* =========================================================================
            PROMINENT ACTION: SUBIR / ADICIONAR ÁUDIO
           ========================================================================= */}
        <article
          className="card"
          style={{
            padding: '16px 18px',
            background: 'var(--paper)',
            border: '1.5px solid var(--green)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }} aria-hidden="true">
                  📂
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>
                  Adicionar seus arquivos de áudio
                </strong>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '.82rem', color: 'var(--muted)' }}>
                Selecione arquivos .mp3, .wav ou .m4a do seu computador ou celular para incluir na biblioteca.
              </p>
            </div>

            <button
              type="button"
              className={`btn ${isAddOpen ? 'btn-soft' : 'btn-primary'}`}
              style={{
                fontWeight: 700,
                fontSize: '.85rem',
                padding: '9px 18px',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                setIsAddOpen(!isAddOpen);
                setFormFeedback(null);
              }}
            >
              {isAddOpen ? '✕ Fechar formulário' : '➕ Subir arquivo de áudio'}
            </button>
          </div>

          {/* Collapsible Upload Form */}
          {isAddOpen && (
            <form
              onSubmit={handleSaveAudio}
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <label
                  htmlFor="audio-file-input"
                  style={{ display: 'block', fontSize: '.84rem', fontWeight: 650, marginBottom: '6px' }}
                >
                  1. Escolher arquivo de áudio (.mp3, .wav, .m4a, .aac, .ogg)
                </label>
                <input
                  ref={fileInputRef}
                  id="audio-file-input"
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px',
                    fontSize: '.84rem',
                    background: 'var(--canvas)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                  }}
                  required
                />
                {uploadFile && (
                  <p style={{ margin: '4px 0 0', fontSize: '.76rem', color: 'var(--green-dark)' }}>
                    Arquivo selecionado: <strong>{uploadFile.name}</strong> (
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                    {detectedDuration ? ` • ~${formatAudioTime(detectedDuration)}` : ''})
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label
                    htmlFor="audio-title-input"
                    style={{ display: 'block', fontSize: '.84rem', fontWeight: 650, marginBottom: '6px' }}
                  >
                    2. Título do áudio
                  </label>
                  <input
                    id="audio-title-input"
                    type="text"
                    placeholder="Ex: Respiração 4-7-8 Guiada"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '.84rem',
                      background: 'var(--canvas)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="audio-category-select"
                    style={{ display: 'block', fontSize: '.84rem', fontWeight: 650, marginBottom: '6px' }}
                  >
                    3. Categoria
                  </label>
                  <select
                    id="audio-category-select"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as AudioCategory)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '.84rem',
                      background: 'var(--canvas)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                    }}
                  >
                    {AUDIO_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="audio-desc-input"
                  style={{ display: 'block', fontSize: '.84rem', fontWeight: 650, marginBottom: '6px' }}
                >
                  4. Breve descrição ou instrução (opcional)
                </label>
                <input
                  id="audio-desc-input"
                  type="text"
                  placeholder="Ex: Prática de 5 minutos para estabilizar o ritmo cardíaco e ancorar a atenção."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '.84rem',
                    background: 'var(--canvas)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                  }}
                />
              </div>

              {formFeedback && (
                <div
                  className="notice"
                  style={{
                    margin: '4px 0',
                    fontSize: '.82rem',
                    background: formFeedback.type === 'success' ? 'var(--green-soft)' : '#fee2e2',
                    borderColor: formFeedback.type === 'success' ? 'var(--green)' : '#ef4444',
                    color: formFeedback.type === 'success' ? 'var(--green-dark)' : '#b91c1c',
                  }}
                >
                  <strong>{formFeedback.type === 'success' ? '✓ ' : '⚠ '}</strong>
                  {formFeedback.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-plain btn-small"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 700, padding: '8px 20px' }}
                  disabled={isSubmitting || !uploadFile}
                >
                  {isSubmitting ? 'Salvando áudio...' : '✓ Salvar e adicionar à biblioteca'}
                </button>
              </div>
            </form>
          )}
        </article>

        {/* =========================================================================
            ACTIVE AUDIO PLAYER PANEL (Integrated when track is selected)
           ========================================================================= */}
        {currentTrack && (
          <article
            className="card"
            style={{
              padding: '16px 18px',
              border: '1.5px solid var(--green)',
              background: 'var(--paper)',
            }}
            role="region"
            aria-label="Reprodutor de áudio em execução"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="mini-tag"
                  style={{
                    background: isPlaying ? 'var(--green-soft)' : 'var(--paper)',
                    color: isPlaying ? 'var(--green-dark)' : 'var(--muted)',
                    border: '1px solid var(--line)',
                    fontWeight: 700,
                  }}
                >
                  {isLoadingAudio
                    ? 'Carregando áudio...'
                    : isPlaying
                    ? '▶ Em reprodução'
                    : '⏸ Pausado'}
                </span>
                <span style={{ fontSize: '.76rem', color: 'var(--muted)' }}>
                  {currentTrack.category}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-plain btn-small"
                style={{ fontSize: '.74rem', padding: '3px 8px' }}
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                  }
                  setCurrentTrack(null);
                  setIsPlaying(false);
                }}
                aria-label="Fechar reprodutor"
              >
                ✕ Fechar
              </button>
            </div>

            <strong style={{ fontSize: '1rem', color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
              {currentTrack.title}
            </strong>
            <p style={{ margin: '0 0 12px', fontSize: '.8rem', color: 'var(--muted)' }}>
              {currentTrack.description}
            </p>

            {playbackError ? (
              <div className="notice" style={{ margin: '8px 0', fontSize: '.8rem' }}>
                <strong>Aviso:</strong> {playbackError}
              </div>
            ) : null}

            {/* Progress Bar & Seek */}
            <div style={{ marginBottom: '10px' }}>
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.1}
                value={currentTime}
                disabled={duration <= 0 || isLoadingAudio}
                onChange={(e) => handleSeek(Number(e.target.value))}
                style={{ width: '100%', minHeight: '32px', margin: 0 }}
                aria-label="Posição de reprodução"
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '.76rem',
                  color: 'var(--muted)',
                  marginTop: '2px',
                }}
              >
                <span>{formatAudioTime(currentTime)}</span>
                <span>{duration > 0 ? formatAudioTime(duration) : '--:--'}</span>
              </div>
            </div>

            {/* Controls Bar: Play/Pause, 10s skip & Volume */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                paddingTop: '8px',
                borderTop: '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-small ${isPlaying ? 'btn-soft' : 'btn-primary'}`}
                  style={{ minWidth: '100px', minHeight: '44px', fontWeight: 700, padding: '8px 16px' }}
                  onClick={handleTogglePlayPause}
                  disabled={isLoadingAudio}
                >
                  {isPlaying ? '⏸ Pausar' : '▶ Reproduzir'}
                </button>

                <button
                  type="button"
                  className="btn btn-plain btn-small"
                  style={{ fontSize: '.76rem', padding: '6px 10px', minHeight: '44px' }}
                  onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                  title="Voltar 10 segundos"
                  aria-label="Voltar 10 segundos"
                >
                  ↺ -10s
                </button>

                <button
                  type="button"
                  className="btn btn-plain btn-small"
                  style={{ fontSize: '.76rem', padding: '6px 10px', minHeight: '44px' }}
                  onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
                  title="Avançar 10 segundos"
                  aria-label="Avançar 10 segundos"
                >
                  +10s ↻
                </button>

                <button
                  type="button"
                  className="btn btn-plain btn-small"
                  style={{ fontSize: '.76rem', padding: '6px 8px', minHeight: '44px' }}
                  onClick={() => handleSeek(0)}
                  title="Reiniciar do começo"
                  aria-label="Reiniciar do começo"
                >
                  ⏮
                </button>
              </div>

              {/* Volume Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="inline-link"
                  style={{ fontSize: '1.05rem', padding: '6px', minWidth: '36px', minHeight: '36px', display: 'grid', placeItems: 'center' }}
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
                >
                  {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  style={{ width: '80px', minHeight: '44px', margin: 0 }}
                  aria-label="Volume"
                />
              </div>
            </div>
          </article>
        )}

        {/* =========================================================================
            CATEGORY FILTER BAR
           ========================================================================= */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
          }}
          role="group"
          aria-label="Filtrar por categoria"
        >
          {['Todas', ...AUDIO_CATEGORIES.map((c) => c.id)].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-small ${selectedCategory === cat ? 'btn-primary' : 'btn-plain'}`}
              style={{
                fontSize: '.76rem',
                padding: '5px 12px',
                minHeight: '32px',
                whiteSpace: 'nowrap',
                fontWeight: selectedCategory === cat ? 700 : 500,
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* =========================================================================
            AUDIO CATALOG SECTIONS BY CATEGORY
           ========================================================================= */}
        {filteredCategories.map((group) => {
          const hasTracks = group.tracks.length > 0;

          return (
            <article key={group.category} className="card" style={{ padding: '16px 18px' }}>
              <div className="card-head" style={{ marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }} aria-hidden="true">
                      {group.icon}
                    </span>
                    <h2 style={{ fontSize: '1.02rem', margin: 0 }}>{group.title}</h2>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '.8rem', color: 'var(--muted)' }}>
                    {group.description}
                  </p>
                </div>

                <span
                  className="mini-tag"
                  style={{
                    fontSize: '.72rem',
                    background: hasTracks ? 'var(--green-soft)' : 'var(--paper)',
                    color: hasTracks ? 'var(--green-dark)' : 'var(--muted)',
                    border: '1px solid var(--line)',
                    fontWeight: 700,
                  }}
                >
                  {hasTracks ? `${group.tracks.length} áudio(s)` : 'Aguardando arquivos'}
                </span>
              </div>

              {/* Tracks List or Informative Empty State */}
              {hasTracks ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.tracks.map((track) => {
                    const isThisTrackActive = currentTrack?.id === track.id;
                    const isThisTrackPlaying = isThisTrackActive && isPlaying;
                    const isCustomTrack = track.id !== 'sino-pausa-consciente';

                    return (
                      <div
                        key={track.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: isThisTrackActive ? 'var(--green)' : 'var(--line)',
                          background: isThisTrackActive ? 'var(--green-soft)' : 'var(--paper)',
                          transition: 'all .15s ease',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong
                              style={{
                                fontSize: '.88rem',
                                color: isThisTrackActive ? 'var(--green-dark)' : 'var(--ink)',
                              }}
                            >
                              {track.title}
                            </strong>

                            {track.duration ? (
                              <span
                                className="mini-tag"
                                style={{
                                  fontSize: '.7rem',
                                  background: 'var(--paper)',
                                  border: '1px solid var(--line)',
                                }}
                              >
                                {formatAudioTime(track.duration)}
                              </span>
                            ) : null}
                          </div>

                          <p style={{ margin: '3px 0 0', fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                            {track.description || 'Áudio para regulação e presença.'}
                          </p>
                        </div>

                        {/* Actions: Escutar / Pausar and Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className={`btn btn-small ${isThisTrackPlaying ? 'btn-soft' : 'btn-primary'}`}
                            style={{
                              fontSize: '.76rem',
                              padding: '6px 14px',
                              minHeight: '34px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                            onClick={() => handleSelectTrack(track)}
                            aria-label={
                              isThisTrackPlaying
                                ? `Pausar ${track.title}`
                                : `Reproduzir ${track.title}`
                            }
                          >
                            {isThisTrackPlaying ? '⏸ Pausar' : '▶ Escutar'}
                          </button>

                          {isCustomTrack && (
                            <button
                              type="button"
                              className="btn btn-plain btn-small"
                              style={{
                                fontSize: '.72rem',
                                padding: '6px 8px',
                                minHeight: '34px',
                                color: 'var(--muted)',
                              }}
                              onClick={(e) => handleDeleteTrack(track, e)}
                              title="Remover este áudio"
                              aria-label={`Remover ${track.title}`}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: '14px',
                    textAlign: 'center',
                    background: 'var(--paper)',
                    borderRadius: '10px',
                    border: '1px dashed var(--line)',
                    fontSize: '.8rem',
                    color: 'var(--muted)',
                  }}
                >
                  Nenhum áudio disponível nesta categoria no momento.
                  <br />
                  Clique em <strong>"Subir arquivo de áudio"</strong> no topo para adicionar seus arquivos aqui.
                </div>
              )}
            </article>
          );
        })}

        {/* Informative Guidance & Instructions for Manual Folder Option */}
        <article className="card" style={{ padding: '15px 18px' }}>
          <div className="card-head" style={{ marginBottom: '8px' }}>
            <div>
              <h2 style={{ fontSize: '.95rem', margin: 0 }}>Onde ficam os arquivos no projeto</h2>
              <p style={{ margin: '2px 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>
                Diretório físico e funcionamento offline para o APK Android.
              </p>
            </div>
            <span className="tag" style={{ fontSize: '.74rem' }}>
              {totalRegisteredTracks} áudio(s) cadastrados
            </span>
          </div>

          <p style={{ fontSize: '.78rem', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.45 }}>
            Você pode adicionar os arquivos de 2 formas:
          </p>

          <div style={{ fontSize: '.76rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            <ul style={{ paddingLeft: '18px', margin: 0 }}>
              <li style={{ marginBottom: '6px' }}>
                <strong>Direto pelo aplicativo (mais fácil):</strong> clique no botão verde <strong>"➕ Subir arquivo de áudio"</strong> no topo desta tela, escolha o arquivo no seu computador ou celular e ele será registrado imediatamente.
              </li>
              <li>
                <strong>Pelo computador antes de compilar o APK:</strong> copie seus arquivos <code>.mp3</code> ou <code>.wav</code> para a pasta física <code>public/audio/</code> do projeto. Todos os arquivos colocados lá ficam embutidos no APK final e funcionam sem conexão à internet.
              </li>
            </ul>
          </div>
        </article>
      </div>

      {/* Modal Acessível: Exclusão de Faixa de Áudio */}
      <ConfirmModal
        isOpen={isConfirmDeleteTrackOpen}
        title="Remover áudio da biblioteca?"
        message={`Deseja remover "${trackToDelete?.title || 'este áudio'}" da sua biblioteca? Esta ação não afetará os áudios padrão do sistema.`}
        confirmText="Sim, remover"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={executeDeleteTrack}
        onCancel={() => {
          setIsConfirmDeleteTrackOpen(false);
          setTrackToDelete(null);
        }}
      />
    </section>
  );
};
