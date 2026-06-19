import React, { useMemo } from 'react';
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
import DashboardCard from './DashboardCard';
import SectionHeader from './SectionHeader';
import { useTheme } from '../context/ThemeContext';

interface EmissionChartProps {
  activities: CarbonActivity[];
  className?: string;
}

/**
 * EmissionChart displays a 7-day carbon emission trend.
 * Combines Recharts for visual feedback and an off-screen data table for accessibility.
 */
export const EmissionChart: React.FC<EmissionChartProps> = ({ activities, className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = useMemo(() => {
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
    <DashboardCard className={`p-6 ${className}`}>
      <SectionHeader 
        title="7-Day Emissions Trend" 
        level={3} 
        className="mb-4"
      />

      {/* Visual Chart Container */}
      <div 
        className="w-full h-56" 
        role="img" 
        aria-label="Line graph showing carbon emissions in kilograms over the last seven days."
        aria-describedby="chart-data-table"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#F0FFF4'} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: isDark ? '#9CA3AF' : '#4A5568', fontSize: 11 }}
              axisLine={{ stroke: isDark ? '#4B5563' : '#E2E8F0' }}
              tickLine={{ stroke: isDark ? '#4B5563' : '#E2E8F0' }}
            />
            <YAxis 
              tick={{ fill: isDark ? '#9CA3AF' : '#4A5568', fontSize: 11 }}
              axisLine={{ stroke: isDark ? '#4B5563' : '#E2E8F0' }}
              tickLine={{ stroke: isDark ? '#4B5563' : '#E2E8F0' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                border: isDark ? '1px solid #374151' : '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                color: isDark ? '#F3F4F6' : '#1A1A2E'
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

      {/* Screen Reader Only Table Representation */}
      <div className="sr-only">
        <table id="chart-data-table">
          <caption>Carbon emissions in kilograms over the last 7 days</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Date</th>
              <th scope="col">Emissions (kg CO₂)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((data, idx) => (
              <tr key={idx}>
                <td>{data.name}</td>
                <td>{data.date}</td>
                <td>{data['CO₂ (kg)']} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};

export default EmissionChart;
