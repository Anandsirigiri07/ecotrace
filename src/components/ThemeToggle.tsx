import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Accessible button to toggle between Light and Dark mode.
 * Targets WCAG 2.1 AA contrast requirements and uses aria-label for screen readers.
 */
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className="p-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-150 dark:hover:bg-gray-700 transition-all outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 cursor-pointer shadow-sm"
    >
      {theme === 'light' ? (
        <Moon size={18} className="fill-current" />
      ) : (
        <Sun size={18} className="fill-current text-warningColor" />
      )}
    </button>
  );
};

export default ThemeToggle;
