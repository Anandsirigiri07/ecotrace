import React, { useEffect, useState } from 'react';
import { useCarbon } from '../hooks/useCarbon';
import { useLiveData } from '../context/LiveDataContext';

export const CarbonSavedCounter = () => {
  const { summary } = useCarbon();
  const { nationalDailyAvgKg } = useLiveData();
  const [animated, setAnimated] = useState(0);

  const daysTracked = 30; // last 30 days
  const avgOver30Days = nationalDailyAvgKg * daysTracked;
  const userTotal = summary.monthKg;
  const saved = Math.max(0, avgOver30Days - userTotal);

  // 1 tree absorbs ~21kg CO2/year = 1.75kg/month
  const treesEquivalent = (saved / 1.75).toFixed(1);

  // Animate counter on mount
  useEffect(() => {
    let start = 0;
    const end = saved;
    if (end === 0) {
      setAnimated(0);
      return;
    }
    const duration = 1500;
    const step = end / (duration / 16);

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setAnimated(end);
        clearInterval(timer);
      } else {
        setAnimated(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [saved]);

  return (
    <div className="bg-gradient-to-br from-green-600
      to-emerald-700 rounded-2xl p-5 text-white shadow-lg"
      role="status"
      aria-label={`You saved ${saved.toFixed(1)} kg CO2
        vs India average`}>

      <p className="text-green-200 text-xs font-bold
        tracking-wide mb-1">
        🌍 CO₂ SAVED VS INDIA AVERAGE
      </p>

      <div className="flex items-end gap-2 mt-2">
        <span className="text-5xl font-bold tabular-nums">
          {saved > 0 ? animated.toFixed(1) : '0.0'}
        </span>
        <span className="text-green-200 text-lg mb-1">
          kg CO₂
        </span>
      </div>

      <p className="text-green-100 text-sm mt-1">
        This month vs national average
      </p>

      {saved > 0 && (
        <div className="mt-3 bg-green-500/30 rounded-xl
          p-3 flex items-center gap-3">
          <span className="text-3xl">🌳</span>
          <div>
            <p className="font-bold text-lg">
              {treesEquivalent} trees
            </p>
            <p className="text-green-200 text-xs">
              equivalent carbon absorbed
            </p>
          </div>
        </div>
      )}

      {saved <= 0 && (
        <div className="mt-3 bg-green-500/30 rounded-xl
          p-3">
          <p className="text-sm text-green-100">
            Log activities to see your carbon savings
            vs the India average 🌱
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-between
        text-xs text-green-200">
        <span>Your total: {userTotal.toFixed(1)}kg</span>
        <span>India avg: {avgOver30Days.toFixed(1)}kg</span>
      </div>
    </div>
  );
};

export default CarbonSavedCounter;
