import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Flame, 
  Leaf, 
  LogOut, 
  CheckCircle 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCarbon } from '../hooks/useCarbon';
import DashboardCard from '../components/DashboardCard';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';

/**
 * Profile component that manages user preferences, country selection, 
 * diet preferences, and shows sustainability achievements (badges) and streak statistics.
 */
export function Profile() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { activities, updateProfileSettings, loading: settingsLoading } = useCarbon(user ? user.uid : null);

  // Settings states
  const [country, setCountry] = useState('India');
  const [dietPreference, setDietPreference] = useState('None');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync settings state with loaded profile
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (profile) {
      timer = setTimeout(() => {
        setCountry(profile.country || 'India');
        setDietPreference(profile.dietPreference || 'None');
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [profile]);

  // Sign out click handler
  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await updateProfileSettings(country, dietPreference);
      // Profile will auto-update since useCarbon invalidates TanStack Query cache
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
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
      <DashboardCard className="p-6 flex flex-col sm:flex-row items-center gap-5">
        {user?.photoURL ? (
          <img 
            src={user.photoURL} 
            alt={profile?.displayName || 'User profile'} 
            className="w-20 h-20 rounded-full border-2 border-secondary dark:border-accent object-cover shadow-sm shrink-0" 
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-accent dark:bg-gray-700 text-primary dark:text-accent font-bold flex items-center justify-center text-2xl shadow-inner shrink-0">
            {profile?.displayName ? profile.displayName[0].toUpperCase() : 'E'}
          </div>
        )}

        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-xl md:text-2xl font-extrabold text-primary dark:text-white tracking-tight">
            {profile?.displayName || 'EcoTracer'}
          </h2>
          <p className="text-xs text-textSecondary dark:text-gray-400 font-semibold">
            {profile?.email || 'user@ecotrace.com'}
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
            <span>Joined EcoTrace</span>
            <span>&bull;</span>
            <span>
              {profile && profile.joinedAt
                ? new Date((profile.joinedAt as { seconds: number }).seconds * 1000).toLocaleDateString() 
                : new Date().toLocaleDateString()
              }
            </span>
          </div>
        </div>
      </DashboardCard>

      {/* Carbon Stats widget */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6" aria-label="Eco stats summaries">
        <StatCard
          title="CO₂ Saved this Month"
          value={`${carbonSaved.toFixed(1)} kg`}
          icon={Leaf}
          iconColorClass="text-secondary dark:text-accent"
          iconBgClass="bg-emerald-50 dark:bg-emerald-950/20"
        />

        <StatCard
          title="Best Logging Streak"
          value={`${profile?.longestStreak || 0} days`}
          icon={Flame}
          iconColorClass="text-warningColor"
          iconBgClass="bg-orange-50 dark:bg-orange-950/20"
        />
      </section>

      {/* Badges Earned Section */}
      <section className="space-y-4">
        <SectionHeader 
          title="Achievement Badges" 
          level={3}
          subtitle="Unlock milestones by saving carbon footprint and building eco streaks."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="list" aria-label="Earned achievement badges">
          {badges.map((b) => (
            <DashboardCard 
              key={b.id}
              className={`p-5 flex flex-col items-center text-center space-y-3 ${
                b.earned 
                  ? 'border-accent/40 bg-gradient-to-b from-white to-mintBg/10 dark:from-gray-800 dark:to-gray-800/80 dark:border-accent/40' 
                  : 'opacity-55'
              }`}
              role="listitem"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                b.earned 
                  ? 'bg-accent/20 dark:bg-accent/10 text-secondary dark:text-accent border border-accent/40 shadow-inner' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600'
              }`}>
                <Trophy size={20} className={b.earned ? 'fill-current' : ''} />
              </div>

              <div>
                <h4 className="text-xs font-bold text-textPrimary dark:text-white">{b.title}</h4>
                <p className="text-[10px] text-textSecondary dark:text-gray-400 mt-1 leading-normal">
                  {b.description}
                </p>
              </div>

              <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                b.earned ? 'bg-secondary/15 dark:bg-secondary/25 text-secondary dark:text-accent' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                {b.earned ? 'Unlocked' : 'Locked'}
              </div>
            </DashboardCard>
          ))}
        </div>
      </section>

      {/* Profile Settings section */}
      <DashboardCard className="p-6 space-y-6">
        <SectionHeader 
          title="Eco Settings" 
          level={3}
          subtitle="Configure default carbon calculation attributes for customized tips."
        />

        {saveSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-secondary/20 text-secondary dark:text-accent text-xs rounded-xl p-3 flex items-center gap-2" role="alert">
            <CheckCircle size={14} />
            <span className="font-semibold">Eco-Settings saved successfully!</span>
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-600 dark:text-red-400 text-xs rounded-xl p-3 flex items-center gap-2" role="alert">
            <span className="font-semibold">Error: {saveError}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="country-selector" className="text-xs font-bold uppercase tracking-wider text-textSecondary dark:text-gray-400 block">
                Country
              </label>
              <select
                id="country-selector"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 text-xs font-bold focus:border-secondary dark:focus:border-accent text-textPrimary dark:text-white transition-all outline-none"
              >
                <option value="India">India</option>
                <option value="USA">United States (USA)</option>
                <option value="Germany">Germany</option>
                <option value="UK">United Kingdom (UK)</option>
                <option value="Australia">Australia</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="diet-preference" className="text-xs font-bold uppercase tracking-wider text-textSecondary dark:text-gray-400 block">
                Diet Preference
              </label>
              <select
                id="diet-preference"
                value={dietPreference}
                onChange={(e) => setDietPreference(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 text-xs font-bold focus:border-secondary dark:focus:border-accent text-textPrimary dark:text-white transition-all outline-none"
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
              className="bg-secondary hover:bg-secondary/95 dark:bg-accent dark:hover:bg-accent/90 dark:text-gray-900 text-white py-2.5 px-6 rounded-full text-xs font-bold shadow-md cursor-pointer disabled:opacity-55 active:scale-95 transition-all text-center"
            >
              {settingsLoading ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-450 py-2.5 px-6 rounded-full text-xs font-bold shadow-sm cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </div>
        </form>
      </DashboardCard>
    </main>
  );
}

export default Profile;
