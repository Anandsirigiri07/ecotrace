import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Flame, 
  MapPin, 
  Utensils, 
  Leaf, 
  LogOut, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCarbon } from '../hooks/useCarbon';

export function Profile() {
  const navigate = useNavigate();
  const { user, profile, logout, refreshProfile } = useAuth();
  const { activities, updateProfileSettings, loading: settingsLoading } = useCarbon(user ? user.uid : null);

  // Settings states
  const [country, setCountry] = useState('India');
  const [dietPreference, setDietPreference] = useState('None');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync settings state with loaded profile
  useEffect(() => {
    if (profile) {
      setCountry(profile.country || 'India');
      setDietPreference(profile.dietPreference || 'None');
    }
  }, [profile]);

  // Sign out click handler
  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileSettings(country, dietPreference);
      await refreshProfile(); // reload auth context
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  // 1. Calculate Carbon Saved this Month (relative to higher carbon equivalents)
  const carbonSaved = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthActivities = activities.filter(act => {
      const actDate = new Date(act.date);
      return actDate.getFullYear() === currentYear && actDate.getMonth() === currentMonth;
    });

    let totalSaved = 0;
    monthActivities.forEach(act => {
      const qty = act.quantity;
      if (act.category === 'transport') {
        if (act.activityType === 'car_electric') totalSaved += (0.21 - 0.05) * qty; // saved vs petrol
        else if (act.activityType === 'bus') totalSaved += (0.21 - 0.089) * qty;
        else if (act.activityType === 'train') totalSaved += (0.21 - 0.041) * qty;
        else if (act.activityType === 'bike_walk') totalSaved += 0.21 * qty;
      } else if (act.category === 'food') {
        if (act.activityType === 'vegetarian_meal') totalSaved += (6.61 - 1.69) * qty; // saved vs meat meal
        else if (act.activityType === 'vegan_meal') totalSaved += (6.61 - 1.05) * qty;
        else if (act.activityType === 'dairy') totalSaved += (6.61 - 3.2) * qty;
      }
    });

    return totalSaved;
  }, [activities]);

  // 2. Determine badge statuses
  const badges = useMemo(() => {
    // A. Pioneer Badge: Logged at least 1 activity
    const hasPioneer = activities.length >= 1;

    // B. Streak Champion: Longest streak is at least 7 days
    const longestStreak = profile?.longestStreak || 0;
    const currentStreak = profile?.currentStreak || 0;
    const hasStreakBadge = longestStreak >= 7 || currentStreak >= 7;

    // C. Low Carbon Specialist: Logged at least 1 day with total CO2 emissions < 5kg (and > 0)
    // Group activities by date
    const dateMap: { [date: string]: number } = {};
    activities.forEach(act => {
      dateMap[act.date] = (dateMap[act.date] || 0) + act.co2Kg;
    });
    const hasLowCarbonBadge = Object.values(dateMap).some(total => total > 0 && total < 5.0);

    return [
      {
        id: 'pioneer',
        title: 'Green Pioneer',
        description: 'Earned by logging your very first carbon footprint activity on EcoTrace.',
        earned: hasPioneer,
      },
      {
        id: 'streak',
        title: 'Streak Champion',
        description: 'Earned by maintaining a carbon logging streak of 7 days or more.',
        earned: hasStreakBadge,
      },
      {
        id: 'specialist',
        title: 'Carbon Specialist',
        description: 'Earned by keeping your total daily emissions under 5.0kg of CO₂.',
        earned: hasLowCarbonBadge,
      }
    ];
  }, [activities, profile]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-8" role="main">
      {/* Profile Header card */}
      <section className="bg-white rounded-3xl shadow-md p-6 border border-gray-100 flex flex-col sm:flex-row items-center gap-5">
        {user?.photoURL ? (
          <img 
            src={user.photoURL} 
            alt={profile?.displayName || 'User profile'} 
            className="w-20 h-20 rounded-full border-2 border-secondary object-cover shadow-sm shrink-0" 
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-accent text-primary font-bold flex items-center justify-center text-2xl shadow-inner shrink-0">
            {profile?.displayName ? profile.displayName[0].toUpperCase() : 'E'}
          </div>
        )}

        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-xl md:text-2xl font-extrabold text-primary tracking-tight">
            {profile?.displayName || 'EcoTracer'}
          </h2>
          <p className="text-xs text-textSecondary font-semibold">
            {profile?.email || 'user@ecotrace.com'}
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <span>Joined EcoTrace</span>
            <span>&bull;</span>
            <span>
              {profile?.joinedAt?.seconds 
                ? new Date(profile.joinedAt.seconds * 1000).toLocaleDateString() 
                : new Date().toLocaleDateString()
              }
            </span>
          </div>
        </div>
      </section>

      {/* Carbon Stats widget */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-secondary rounded-xl flex items-center justify-center shrink-0">
            <Leaf size={24} className="fill-current" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary block">
              CO₂ Saved this Month
            </span>
            <span className="text-2xl font-extrabold text-primary">
              {carbonSaved.toFixed(1)} <span className="text-xs font-semibold text-textSecondary">kg</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-warningColor rounded-xl flex items-center justify-center shrink-0">
            <Flame size={24} className="fill-current" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary block">
              Best Logging Streak
            </span>
            <span className="text-2xl font-extrabold text-primary">
              {profile?.longestStreak || 0} <span className="text-xs font-semibold text-textSecondary">days</span>
            </span>
          </div>
        </div>
      </section>

      {/* Badges Earned Section */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-textSecondary">
          Achievement Badges
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="list" aria-label="Earned achievement badges">
          {badges.map((b) => (
            <div 
              key={b.id}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center space-y-3 transition-all duration-200 ${
                b.earned 
                  ? 'border-accent/40 bg-gradient-to-b from-white to-mintBg/10' 
                  : 'opacity-55'
              }`}
              role="listitem"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                b.earned 
                  ? 'bg-accent/20 text-secondary border border-accent/40 shadow-inner' 
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}>
                <Trophy size={20} className={b.earned ? 'fill-current' : ''} />
              </div>

              <div>
                <h4 className="text-xs font-bold text-textPrimary">{b.title}</h4>
                <p className="text-[10px] text-textSecondary mt-1 leading-normal">
                  {b.description}
                </p>
              </div>

              <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                b.earned ? 'bg-secondary/15 text-secondary' : 'bg-gray-100 text-gray-400'
              }`}>
                {b.earned ? 'Unlocked' : 'Locked'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Profile Settings section */}
      <section className="bg-white rounded-3xl shadow-md p-6 border border-gray-100 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-textSecondary">
          Eco Settings
        </h3>

        {saveSuccess && (
          <div className="bg-emerald-50 border border-secondary/20 text-secondary text-xs rounded-xl p-3 flex items-center gap-2" role="alert">
            <CheckCircle size={14} />
            <span className="font-semibold">Eco-Settings saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="country-selector" className="text-xs font-bold uppercase tracking-wider text-textSecondary block">
                Country
              </label>
              <select
                id="country-selector"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 p-3 bg-white text-xs font-bold focus:border-secondary transition-all outline-none"
              >
                <option value="India">India</option>
                <option value="USA">United States (USA)</option>
                <option value="Germany">Germany</option>
                <option value="UK">United Kingdom (UK)</option>
                <option value="Australia">Australia</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="diet-preference" className="text-xs font-bold uppercase tracking-wider text-textSecondary block">
                Diet Preference
              </label>
              <select
                id="diet-preference"
                value={dietPreference}
                onChange={(e) => setDietPreference(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 p-3 bg-white text-xs font-bold focus:border-secondary transition-all outline-none"
              >
                <option value="None">No Preference</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Pescatarian">Pescatarian</option>
                <option value="Flexitarian">Flexitarian (Low Meat)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={settingsLoading}
              className="bg-secondary hover:bg-secondary/95 text-white py-2.5 px-6 rounded-full text-xs font-bold shadow-md cursor-pointer disabled:opacity-55 active:scale-95 transition-all text-center"
            >
              {settingsLoading ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="bg-white hover:bg-red-50 border border-red-200 text-red-600 py-2.5 px-6 rounded-full text-xs font-bold shadow-sm cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
export default Profile;
