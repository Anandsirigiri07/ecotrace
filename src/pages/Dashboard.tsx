import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Leaf, TrendingDown, Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCarbon } from '../hooks/useCarbon';
import CarbonScoreRing from '../components/CarbonScoreRing';
import EmissionChart from '../components/EmissionChart';
import ActivityCard from '../components/ActivityCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useLiveData } from '../context/LiveDataContext';
import { CardSkeleton } from '../components/LiveDataSkeleton';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { calculateEcoScore } from '../utils/carbonCalc';
import { trackEvent } from '../utils/analytics';
import { useAirQuality } from '../hooks/useAirQuality';
import { GridStatusCard } from '../components/GridStatusCard';
import { CarbonSavedCounter } from '../components/CarbonSavedCounter';
import { useDailyChallenge } from '../hooks/useDailyChallenge';
import { collection, doc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import DashboardCard from '../components/DashboardCard';
import SectionHeader from '../components/SectionHeader';
import { generateRecommendations } from '../utils/sustainabilityRecommendations';

// Weather Card Component
interface WeatherCardProps {
  weather: {
    temp: number;
    condition: string;
    tip: string;
    isGoodForCycling: boolean;
  } | null;
}

function WeatherCard({ weather }: WeatherCardProps) {
  if (!weather) return null;
  return (
    <DashboardCard className="p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-sky-50 dark:bg-sky-950/20 text-sky-500 dark:text-sky-400 rounded-xl flex items-center justify-center shrink-0 font-bold">
          <span className="text-xl">🌤️</span>
        </div>
        <div>
          <h4 className="text-xs font-bold text-textPrimary dark:text-white">
            Weather Green Tip ({weather.temp}°C, {weather.condition})
          </h4>
          <p className="text-[10px] text-textSecondary dark:text-gray-400 font-semibold leading-relaxed mt-0.5">
            {weather.tip}
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}

// Air Quality Card Component
function AirQualityCard() {
  const { data, loading, error, refetch } = useAirQuality();

  if (loading) return <CardSkeleton height="h-24" />;
  
  if (error || !data) {
    return (
      <DashboardCard className="p-4 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10 flex flex-col justify-between h-36">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
              AIR QUALITY &bull; BENGALURU
            </span>
          </div>
          <p className="text-xs text-textSecondary dark:text-gray-400 leading-normal">
            Failed to load live air quality reports.
          </p>
        </div>
        <button
          onClick={() => refetch && refetch()}
          className="mt-2 text-[10px] bg-gray-150 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-705 text-gray-700 dark:text-gray-300 py-1 px-3 rounded-full font-bold self-start cursor-pointer active:scale-95 transition-all border-none"
        >
          🔄 Retry AQI
        </button>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard 
      className="p-4"
      role="status" 
      aria-live="polite"
      aria-label={`Air quality: ${data.level}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
          AIR QUALITY &bull; BENGALURU
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          Live
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-3xl">{data.icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: data.color }}>
              AQI {data.aqi}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: data.color }}>
              {data.level}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PM2.5: {data.pm25} &mu;g/m³ &middot; PM10: {data.pm10} &mu;g/m³
          </p>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 border-t border-gray-150 dark:border-gray-700 pt-2">
        {data.advice}
      </p>
    </DashboardCard>
  );
}

// Daily Challenge Card Component
function DailyChallengeCard() {
  const { user } = useAuth();
  const { challenge, loading, error, refetch } = useDailyChallenge(user?.uid || '');
  const [accepted, setAccepted] = useState(false);

  if (loading) return <CardSkeleton height="h-32" />;
  
  if (error || !challenge) {
    return (
      <DashboardCard className="p-4 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10 flex flex-col justify-between h-40">
        <div>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide block mb-2">
            🎯 TODAY'S ECO CHALLENGE
          </span>
          <p className="text-xs text-textSecondary dark:text-gray-400 font-medium">
            Could not fetch today's challenge.
          </p>
        </div>
        <button
          onClick={() => refetch && refetch()}
          className="bg-green-750 hover:bg-green-800 text-white dark:bg-accent dark:text-gray-900 py-1.5 px-4 rounded-full font-semibold text-xs mt-2 self-start cursor-pointer active:scale-95 transition-all border-none"
        >
          🔄 Retry Challenge
        </button>
      </DashboardCard>
    );
  }

  const categoryEmoji: Record<string, string> = {
    transport: '🚌',
    food: '🥗',
    energy: '⚡',
    shopping: '🛍️'
  };

  const difficultyColor: Record<string, string> = {
    easy: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
    hard: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
  };

  return (
    <DashboardCard className="p-4 border-green-100 dark:border-green-900/40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">
          🎯 TODAY'S ECO CHALLENGE
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${difficultyColor[challenge.difficulty] || difficultyColor.easy}`}>
          {challenge.difficulty}
        </span>
      </div>

      <div className="flex gap-3">
        <span className="text-3xl">{categoryEmoji[challenge.category] ?? '🌱'}</span>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 dark:text-white">
            {challenge.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {challenge.description}
          </p>
          <p className="text-sm font-semibold text-green-600 dark:text-accent mt-2">
            💚 Saves ~{challenge.savingKg}kg CO₂ today
          </p>
        </div>
      </div>

      <button
        onClick={() => setAccepted(true)}
        disabled={accepted}
        className={`w-full mt-3 py-2 rounded-full font-semibold text-sm transition-all
          ${accepted
            ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 cursor-default'
            : 'bg-green-700 dark:bg-accent dark:text-gray-900 text-white hover:bg-green-800 dark:hover:bg-accent/90 active:scale-[0.98] cursor-pointer'
          }`}
        aria-label={accepted ? 'Challenge accepted' : "Accept today's challenge"}
      >
        {accepted ? '✅ Challenge Accepted!' : 'Accept Challenge'}
      </button>
    </DashboardCard>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  const { activities, loading: carbonLoading, error: carbonError } = useCarbon(user ? user.uid : null);
  const liveData = useLiveData();
  const [seeding, setSeeding] = useState(false);
  const trendRecs = useMemo(() => generateRecommendations(activities), [activities]);

  const hasData = activities.length > 0;

  const seedDemoData = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const userActivitiesRef = collection(db, 'users', user.uid, 'activities');
      const batchPromises = [];
      
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Food daily activity
        const foodType = i % 3 === 0 ? 'meat_meal' : i % 3 === 1 ? 'vegetarian_meal' : 'vegan_meal';
        const foodCO2 = foodType === 'meat_meal' ? 6.61 : foodType === 'vegetarian_meal' ? 1.69 : 1.05;
        batchPromises.push(addDoc(userActivitiesRef, {
          category: 'food',
          activityType: foodType,
          quantity: 2,
          unit: 'servings',
          co2Kg: foodCO2 * 2,
          date: dateStr,
          createdAt: new Date(d.getTime() - 1000 * 60 * 60),
          userId: user.uid,
          geminiTip: 'Eating plant-based meals significantly reduces your footprint. Keep it up!'
        }));

        // Transport on 5 out of 7 days
        if (i % 7 !== 0 && i % 7 !== 6) {
          const transType = i % 2 === 0 ? 'car_petrol' : 'bus';
          const distance = i % 2 === 0 ? 15 : 10;
          const transCO2 = transType === 'car_petrol' ? distance * 0.21 : distance * 0.089;
          batchPromises.push(addDoc(userActivitiesRef, {
            category: 'transport',
            activityType: transType,
            quantity: distance,
            unit: 'km',
            co2Kg: transCO2,
            date: dateStr,
            createdAt: new Date(d.getTime() - 1000 * 60 * 30),
            userId: user.uid,
            geminiTip: transType === 'car_petrol' ? 'Consider carpooling or using public transit next time!' : 'Great job taking the bus! You saved emissions.'
          }));
        }

        // Energy once a week
        if (i % 7 === 1) {
          batchPromises.push(addDoc(userActivitiesRef, {
            category: 'energy',
            activityType: 'electricity_kwh',
            quantity: 30,
            unit: 'kWh',
            co2Kg: 30 * 0.82,
            date: dateStr,
            createdAt: d,
            userId: user.uid,
            geminiTip: 'Optimize your cooling systems and switch off idle electronics to reduce electricity use.'
          }));
        }
      }

      await Promise.all(batchPromises);

      // Update user streak in user profile info
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        currentStreak: 15,
        longestStreak: 15,
        lastLogDate: new Date().toISOString().split('T')[0]
      }, { merge: true });

      window.location.reload();
    } catch {
      alert('Failed to seed demo data. Please try again.');
    } finally {
      setSeeding(false);
    }
  };

  const loading = authLoading || carbonLoading;
  const error = authError || carbonError;

  // 1. Calculate today's date string
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();

  // 2. Compute today's emissions sum
  const todayEmissions = useMemo(() => {
    return activities
      .filter(act => act.date === todayStr)
      .reduce((sum, act) => sum + act.co2Kg, 0);
  }, [activities, todayStr]);

  // 3. Compute past 7 days emissions sum
  const weeklyEmissions = useMemo(() => {
    const getPast7DateStrings = () => {
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
      return dates;
    };
    const last7Days = getPast7DateStrings();
    return activities
      .filter(act => last7Days.includes(act.date))
      .reduce((sum, act) => sum + act.co2Kg, 0);
  }, [activities]);

  // 3 most recent activities
  const recentActivities = useMemo(() => {
    return activities.slice(0, 3);
  }, [activities]);

  // Monthly emissions sum (activities array is already filtered for last 30 days)
  const monthlyEmissions = useMemo(() => {
    return activities.reduce((sum, act) => sum + act.co2Kg, 0);
  }, [activities]);

  // Calculate EcoScore details
  const ecoScoreDetails = useMemo(() => {
    return calculateEcoScore(monthlyEmissions, liveData.nationalDailyAvgKg);
  }, [monthlyEmissions, liveData.nationalDailyAvgKg]);

  // Trigger Analytics events
  useEffect(() => {
    if (!loading && !error && user) {
      trackEvent.ecoScoreCalculated(ecoScoreDetails.score, monthlyEmissions * 12);
      
      // Calculate weeks with data in the past year
      const uniqueWeeks = new Set(
        activities.map(a => {
          const date = new Date(a.date);
          const oneJan = new Date(date.getFullYear(), 0, 1);
          const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
          return `${date.getFullYear()}-${Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7)}`;
        })
      );
      trackEvent.heatmapViewed(uniqueWeeks.size);
    }
  }, [loading, error, user, ecoScoreDetails, monthlyEmissions, activities]);

  // Streak counter details
  const currentStreak = profile?.currentStreak || 0;
  const indiaAverageWeekly = Math.round(liveData.nationalDailyAvgKg * 7 * 100) / 100;

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-48 bg-gray-250 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-10 w-24 bg-gray-250 dark:bg-gray-700 rounded-full animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LoadingSkeleton variant="ring" />
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="card" count={2} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-red-100 dark:border-red-950/30 text-center">
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Workspace Error</h2>
        <p className="text-sm text-textSecondary dark:text-gray-400 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-primary dark:bg-accent dark:text-gray-900 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary/95 transition-all text-xs cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <main className="space-y-6 max-w-5xl mx-auto px-2 md:px-4 py-6" role="main">
      {/* Top Greeting header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <SectionHeader 
            title={`Welcome back, ${profile?.displayName || 'EcoTracer'}!`}
            level={1}
            subtitle="Let's offset carbon and preserve resources today."
          />
        </div>

        {/* Quick Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/log')}
            aria-label="Log new carbon activity"
            className="bg-primary hover:bg-primary/95 dark:bg-accent dark:hover:bg-accent/90 dark:text-gray-900 text-white active:scale-95 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer border-none"
          >
            <Plus size={16} />
            <span>Log Activity</span>
          </button>
          <button
            onClick={() => navigate('/insights')}
            aria-label="Ask EcoTrace AI carbon advisor"
            className="bg-white hover:bg-gray-50 dark:bg-gray-850 dark:hover:bg-gray-800 border border-gray-150 dark:border-gray-700 text-textPrimary dark:text-white active:scale-95 px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>Ask AI</span>
            <ArrowRight size={14} className="text-secondary dark:text-accent" />
          </button>
        </div>
      </section>

      {/* Demo Data Seeder Alert banner */}
      {!hasData && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-400 text-sm">
              👋 First time here?
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
              Load sample data to see all features in action
            </p>
          </div>
          <button
            onClick={seedDemoData}
            disabled={seeding}
            className="bg-blue-600 text-white dark:bg-blue-700 px-4 py-2 rounded-full text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 border-none"
            aria-label="Load demo data to see dashboard features"
          >
            {seeding ? 'Loading...' : 'Load Demo Data'}
          </button>
        </div>
      )}

      {/* Main Grid statistics layout */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Score + Savings + Challenge */}
        <div className="flex flex-col gap-6">
          <CarbonScoreRing weeklyScore={weeklyEmissions} hasData={hasData} />

          {/* EcoScore Profile Card */}
          <DashboardCard className="p-6 flex flex-col justify-center">
            {!hasData ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🌱</div>
                <p className="font-bold text-green-800 dark:text-green-400 text-lg">
                  Your EcoScore
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-4">
                  Log your first activity to calculate your personal carbon score
                </p>
                <button
                  onClick={() => navigate('/log')}
                  className="bg-green-700 dark:bg-accent dark:text-gray-900 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-green-800 transition-all cursor-pointer border-none"
                  aria-label="Log your first activity"
                >
                  + Log First Activity
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textPrimary dark:text-white uppercase tracking-wider">
                    EcoScore Profile
                  </span>
                  <span 
                    className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider"
                    style={{ backgroundColor: `${ecoScoreDetails.ringColor}20`, color: ecoScoreDetails.color }}
                  >
                    {ecoScoreDetails.label}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center font-extrabold text-2xl shadow-inner shrink-0 bg-opacity-10"
                    style={{ 
                      backgroundColor: `${ecoScoreDetails.ringColor}10`, 
                      color: ecoScoreDetails.color, 
                      border: `2px solid ${ecoScoreDetails.ringColor}` 
                    }}
                  >
                    {ecoScoreDetails.score}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-textPrimary dark:text-white leading-snug">
                      {ecoScoreDetails.message}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-textSecondary dark:text-gray-400 font-semibold">
                        🇮🇳 {ecoScoreDetails.vsIndia}
                      </span>
                      <span className="text-[10px] text-textSecondary dark:text-gray-400 font-semibold">
                        🌍 {ecoScoreDetails.vsGlobal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DashboardCard>

          {/* CO₂ Saved Counter */}
          <CarbonSavedCounter />

          {/* Daily Eco Challenge */}
          <DailyChallengeCard />

          {/* Streak details card */}
          <DashboardCard className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-orange-50 dark:bg-orange-950/20 text-warningColor rounded-xl flex items-center justify-center font-bold">
                <span className="text-xl animate-bounce" role="img" aria-label="flame">🔥</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-textPrimary dark:text-white">Logging Streak</h4>
                <p className="text-[10px] text-textSecondary dark:text-gray-400 font-medium">Log daily to keep it up!</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-textPrimary dark:text-white">{currentStreak}</span>
              <span className="text-xs text-textSecondary dark:text-gray-400 font-semibold block">days</span>
            </div>
          </DashboardCard>
        </div>

        {/* RIGHT COLUMN: Chart + Grid + AQI + Comparisons */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <EmissionChart activities={activities} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Enhanced Grid Status Card */}
            <GridStatusCard />

            {/* Air Quality Card */}
            <AirQualityCard />
          </div>

          {liveData.loading ? (
            <CardSkeleton height="h-20" />
          ) : liveData.weather ? (
            <WeatherCard weather={liveData.weather} />
          ) : (
            <DashboardCard className="p-5 flex items-center justify-between border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-xl flex items-center justify-center shrink-0 font-bold">
                  <span className="text-xl">🌤️</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-textPrimary dark:text-white">
                    Weather Green Tip (Offline)
                  </h4>
                  <p className="text-[10px] text-textSecondary dark:text-gray-400 font-semibold leading-relaxed mt-0.5">
                    Weather data unavailable. Cycle or walk short commutes under 2km to save ~2.1kg CO₂.
                  </p>
                </div>
              </div>
            </DashboardCard>
          )}

          {/* Heatmap */}
          <ActivityHeatmap activities={activities} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Emissions statistics comparison */}
            <DashboardCard className="p-6 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-textSecondary dark:text-gray-400 mb-2">
                  Emissions Comparison
                </h4>
                <p className="text-[11px] text-textSecondary dark:text-gray-300 leading-normal">
                  Your weekly emissions total is{' '}
                  <span className="font-bold text-textPrimary dark:text-white">
                    {weeklyEmissions.toFixed(1)} kg
                  </span>. Compared to the India weekly average ({indiaAverageWeekly.toFixed(1)} kg):
                </p>
              </div>

              <div className="flex items-center gap-3">
                {weeklyEmissions < indiaAverageWeekly ? (
                  <>
                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/20 text-secondary dark:text-accent rounded-full flex items-center justify-center shrink-0">
                      <TrendingDown size={18} />
                    </div>
                    <span className="text-xs font-bold text-secondary dark:text-accent">
                      {((1 - weeklyEmissions / indiaAverageWeekly) * 100).toFixed(0)}% lower than average!
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 bg-red-50 dark:bg-red-950/20 text-dangerColor rounded-full flex items-center justify-center shrink-0">
                      <Activity size={18} />
                    </div>
                    <span className="text-xs font-bold text-dangerColor">
                      {((weeklyEmissions / indiaAverageWeekly - 1) * 100).toFixed(0)}% higher than average.
                    </span>
                  </>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold">
                  {liveData.nationalDailyAvgKg === 5.21 
                    ? "Target benchmark based on India CEA 2023 data fallback (1.9t/year)"
                    : `Target benchmark dynamically sourced from World Bank ${new Date().getFullYear() - 2} India emissions data`}
                </p>
              </div>
            </DashboardCard>

            {/* Today summary card */}
            <DashboardCard className="p-6 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-textSecondary dark:text-gray-400 mb-2">
                  Today's Carbon Footprint
                </h4>
                <p className="text-[11px] text-textSecondary dark:text-gray-300">
                  Sum total carbon release logged from activities today:
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary dark:text-white">
                  {todayEmissions.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-textSecondary dark:text-gray-400">kg CO₂</span>
              </div>
            </DashboardCard>
          </div>
        </div>

      </section>

      {/* Recent Activity Logs */}
      <section className="space-y-4" aria-label="Recent carbon logs">
        <SectionHeader 
          title="Recent Activity Logs" 
          level={3}
        />

        {recentActivities.length === 0 ? (
          <DashboardCard className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <Leaf size={24} className="text-accent" />
            <div className="text-xs text-textSecondary dark:text-gray-400 max-w-xs">
              No carbon logs saved yet. Click <span className="font-semibold text-primary dark:text-accent">Log Activity</span> to start tracking your carbon score!
            </div>
          </DashboardCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" role="list" aria-label="Recent logged activities">
            {recentActivities.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        )}
      </section>

      {/* Personalized Recommendations */}
      {hasData && trendRecs.length > 0 && (
        <section className="space-y-4" aria-label="Personalized sustainability recommendations">
          <SectionHeader 
            title="Personalized Recommendations 📈" 
            level={3}
            subtitle="Analyzed from your historical logging trends to optimize savings"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trendRecs.map((rec) => {
              const diffColor = rec.difficulty === 'easy' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/20' : 
                                rec.difficulty === 'medium' ? 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/20' : 
                                'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20';
              return (
                <DashboardCard 
                  key={rec.id} 
                  className="p-5 flex flex-col justify-between space-y-3 border border-gray-150 dark:border-gray-700/60"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-primary dark:bg-gray-700 text-white uppercase tracking-wider">
                        {rec.category}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${diffColor}`}>
                        {rec.difficulty}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-textPrimary dark:text-white leading-snug">{rec.title}</h4>
                    <p className="text-[10px] text-textSecondary dark:text-gray-400 font-medium leading-relaxed">{rec.action}</p>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-750 pt-2">
                    <span className="text-[9px] font-bold text-textSecondary dark:text-gray-400 uppercase tracking-wide">Potential Reduction</span>
                    <span className="text-xs font-extrabold text-secondary dark:text-accent">
                      -{rec.savingKg.toFixed(1)} kg CO₂
                    </span>
                  </div>
                </DashboardCard>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

export default Dashboard;
