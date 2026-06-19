import React, { useEffect, useState } from 'react';

interface CarbonScoreRingProps {
  weeklyScore: number; // in kg CO2
  targetScore?: number; // average weekly target e.g. 36.5
}

export function CarbonScoreRing({ weeklyScore, targetScore = 36.5 }: CarbonScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(weeklyScore);
    }, 150);
    return () => clearTimeout(timer);
  }, [weeklyScore]);

  // Determine status color based on thresholds
  // Green = Good (< 25 kg), Yellow = Average (25 - 50 kg), Red = High (> 50 kg)
  let statusColor = 'text-secondary'; // default green (#40916C)
  let statusStroke = '#40916C';
  let statusBg = 'bg-secondary/10';
  let statusText = 'Good';

  if (weeklyScore >= 25 && weeklyScore <= 50) {
    statusColor = 'text-warningColor';
    statusStroke = '#F6AD55';
    statusBg = 'bg-warningColor/10';
    statusText = 'Average';
  } else if (weeklyScore > 50) {
    statusColor = 'text-dangerColor';
    statusStroke = '#FC8181';
    statusBg = 'bg-dangerColor/10';
    statusText = 'High';
  }

  // Ring geometry
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Cap visual percentage at 100% (max 75kg visual scale)
  const maxScale = 75;
  const percentage = Math.min((animatedScore / maxScale) * 100, 100);
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
            stroke={statusStroke}
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
          <div className={`mt-2 px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${statusBg} ${statusColor}`}>
            {statusText}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-textSecondary font-medium">
          India Target: <span className="font-semibold text-textPrimary">{targetScore} kg/week</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          Scale maxes out at {maxScale} kg CO₂
        </p>
      </div>
    </div>
  );
}
export default CarbonScoreRing;
