import React from 'react';
import DashboardCard from './DashboardCard';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  iconColorClass?: string;
  iconBgClass?: string;
  trend?: {
    value: string;
    isPositive: boolean; // positive in terms of footprint change (meaning increasing carbon is bad, decreasing is good)
    labelText?: string;
  };
  className?: string;
}

/**
 * StatCard displays key sustainability or metric stats.
 * Uses an SVG/Lucide icon, values, and optional trends. Fully supports dark mode.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColorClass = 'text-secondary dark:text-accent',
  iconBgClass = 'bg-mintBg dark:bg-gray-700',
  trend,
  className = '',
}) => {
  return (
    <DashboardCard className={`p-5 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${iconBgClass} rounded-xl flex items-center justify-center shrink-0 shadow-inner`} aria-hidden="true">
          <Icon className={iconColorClass} size={22} />
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary dark:text-gray-400 block">
            {title}
          </span>
          <h3 className="text-xl md:text-2xl font-extrabold text-primary dark:text-white leading-tight">
            {value}
          </h3>
          {trend && (
            <div className="flex items-center gap-1 mt-0.5" aria-label={trend.labelText || `${trend.value} trend`}>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                trend.isPositive 
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
                  : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
              }`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">
                vs last month
              </span>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
};

export default StatCard;
