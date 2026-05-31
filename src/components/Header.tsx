import React from 'react';
import { BookOpen, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="brand serif">
        <BookOpen className="brand-icon" size={24} />
        <span>Jagran ePaperScraper</span>
      </div>
      <div className="header-actions">
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};
