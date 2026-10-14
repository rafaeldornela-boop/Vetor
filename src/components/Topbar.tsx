import React from 'react';

interface TopbarProps {
  datePillText?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ datePillText }) => {
  const defaultDateText = React.useMemo(() => {
    return new Date()
      .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
      .replace('.', '');
  }, []);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          v.
        </span>
        <span>vetor</span>
      </div>
      <div className="date-pill" id="datePill">
        {datePillText || defaultDateText || 'Seu espaço de cuidado'}
      </div>
    </header>
  );
};
