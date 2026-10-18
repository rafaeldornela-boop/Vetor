import React, { useState, useEffect } from 'react';
import { registerModalCloser } from '../utils/modalRegistry';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  requirePromptText?: string;
  promptPlaceholder?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  requirePromptText,
  promptPlaceholder = 'Digite aqui para confirmar',
  onConfirm,
  onCancel,
}) => {
  const [promptValue, setPromptValue] = useState<string>('');

  // Register modal closer for Android back button and keyboard Escape
  useEffect(() => {
    if (!isOpen) {
      setPromptValue('');
      return;
    }

    const unregister = registerModalCloser(() => {
      onCancel();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unregister();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isPromptValid = requirePromptText
    ? promptValue.trim() === requirePromptText
    : true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="card"
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: '20px',
          maxWidth: '440px',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          width: '100%',
          padding: '18px 20px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <strong id="confirm-modal-title" style={{ fontSize: '1.05rem', color: isDanger ? 'var(--red-ink)' : 'var(--ink)' }}>
            {title}
          </strong>
          <button
            type="button"
            className="btn btn-plain btn-small"
            style={{ padding: '6px 10px', fontSize: '.9rem', minHeight: '36px', minWidth: '36px' }}
            onClick={onCancel}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <p
          style={{
            margin: '0 0 16px',
            fontSize: '.86rem',
            color: 'var(--muted)',
            lineHeight: 1.5,
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </p>

        {requirePromptText && (
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="prompt-confirmation-input"
              style={{ display: 'block', fontSize: '.82rem', fontWeight: 650, color: 'var(--ink)', marginBottom: '6px' }}
            >
              Para confirmar, digite <strong>{requirePromptText}</strong> abaixo:
            </label>
            <input
              id="prompt-confirmation-input"
              type="text"
              autoFocus
              placeholder={promptPlaceholder}
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '16px',
                border: '1.5px solid var(--line)',
                borderRadius: '10px',
                background: 'var(--canvas)',
                color: 'var(--ink)',
                minHeight: '44px',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '6px' }}>
          <button
            type="button"
            className="btn btn-plain"
            style={{ fontSize: '.86rem', padding: '10px 18px', minHeight: '44px', flex: '1 1 120px' }}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            style={{
              fontSize: '.86rem',
              fontWeight: 700,
              padding: '10px 18px',
              minHeight: '44px',
              flex: '1 1 140px',
              backgroundColor: isDanger ? 'var(--red-ink)' : undefined,
              color: isDanger ? '#ffffff' : undefined,
              opacity: isPromptValid ? 1 : 0.45,
              cursor: isPromptValid ? 'pointer' : 'not-allowed',
            }}
            disabled={!isPromptValid}
            onClick={() => {
              if (isPromptValid) {
                onConfirm();
              }
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
