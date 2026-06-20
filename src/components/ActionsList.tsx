import { Leaf, Info } from 'lucide-react';

interface ActionItem {
  id: string;
  category: 'transport' | 'food' | 'energy' | 'shopping';
  title: string;
  description: string;
  co2SavedKg: number;
}

export function ActionsList() {
  const actions: ActionItem[] = [
    {
      id: 'act1',
      category: 'transport',
      title: 'Commute via Metro or Bus',
      description: 'Ditch the personal petrol car for local transit to dramatically curb commuter greenhouse gases.',
      co2SavedKg: 5.2,
    },
    {
      id: 'act2',
      category: 'food',
      title: 'Choose a Plant-Based Dinner',
      description: 'Substituting a beef/mutton dish with beans, veggies, or lentils saves up to 5.5kg carbon per meal.',
      co2SavedKg: 5.5,
    },
    {
      id: 'act3',
      category: 'energy',
      title: 'Increase AC thermostat to 26°C',
      description: 'Raising cooling points reduces compressor cycles, dropping energy draws and grid emissions.',
      co2SavedKg: 2.1,
    },
    {
      id: 'act4',
      category: 'shopping',
      title: 'Carry a reusable cotton tote bag',
      description: 'Avoid purchasing single-use plastic bags. Every reusable bag saves plastic production and shipping carbon.',
      co2SavedKg: 0.8,
    },
    {
      id: 'act5',
      category: 'energy',
      title: 'Wash laundry on cold cycle',
      description: 'Up to 90% of a washing machine energy goes into heating water. Choose cold cycles to save grid loads.',
      co2SavedKg: 1.5,
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 w-full">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-textSecondary">
          Recommended Eco-Actions
        </h3>
        <div className="group relative" aria-label="More information on calculations">
          <Info size={14} className="text-gray-400 cursor-pointer" />
          <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity w-44 pointer-events-none text-center shadow-lg leading-normal z-25">
            Carbon estimates are calculated relative to standard Indian grids and averages.
          </span>
        </div>
      </div>

      <div className="space-y-4" role="list" aria-label="Recommended environmental actions">
        {actions.map((act) => {
          let categoryColor = 'border-l-sky-500';
          if (act.category === 'food') categoryColor = 'border-l-amber-500';
          if (act.category === 'energy') categoryColor = 'border-l-yellow-500';
          if (act.category === 'shopping') categoryColor = 'border-l-purple-500';

          return (
            <div 
              key={act.id}
              className={`p-4 border border-gray-100 border-l-4 ${categoryColor} bg-mintBg/10 rounded-xl hover:bg-mintBg/25 transition-all duration-150 flex items-start justify-between gap-3`}
              role="listitem"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-textPrimary leading-tight">
                  {act.title}
                </h4>
                <p className="text-[11px] text-textSecondary leading-normal">
                  {act.description}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center bg-white border border-gray-150 rounded-lg px-2 py-1 shrink-0 text-center min-w-[64px] shadow-sm">
                <Leaf size={12} className="text-secondary mb-0.5" />
                <span className="text-xs font-extrabold text-secondary">
                  -{act.co2SavedKg}
                </span>
                <span className="text-[8px] font-semibold text-textSecondary uppercase">kg CO₂</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default ActionsList;
