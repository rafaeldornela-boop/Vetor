import React from 'react';

interface TopbarProps {
  datePillText?: string;
  theme?: 'light' | 'dark' | 'system';
  onToggleTheme?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  datePillText,
  theme = 'system',
  onToggleTheme,
}) => {
  const defaultDateText = React.useMemo(() => {
    return new Date()
      .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
      .replace('.', '');
  }, []);

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻';
  const themeLabel =
    theme === 'dark'
      ? 'Tema: Escuro (clique para alternar)'
      : theme === 'light'
      ? 'Tema: Claro (clique para alternar)'
      : 'Tema: Seguir o sistema (clique para alternar)';

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          v.
        </span>
        <span>vetor</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleTheme}
          title={themeLabel}
          aria-label={themeLabel}
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: '999px',
            padding: '6px 12px',
            minHeight: '38px',
            fontSize: '.82rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--muted)',
            fontWeight: 700,
          }}
        >
          <span aria-hidden="true">{themeIcon}</span>
          <span style={{ fontSize: '.72rem', textTransform: 'capitalize' }}>
            {theme === 'system' ? 'Auto' : theme === 'dark' ? 'Escuro' : 'Claro'}
          </span>
        </button>
        <div
          className="date-pill"
          id="datePill"
          style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
        >
          {datePillText || defaultDateText || 'Seu espaço'}
        </div>
      </div>
    </header>
  );
};
