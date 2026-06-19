import React, { useEffect, useState } from 'react';
import { useLiveData } from '../context/LiveDataContext';

interface CarbonScoreRingProps {
  weeklyScore: number; // in kg CO2
  hasData?: boolean;
}

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
    ? { text: 'NO DATA', color: '#9ca3af', stroke: '#cbd5e1', bg: '#f3f4f6' }
    : weeklyScore <= 20
      ? { text: 'EXCELLENT', color: '#22c55e', stroke: '#22c55e', bg: '#f0fdf4' }
      : weeklyScore <= 36
        ? { text: 'GOOD', color: '#84cc16', stroke: '#84cc16', bg: '#f7fee7' }
        : weeklyScore <= 50
          ? { text: 'MODERATE', color: '#f59e0b', stroke: '#f59e0b', bg: '#fffbeb' }
          : { text: 'HIGH', color: '#ef4444', stroke: '#ef4444', bg: '#fef2f2' };

  // Ring geometry
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Cap visual percentage at 100% (max 75kg visual scale)
  const maxScale = 75;
  const percentage = hasData ? Math.min((animatedScore / maxScale) * 100, 100) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-md border border-gray-100">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-textSecondary mb-4">
        Weekly Carbon Score
      </h3>

      <div className="relative w-44 h-44 flex items-center justify-center">
        {/* Background Track circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r={radius}
            stroke="#E2E8F0"
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
          <span className="text-3xl font-extrabold text-textPrimary leading-none">
            {weeklyScore.toFixed(1)}
          </span>
          <span className="text-xs text-textSecondary mt-1">kg CO₂</span>
          <div 
            style={{ backgroundColor: label.bg, color: label.color }}
            className="mt-2 px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
          >
            {label.text}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-gray-600 text-sm mt-2">
          India Target:{' '}
          <strong className="text-gray-800">
            {weeklyTarget} kg/week
          </strong>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          World Bank data · updates live
        </p>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Scale maxes out at {maxScale} kg CO₂
        </p>
      </div>
    </div>
  );
}
export default CarbonScoreRing;
