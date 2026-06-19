import React, { useState } from 'react';
import { 
  Car, 
  Utensils, 
  Zap, 
  ShoppingBag, 
  ChevronDown, 
  ChevronUp, 
  Sparkles 
} from 'lucide-react';
import { CarbonActivity } from '../types';

interface ActivityCardProps {
  activity: CarbonActivity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Pick matching icon and color scheme based on category
  let Icon = ShoppingBag;
  let colorClass = 'bg-[#F3E8FF] text-[#A855F7]'; // shopping purple
  
  if (activity.category === 'transport') {
    Icon = Car;
    colorClass = 'bg-[#E0F2FE] text-[#0284C7]'; // transport blue
  } else if (activity.category === 'food') {
    Icon = Utensils;
    colorClass = 'bg-[#FEF3C7] text-[#D97706]'; // food orange
  } else if (activity.category === 'energy') {
    Icon = Zap;
    colorClass = 'bg-[#FEF08A] text-[#CA8A04]'; // energy yellow
  }

  // Format activity details label
  const getReadableType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div 
      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-accent/35 transition-all duration-200 overflow-hidden"
      role="listitem"
    >
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setExpanded(!expanded);
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-label={`Activity in ${activity.category}: ${getReadableType(activity.activityType)}, ${activity.co2Kg.toFixed(1)} kilograms of CO2. Click to toggle tip.`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${colorClass}`} aria-hidden="true">
            <Icon size={20} />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-textPrimary capitalize">
              {getReadableType(activity.activityType)}
            </h4>
            <p className="text-xs text-textSecondary font-medium">
              {activity.quantity} {activity.unit} &middot; {activity.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-sm font-extrabold text-textPrimary">
              {activity.co2Kg.toFixed(1)}
            </span>
            <span className="text-[10px] font-medium text-textSecondary block">kg CO₂</span>
          </div>

          <div className="text-gray-400 hover:text-gray-600 transition-colors" aria-hidden="true">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-mintBg/45 border-t border-gray-50 flex items-start gap-2.5 text-xs text-textSecondary">
          <Sparkles size={14} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold text-secondary block mb-0.5">Gemini Eco-Tip:</span>
            <p className="italic">
              {activity.geminiTip || "Great job tracking! Small actions aggregate into significant change. Check the Insights tab for deep-dive analyses."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
export default ActivityCard;
