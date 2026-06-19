import React from 'react';

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  ariaLabel?: string;
}

/**
 * A standard, accessible container card with responsive styling.
 * Supports light/dark styles, elevation shadows, and standard borders.
 * Extends standard HTML attributes to pass aria tags, test IDs, and other attributes.
 */
export const DashboardCard: React.FC<DashboardCardProps> = ({
  children,
  className = '',
  onClick,
  role,
  ariaLabel,
  ...rest
}) => {
  const baseStyle = "bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-200";
  const hoverStyle = onClick ? "hover:shadow-md hover:border-secondary/30 dark:hover:border-secondary/30 cursor-pointer active:scale-[0.99]" : "";

  return (
    <div
      onClick={onClick}
      role={role || (onClick ? 'button' : undefined)}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      className={`${baseStyle} ${hoverStyle} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default DashboardCard;
