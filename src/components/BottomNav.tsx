import React from 'react';
import { ScreenName } from '../types';

interface BottomNavProps {
  currentScreen: ScreenName;
  onSelectScreen: (screen: ScreenName) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onSelectScreen }) => {
  const navItems: { id: ScreenName; label: string; icon: string }[] = [
    { id: 'hoje', label: 'Hoje', icon: '☀️' },
    { id: 'acalmar', label: 'Acalmar', icon: '🌿' },
    { id: 'praticas', label: 'Práticas', icon: '⌂' },
    { id: 'pensamentos', label: 'Pensamentos', icon: '🧠' },
    { id: 'audios', label: 'Áudios', icon: '♫' },
    { id: 'progresso', label: 'Progresso', icon: '↗' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            className={`nav-btn ${isActive ? 'active' : ''}`}
            type="button"
            data-screen={item.id}
            title={item.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelectScreen(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
