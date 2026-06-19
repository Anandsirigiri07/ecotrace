import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Plus, ArrowRight, Activity, TrendingDown, Leaf } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCarbon } from '../hooks/useCarbon';
import CarbonScoreRing from '../components/CarbonScoreRing';
import WeeklyChart from '../components/WeeklyChart';
import ActivityCard from '../components/ActivityCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useLiveData } from '../context/LiveDataContext';
import { CardSkeleton } from '../components/LiveDataSkeleton';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { calculateEcoScore } from '../utils/carbonCalc';
import { trackEvent } from '../utils/analytics';

// Weather Card Component
function WeatherCard({ weather }: { weather: any }) {
  if (!weather) return null;
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 flex items-center justify-between transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center shrink-0 font-bold">
          <span className="text-xl">🌤️</span>
        </div>
        <div>
          <h4 className="text-xs font-bold text-textPrimary">Weather Green Tip ({weather.temp}°C, {weather.condition})</h4>
          <p className="text-[10px] text-textSecondary font-semibold leading-relaxed mt-0.5">{weather.tip}</p>
        </div>
      </div>
    </div>
  );
}

// Grid Status Card Component
function GridStatusCard({ data }: { data: any }) {
  const hour = new Date().getHours();
  const isPeak = hour >= 10 && hour <= 20;
  const labelText = isPeak ? 'HIGH CARBON GRID 🔴' : 'MODERATE GRID 🟡';
  const labelTip = isPeak 
    ? 'Avoid heavy appliances now. Grid is coal-heavy.' 
    : 'Okay to use appliances. Prefer evening hours.';
  const labelColor = isPeak 
    ? 'text-red-600 bg-red-50' 
    : 'text-yellow-600 bg-yellow-50';

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 flex items-center justify-between transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-orange-50 text-warningColor rounded-xl flex items-center justify-center shrink-0 font-bold">
          <span className="text-xl">⚡</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-textPrimary">Live Grid Intensity</h4>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${labelColor}`}>{labelText}</span>
          </div>
          <p className="text-[10px] text-textSecondary font-semibold mt-0.5">
            Current factor: <span className="font-bold text-textPrimary">{data.gridIntensity.toFixed(2)} kg CO₂/kWh</span> &middot; {labelTip}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  const { activities, loading: carbonLoading, error: carbonError } = useCarbon(user ? user.uid : null);
  const liveData = useLiveData();

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
  const country = profile?.country || 'India';
  const indiaAverageWeekly = Math.round(liveData.nationalDailyAvgKg * 7 * 100) / 100;

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-48 bg-gray-250 rounded animate-pulse"></div>
          <div className="h-10 w-24 bg-gray-250 rounded-full animate-pulse"></div>
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
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-3xl shadow-lg border border-red-100 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Workspace Error</h2>
        <p className="text-sm text-textSecondary mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary/95 transition-all text-xs"
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
          <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
            Welcome back, {profile?.displayName || 'EcoTracer'}!
          </h2>
          <p className="text-xs md:text-sm text-textSecondary font-medium">
            Let's offset carbon and preserve resources today.
          </p>
        </div>

        {/* Quick Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/log')}
            aria-label="Log new carbon activity"
            className="bg-primary hover:bg-primary/95 text-white active:scale-95 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Log Activity</span>
          </button>
          <button
            onClick={() => navigate('/insights')}
            aria-label="Ask EcoTrace AI carbon advisor"
            className="bg-white hover:bg-gray-50 border border-gray-150 text-textPrimary active:scale-95 px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>Ask AI</span>
            <ArrowRight size={14} className="text-secondary" />
          </button>
        </div>
      </section>

      {/* Main Grid statistics layout */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Animated Score Ring and Streak widget */}
        <div className="flex flex-col gap-6">
          <CarbonScoreRing weeklyScore={weeklyEmissions} targetScore={indiaAverageWeekly} />

          {/* EcoScore Profile Card */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider">
                EcoScore Profile
              </h4>
              <span 
                className="text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider"
                style={{ backgroundColor: `${ecoScoreDetails.ringColor}20`, color: ecoScoreDetails.color }}
              >
                {ecoScoreDetails.label}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center font-extrabold text-2xl shadow-inner shrink-0"
                style={{ backgroundColor: `${ecoScoreDetails.ringColor}10`, color: ecoScoreDetails.color, border: `2px solid ${ecoScoreDetails.ringColor}` }}
              >
                {ecoScoreDetails.score}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-textPrimary leading-snug">
                  {ecoScoreDetails.message}
                </p>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-textSecondary font-semibold">
                    🇮🇳 {ecoScoreDetails.vsIndia}
                  </span>
                  <span className="text-[10px] text-textSecondary font-semibold">
                    🌍 {ecoScoreDetails.vsGlobal}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {liveData.weather === null 
            ? <CardSkeleton height="h-20" /> 
            : <WeatherCard weather={liveData.weather} />
          }

          {liveData.gridIntensity === 0.82 && liveData.gridIndex === 'moderate'
            ? <CardSkeleton height="h-20" />
            : <GridStatusCard data={liveData} />
          }

          {/* Streak details card */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-orange-50 text-warningColor rounded-xl flex items-center justify-center font-bold">
                <Flame size={22} className="fill-current animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-textPrimary">Logging Streak</h4>
                <p className="text-[10px] text-textSecondary font-medium">Log daily to keep it up!</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-textPrimary">{currentStreak}</span>
              <span className="text-xs text-textSecondary font-semibold block">days</span>
            </div>
          </div>
        </div>

        {/* Weekly Trend Chart & Comparisons */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <WeeklyChart activities={activities} />

          <ActivityHeatmap activities={activities} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Emissions statistics comparison */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-textSecondary mb-2">
                  Emissions Comparison
                </h4>
                <p className="text-[11px] text-textSecondary leading-normal">
                  Your weekly emissions total is{' '}
                  <span className="font-bold text-textPrimary">
                    {weeklyEmissions.toFixed(1)} kg
                  </span>. Compared to the India weekly average ({indiaAverageWeekly.toFixed(1)} kg):
                </p>
              </div>

              <div className="flex items-center gap-3">
                {weeklyEmissions < indiaAverageWeekly ? (
                  <>
                    <div className="w-9 h-9 bg-emerald-50 text-secondary rounded-full flex items-center justify-center shrink-0">
                      <TrendingDown size={18} />
                    </div>
                    <span className="text-xs font-bold text-secondary">
                      {((1 - weeklyEmissions / indiaAverageWeekly) * 100).toFixed(0)}% lower than average!
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 bg-red-50 text-dangerColor rounded-full flex items-center justify-center shrink-0">
                      <Activity size={18} />
                    </div>
                    <span className="text-xs font-bold text-dangerColor">
                      {((weeklyEmissions / indiaAverageWeekly - 1) * 100).toFixed(0)}% higher than average.
                    </span>
                  </>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-[9px] text-gray-400 font-semibold">
                  {liveData.nationalDailyAvgKg === 5.21 
                    ? "Target benchmark based on India CEA 2023 data fallback (1.9t/year)"
                    : `Target benchmark dynamically sourced from World Bank ${new Date().getFullYear() - 2} India emissions data`}
                </p>
              </div>
            </div>

            {/* Today summary card */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-textSecondary mb-2">
                  Today's Carbon Footprint
                </h4>
                <p className="text-[11px] text-textSecondary">
                  Sum total carbon release logged from activities today:
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary">
                  {todayEmissions.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-textSecondary">kg CO₂</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Recent Activity Logs */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-textSecondary">
          Recent Activity Logs
        </h3>

        {recentActivities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center justify-center space-y-3">
            <Leaf size={24} className="text-accent" />
            <div className="text-xs text-textSecondary max-w-xs">
              No carbon logs saved yet. Click <span className="font-semibold text-primary">Log Activity</span> to start tracking your carbon score!
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" role="list" aria-label="Recent logged activities">
            {recentActivities.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
export default Dashboard;
