import React from 'react';

interface ProgressIndicatorProps {
  value: number;
  max: number;
  label?: string;
  subLabel?: string;
  colorClass?: string;
  bgClass?: string;
  className?: string;
}

/**
 * ProgressIndicator renders an accessible, responsive progress bar.
 * Follows ARIA standards for progressbar roles.
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max,
  label,
  subLabel,
  colorClass = 'bg-secondary dark:bg-accent',
  bgClass = 'bg-gray-150 dark:bg-gray-700',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || subLabel) && (
        <div className="flex justify-between items-baseline text-xs font-bold">
          {label && <span className="text-textPrimary dark:text-white uppercase tracking-wider">{label}</span>}
          {subLabel && <span className="text-textSecondary dark:text-gray-400 font-semibold">{subLabel}</span>}
        </div>
      )}
      <div 
        className={`w-full h-3 rounded-full overflow-hidden ${bgClass}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div 
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;
