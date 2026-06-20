import { useMemo } from 'react';
import { Activity } from '../types';

interface Props {
  activities: Activity[];
}

export const ActivityHeatmap = ({ activities }: Props) => {
  const weeks = 52;
  const days = 7;
  
  // Build date → CO2 map for entire year
  const dateMap = useMemo(() => {
    const map: Record<string, number> = {};
    activities.forEach(a => {
      map[a.date] = (map[a.date] || 0) + a.co2Kg;
    });
    return map;
  }, [activities]);

  // Generate grid dates (52 weeks back from today)
  const grid = useMemo(() => {
    const result = [];
    const today = new Date();
    
    for (let w = weeks - 1; w >= 0; w--) {
      const week = [];
      for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dateStr = date.toISOString().split('T')[0];
        const co2 = dateMap[dateStr] || 0;
        
        // Color: green = low CO2, red = high CO2
        // (inverted from GitHub — green is GOOD here)
        let color = '#ebedf0'; // no data
        if (co2 > 0 && co2 <= 3) color = '#86efac';   // light green
        if (co2 > 3 && co2 <= 6) color = '#22c55e';   // green
        if (co2 > 6 && co2 <= 10) color = '#f59e0b';  // amber
        if (co2 > 10) color = '#ef4444';               // red
        
        week.push({ date: dateStr, co2, color });
      }
      result.push(week);
    }
    return result;
  }, [dateMap]);

  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
      <h3 className="font-extrabold text-primary mb-1 text-sm md:text-base uppercase tracking-wider">
        Year in Carbon 🌱
      </h3>
      <p className="text-[10px] text-textSecondary font-semibold mb-4 leading-relaxed">
        Hover or focus cells to view daily logged emissions. Green is lower carbon footprint (optimal).
      </p>
      
      <div className="overflow-x-auto">
        <svg 
          width={weeks * 14 + 30} 
          height={days * 14 + 30}
          role="grid"
          aria-label="Carbon footprint heatmap for the past year"
          className="mx-auto"
        >
          {/* Month labels */}
          {grid.map((week, wi) => {
            const date = new Date(week[0].date);
            if (date.getDate() <= 7) {
              return (
                <text key={wi} x={wi * 14 + 30} y={10}
                  fontSize="8" className="fill-textSecondary font-bold">
                  {months[date.getMonth()]}
                </text>
              );
            }
            return null;
          })}
          
          {/* Day labels */}
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <text key={i} x={8} y={i * 14 + 23}
              fontSize="8" className="fill-textSecondary font-bold">
              {d}
            </text>
          ))}
          
          {/* Heatmap cells */}
          {grid.map((week, wi) =>
            week.map((day, di) => (
              <g key={`${wi}-${di}`}>
                <rect
                  x={wi * 14 + 28}
                  y={di * 14 + 14}
                  width={11}
                  height={11}
                  rx={2}
                  fill={day.color}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={
                    day.co2 > 0 
                    ? `${day.date}: ${day.co2.toFixed(1)}kg CO2`
                    : `${day.date}: no data`
                  }
                  className="outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-all cursor-pointer"
                >
                  <title>
                    {day.co2 > 0 
                      ? `${day.date}: ${day.co2.toFixed(1)}kg CO2`
                      : `${day.date}: no data`}
                  </title>
                </rect>
              </g>
            ))
          )}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-textSecondary justify-center">
        <span>Less CO2</span>
        {['#ebedf0','#86efac','#22c55e',
          '#f59e0b','#ef4444'].map(c => (
          <div key={c} className="w-3 h-3 rounded-sm border border-gray-200"
            style={{ backgroundColor: c }} />
        ))}
        <span>More CO2</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
