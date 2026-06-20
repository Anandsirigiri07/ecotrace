import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { CarbonActivity } from '../types';

interface WeeklyChartProps {
  activities: CarbonActivity[];
}

export function WeeklyChart({ activities }: WeeklyChartProps) {
  const chartData = useMemo(() => {
    // 1. Generate last 7 days arrays (including today)
    const list = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      list.push({
        dateStr: dateString,
        label: weekdays[d.getDay()],
        rawDate: d,
      });
    }

    // 2. Aggregate logs into daily totals
    return list.map((day) => {
      const dayLogs = activities.filter(act => act.date === day.dateStr);
      const totalCO2 = dayLogs.reduce((sum, act) => sum + act.co2Kg, 0);

      return {
        name: day.label,
        'CO₂ (kg)': parseFloat(totalCO2.toFixed(1)),
        date: day.dateStr,
      };
    });
  }, [activities]);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 w-full">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-textSecondary mb-4">
        7-Day Emissions Trend
      </h3>

      <div className="w-full h-56" role="img" aria-label="Line graph showing carbon emissions in kilograms over the last seven days.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F0FFF4" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#4A5568', fontSize: 11 }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis 
              tick={{ fill: '#4A5568', fontSize: 11 }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={{ stroke: '#E2E8F0' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                color: '#1A1A2E'
              }}
              labelStyle={{ fontWeight: 'bold', color: '#1B4332' }}
            />
            <Line
              type="monotone"
              dataKey="CO₂ (kg)"
              stroke="#40916C"
              strokeWidth={3}
              activeDot={{ r: 6, stroke: '#1B4332', strokeWidth: 1 }}
              dot={{ r: 4, stroke: '#40916C', strokeWidth: 2, fill: '#FFFFFF' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default WeeklyChart;
