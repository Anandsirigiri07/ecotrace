import { useEffect, useState } from 'react';
import { useLiveData } from '../context/LiveDataContext';
import DashboardCard from './DashboardCard';
import SectionHeader from './SectionHeader';

interface CarbonScoreRingProps {
  weeklyScore: number; // in kg CO2
  hasData?: boolean;
}

/**
 * Animated ring displaying weekly carbon score comparison.
 * Combines SVG visualizations and screen-reader status indicators.
 */
export function CarbonScoreRing({ weeklyScore, hasData = true }: CarbonScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const { nationalDailyAvgKg } = useLiveData();
  const weeklyTarget = (nationalDailyAvgKg * 7).toFixed(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(weeklyScore);
    }, 150);
    return () => clearTimeout(timer);
  }, [weeklyScore]);

  // Determine label details based on user instructions
  const label = !hasData
    ? { text: 'NO DATA', color: 'text-gray-500 dark:text-gray-400', stroke: '#9ca3af', bg: 'bg-gray-100 dark:bg-gray-700' }
    : weeklyScore <= 20
      ? { text: 'EXCELLENT', color: 'text-green-600 dark:text-green-450', stroke: '#22c55e', bg: 'bg-green-50 dark:bg-green-950/20' }
      : weeklyScore <= 36
        ? { text: 'GOOD', color: 'text-lime-600 dark:text-lime-450', stroke: '#84cc16', bg: 'bg-lime-50 dark:bg-lime-950/20' }
        : weeklyScore <= 50
          ? { text: 'MODERATE', color: 'text-amber-600 dark:text-amber-450', stroke: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/20' }
          : { text: 'HIGH', color: 'text-red-600 dark:text-red-450', stroke: '#ef4444', bg: 'bg-red-50 dark:bg-red-950/20' };

  // Ring geometry
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Cap visual percentage at 100% (max 75kg visual scale)
  const maxScale = 75;
  const percentage = hasData ? Math.min((animatedScore / maxScale) * 100, 100) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <DashboardCard className="flex flex-col items-center justify-center p-6">
      <SectionHeader 
        title="Weekly Carbon Score" 
        level={3} 
        className="mb-4 text-center" 
      />

      <div className="relative w-44 h-44 flex items-center justify-center" role="img" aria-label={`Weekly carbon score: ${weeklyScore.toFixed(1)} kg CO2. Status: ${label.text}.`}>
        {/* Background Track circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke="#E2E8F0"
            className="stroke-gray-200 dark:stroke-gray-700"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated score circle */}
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke={label.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Scoring text in the center */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-textPrimary dark:text-white leading-none">
            {weeklyScore.toFixed(1)}
          </span>
          <span className="text-xs text-textSecondary dark:text-gray-400 mt-1">kg CO₂</span>
          <div 
            className={`mt-2 px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${label.bg} ${label.color}`}
          >
            {label.text}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
          India Target:{' '}
          <strong className="text-gray-800 dark:text-white">
            {weeklyTarget} kg/week
          </strong>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          World Bank data · updates live
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
          Scale maxes out at {maxScale} kg CO₂
        </p>
      </div>
    </DashboardCard>
  );
}
export default CarbonScoreRing;
