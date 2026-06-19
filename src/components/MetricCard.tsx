import React from 'react';
import DashboardCard from './DashboardCard';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  colorClass?: string;
  className?: string;
}

/**
 * MetricCard represents a basic card block displaying a single metric value,
 * title label, and secondary text.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  colorClass = 'text-primary dark:text-white',
  className = '',
}) => {
  return (
    <DashboardCard className={`p-4 ${className}`}>
      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wide block mb-1">
        {title}
      </span>
      <span className={`text-lg md:text-xl font-extrabold block ${colorClass}`}>
        {value}
      </span>
      {subtitle && (
        <p className="text-[10px] font-semibold text-textSecondary dark:text-gray-400 mt-1 leading-normal">
          {subtitle}
        </p>
      )}
    </DashboardCard>
  );
};

export default MetricCard;
