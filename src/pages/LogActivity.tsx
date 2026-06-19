import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, 
  Utensils, 
  Zap, 
  ShoppingBag, 
  Sparkles, 
  ArrowLeft,
  X,
  Plus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCarbon } from '../hooks/useCarbon';
import { useGemini } from '../hooks/useGemini';
import { useLiveData } from '../context/LiveDataContext';
import { 
  calculateTransportCO2, 
  calculateFoodCO2, 
  calculateEnergyCO2, 
  calculateShoppingCO2 
} from '../utils/carbonCalc';
import { ActivityCategory } from '../types';
import { trackEvent } from '../utils/analytics';

export function LogActivity() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { logActivity, loading: saveLoading } = useCarbon(user ? user.uid : null);
  const { getInstantTip } = useGemini();
  const liveData = useLiveData();

  // 1. Form States
  const [category, setCategory] = useState<ActivityCategory>('transport');
  const [activityType, setActivityType] = useState<string>('car_petrol');
  const [quantity, setQuantity] = useState<string>('');
  
  // 2. Gemini Tip Modal States
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [generatedTip, setGeneratedTip] = useState('');
  const [savedCO2, setSavedCO2] = useState(0);

  // Set default activity type when category changes
  useEffect(() => {
    if (category === 'transport') setActivityType('car_petrol');
    else if (category === 'food') setActivityType('meat_meal');
    else if (category === 'energy') setActivityType('electricity_kwh');
    else if (category === 'shopping') setActivityType('clothing');
    setQuantity('');
  }, [category]);

  // Activity Type details configuration
  const activityOptions = {
    transport: [
      { value: 'car_petrol', label: 'Car (Petrol)', unit: 'km' },
      { value: 'car_diesel', label: 'Car (Diesel)', unit: 'km' },
      { value: 'car_electric', label: 'Car (Electric)', unit: 'km' },
      { value: 'bus', label: 'Bus Ride', unit: 'km' },
      { value: 'train', label: 'Train Ride', unit: 'km' },
      { value: 'flight', label: 'Flight', unit: 'km' },
      { value: 'bike_walk', label: 'Bike / Walk', unit: 'km' },
    ],
    food: [
      { value: 'meat_meal', label: 'Meat Meal', unit: 'servings' },
      { value: 'vegetarian_meal', label: 'Vegetarian Meal', unit: 'servings' },
      { value: 'vegan_meal', label: 'Vegan Meal', unit: 'servings' },
      { value: 'dairy', label: 'Dairy Consumption', unit: 'servings' },
    ],
    energy: [
      { value: 'electricity_kwh', label: 'Electricity Consumption', unit: 'kWh' },
      { value: 'lpg_kg', label: 'LPG Cooking Fuel', unit: 'kg' },
      { value: 'ac_hours', label: 'Air Conditioner Usage', unit: 'hours' },
    ],
    shopping: [
      { value: 'clothing', label: 'Clothing Purchase', unit: 'items' },
      { value: 'electronics', label: 'Electronics Purchase', unit: 'items' },
      { value: 'plastic_item', label: 'Plastic item Purchase', unit: 'items' },
    ],
  };

  // Determine current unit label
  const unitLabel = useMemo(() => {
    const opts = activityOptions[category];
    const match = opts.find(o => o.value === activityType);
    return match ? match.unit : '';
  }, [category, activityType]);

  // Real-time CO2 Preview calculation
  const co2Preview = useMemo(() => {
    const numQty = parseFloat(quantity) || 0;
    if (numQty <= 0) return 0;

    switch (category) {
      case 'transport':
        return calculateTransportCO2(activityType, numQty);
      case 'food':
        return calculateFoodCO2(activityType, numQty);
      case 'energy':
        return calculateEnergyCO2(activityType, numQty, liveData.gridIntensity);
      case 'shopping':
        return calculateShoppingCO2(activityType, numQty);
      default:
        return 0;
    }
  }, [category, activityType, quantity, liveData.gridIntensity]);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = parseFloat(quantity);
    if (!numQty || numQty <= 0) return;

    try {
      // Fetch dynamic tip from Gemini
      const tip = await getInstantTip(category, activityType, numQty, unitLabel, co2Preview, profile);
      setGeneratedTip(tip);
      setSavedCO2(co2Preview);

      // Save activity details in Firestore
      await logActivity(
        category,
        activityType,
        numQty,
        unitLabel,
        co2Preview,
        tip
      );

      // Track logging event
      trackEvent.activityLogged(category, co2Preview);

      // Open Gemini tip popup
      setTipModalOpen(true);
      setQuantity('');
    } catch (error) {
      console.error('Error saving activity log:', error);
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-6" role="main">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          aria-label="Back to Dashboard"
          className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-150 rounded-full transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-xl md:text-2xl font-extrabold text-primary tracking-tight">
          Log Carbon Activity
        </h2>
      </div>

      <div className="bg-white rounded-3xl shadow-md p-6 border border-gray-100 relative">
        {saveLoading && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-sm rounded-3xl z-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 bg-secondary/15 rounded-2xl flex items-center justify-center animate-bounce text-secondary">
              <Sparkles size={24} className="animate-spin text-accent" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider animate-pulse">
              Generating Gemini tip & logging...
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-textSecondary block mb-3">
              Select Category
            </label>
            <div className="grid grid-cols-4 gap-2.5" role="tablist">
              {[
                { id: 'transport', label: 'Transit', icon: Car, color: 'text-sky-500 bg-sky-50' },
                { id: 'food', label: 'Diet', icon: Utensils, color: 'text-amber-500 bg-amber-50' },
                { id: 'energy', label: 'Energy', icon: Zap, color: 'text-yellow-500 bg-yellow-50' },
                { id: 'shopping', label: 'Retail', icon: ShoppingBag, color: 'text-purple-500 bg-purple-50' },
              ].map((tab) => {
                const isSelected = category === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setCategory(tab.id as ActivityCategory)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'border-secondary bg-mintBg/60 text-secondary scale-105 font-bold shadow-sm' 
                        : 'border-gray-150 hover:bg-gray-50 text-gray-500 font-medium'
                    }`}
                  >
                    <tab.icon size={20} className="mb-1" />
                    <span className="text-[10px] uppercase tracking-wide">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Dropdown */}
          <div className="space-y-2">
            <label htmlFor="activity-type" className="text-xs font-bold uppercase tracking-wider text-textSecondary block">
              Activity Type
            </label>
            <select
              id="activity-type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 p-3 bg-white text-sm focus:border-secondary transition-all outline-none font-semibold"
            >
              {activityOptions[category].map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <label htmlFor="quantity-input" className="text-xs font-bold uppercase tracking-wider text-textSecondary block">
              Quantity ({unitLabel})
            </label>
            <div className="relative">
              <input
                id="quantity-input"
                type="number"
                step="any"
                min="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter details..."
                className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm focus:border-secondary transition-all outline-none font-semibold pr-16"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 select-none uppercase tracking-wide">
                {unitLabel}
              </div>
            </div>
          </div>

          {/* CO2 Real-time Preview widget */}
          <div className="bg-mintBg/40 border border-secondary/15 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-secondary uppercase tracking-wide block">Emissions Estimate</span>
              <span className="text-[10px] text-textSecondary leading-none">Calculated instantly from your quantity</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-primary block leading-none">
                {co2Preview.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold text-textSecondary">kg CO₂</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!quantity || parseFloat(quantity) <= 0 || saveLoading}
            className="w-full bg-secondary hover:bg-secondary/95 text-white active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full py-3.5 font-bold flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={16} />
            <span>Save Log</span>
          </button>
        </form>
      </div>

      {/* Gemini Tip Modal Popup */}
      {tipModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tip-modal-title"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative border border-gray-100 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setTipModalOpen(false);
                navigate('/dashboard');
              }}
              aria-label="Close Gemini Tip Modal"
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 bg-mintBg text-secondary rounded-2xl flex items-center justify-center shadow-inner" aria-hidden="true">
              <Sparkles size={24} className="fill-current text-accent" />
            </div>

            <div>
              <h3 id="tip-modal-title" className="text-lg font-bold text-primary">
                Activity Logged successfully!
              </h3>
              <p className="text-[11px] text-textSecondary mt-1 font-semibold">
                Emitted: <span className="text-dangerColor font-bold">{savedCO2.toFixed(1)} kg CO₂</span>
              </p>
            </div>

            <div className="bg-mintBg/35 border border-secondary/15 rounded-2xl p-4 text-xs text-textSecondary italic leading-relaxed text-left w-full">
              <span className="font-bold text-secondary uppercase tracking-wider text-[10px] block not-italic mb-1">
                Gemini AI Recommendation:
              </span>
              "{generatedTip || 'Fantastic tracking! Keep checking daily to lower your emissions score.'}"
            </div>

            <button
              onClick={() => {
                setTipModalOpen(false);
                navigate('/dashboard');
              }}
              className="w-full bg-primary hover:bg-primary/95 text-white py-2.5 rounded-full text-xs font-bold shadow-md cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
export default LogActivity;
