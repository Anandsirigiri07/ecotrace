import React from 'react';
import DashboardCard from './DashboardCard';
import { Leaf, Car, Zap } from 'lucide-react';

interface ImpactCardProps {
  co2SavedKg: number;
  className?: string;
}

/**
 * ImpactCard translates carbon offset values (kg CO2) into relatable comparisons:
 * - Equivalent trees planted (1 tree = 22 kg CO2/year)
 * - Equivalent petrol car km avoided (1 km = 0.21 kg CO2)
 * - Equivalent grid electricity saved (1 kWh = 0.82 kg CO2)
 */
export const ImpactCard: React.FC<ImpactCardProps> = ({ co2SavedKg, className = '' }) => {
  const trees = Math.round(co2SavedKg / 22);
  const carKm = Math.round(co2SavedKg / 0.21);
  const electricityKwh = Math.round(co2SavedKg / 0.82);

  const items = [
    {
      label: 'Trees Planted',
      value: `${trees} trees`,
      desc: 'Annual offset equivalent',
      icon: Leaf,
      color: 'text-green-600 bg-green-50 dark:bg-green-950/20'
    },
    {
      label: 'Car Travel Saved',
      value: `${carKm} km`,
      desc: 'Petrol vehicle avoided',
      icon: Car,
      color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/20'
    },
    {
      label: 'Electricity Saved',
      value: `${electricityKwh} kWh`,
      desc: 'Grid power consumption',
      icon: Zap,
      color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20'
    }
  ];

  return (
    <DashboardCard className={`p-6 space-y-4 ${className}`} ariaLabel="Environmental Impact Equivalents">
      <h3 className="font-extrabold text-primary dark:text-white text-xs uppercase tracking-wider">
        Your Environmental Impact 🌱
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center text-center p-3 rounded-2xl bg-gray-50/50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50">
            <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center mb-2`} aria-hidden="true">
              <item.icon size={18} />
            </div>
            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wide">
              {item.label}
            </span>
            <span className="text-xs md:text-sm font-extrabold text-primary dark:text-white mt-1">
              {item.value}
            </span>
            <span className="text-[8px] font-medium text-textSecondary dark:text-gray-400 mt-0.5 leading-tight">
              {item.desc}
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
};

export default ImpactCard;
