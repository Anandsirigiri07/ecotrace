import React from 'react';
import { useLiveData } from '../context/LiveDataContext';
import DashboardCard from './DashboardCard';

/**
 * GridStatusCard displays the real-time status of the India Electricity Grid,
 * showing the peak/off-peak periods and recommending carbon reduction actions.
 */
export const GridStatusCard = () => {
  const { gridIntensity, gridIndex } = useLiveData();
  const hour = new Date().getHours();
  const isPeak = hour >= 10 && hour <= 20;

  // Real India grid times
  const nextChange = isPeak
    ? `Off-peak at 8:00 PM`
    : `Peak hours at 10:00 AM`;

  const configs = {
    high: {
      bg: 'from-red-50 to-orange-50 dark:from-red-950/10 dark:to-orange-950/10',
      border: 'border-red-200 dark:border-red-900/40',
      badge: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400',
      dot: 'bg-red-500',
      emoji: '🔴',
      label: 'PEAK — HIGH CARBON',
      tip: 'Run heavy appliances after 8 PM for cleaner energy'
    },
    moderate: {
      bg: 'from-yellow-50 to-amber-50 dark:from-yellow-950/10 dark:to-amber-950/10',
      border: 'border-yellow-200 dark:border-yellow-900/40',
      badge: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
      dot: 'bg-yellow-500',
      emoji: '🟡',
      label: 'MODERATE CARBON',
      tip: 'Avoid unnecessary electrical usage right now'
    },
    low: {
      bg: 'from-green-50 to-emerald-50 dark:from-green-950/10 dark:to-emerald-950/10',
      border: 'border-green-200 dark:border-green-900/40',
      badge: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400',
      dot: 'bg-green-500',
      emoji: '🟢',
      label: 'OFF-PEAK — CLEANER',
      tip: 'Great time to charge devices and run appliances'
    }
  };

  const cfg = configs[gridIndex as keyof typeof configs]
    ?? configs.moderate;

  return (
    <DashboardCard className={`bg-gradient-to-br ${cfg.bg} ${cfg.border} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
          ⚡ INDIA ELECTRICITY GRID
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-800 dark:text-white">
            {gridIntensity}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            kgCO₂/kWh
          </div>
        </div>
        <div className="flex-1 border-l border-gray-200 dark:border-gray-700 pl-4">
          <div className="flex items-center gap-1 mb-1">
            <div className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {isPeak ? 'Peak hours (10AM–8PM)' : 'Off-peak hours'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {nextChange}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-200 mt-3 border-t border-gray-150 dark:border-gray-700 pt-2 font-medium">
        💡 {cfg.tip}
      </p>

      {/* Visual peak/off-peak timeline */}
      <div className="mt-3">
        <div className="flex text-[10px] text-gray-400 dark:text-gray-500 justify-between mb-1">
          <span>12AM</span>
          <span>10AM</span>
          <span>8PM</span>
          <span>12AM</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
          <div className="h-full bg-green-400" style={{ width: '41.67%' }} />
          <div className="h-full bg-red-400" style={{ width: '41.67%' }} />
          <div className="h-full bg-green-400" style={{ width: '16.67%' }} />
        </div>
        <div className="flex text-[10px] justify-between mt-1">
          <span className="text-green-600 dark:text-green-400">🟢 Clean</span>
          <span className="text-red-500 dark:text-red-400">🔴 Peak</span>
          <span className="text-green-600 dark:text-green-400">🟢 Clean</span>
        </div>
        {/* Current time indicator */}
        <div className="relative h-3 -mt-4">
          <div
            className="absolute w-3 h-3 bg-blue-600 rounded-full border-2 border-white dark:border-gray-800 shadow-md"
            style={{
              left: `${(hour / 24) * 100}%`,
              transform: 'translateX(-50%)',
              top: '0'
            }}
            aria-label={`Current time: ${hour}:00`}
          />
        </div>
      </div>
    </DashboardCard>
  );
};

export default GridStatusCard;
