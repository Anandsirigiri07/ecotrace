import { useQuery } from './useQuery';

interface AirQuality {
  aqi: number;
  level: 'Good' | 'Moderate' | 'Unhealthy' | 'Hazardous';
  pm25: number;
  pm10: number;
  color: string;
  advice: string;
  icon: string;
}

/**
 * Custom hook to fetch air quality index data for Bengaluru using useQuery.
 * Caches responses for 1 hour to prevent API rate-limit exhaustion.
 */
export const useAirQuality = () => {
  const { data, loading, error } = useQuery<AirQuality | null>(
    'air-quality-bengaluru',
    async () => {
      const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
      if (!apiKey) {
        throw new Error('API key missing');
      }

      // OpenWeatherMap Air Pollution API (Bengaluru coords: 12.9716, 77.5946)
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution` +
        `?lat=12.9716&lon=77.5946` +
        `&appid=${apiKey}`
      );
      if (!res.ok) {
        throw new Error('Failed to fetch air quality');
      }

      const json = await res.json();
      const aqi = json.list[0].main.aqi; // 1-5 scale
      const components = json.list[0].components;

      const levels = {
        1: { level: 'Good', color: '#22c55e',
             icon: '😊',
             advice: 'Perfect air quality. Great day to exercise outdoors!' },
        2: { level: 'Moderate', color: '#84cc16',
             icon: '🙂',
             advice: 'Acceptable air. Sensitive groups take care.' },
        3: { level: 'Unhealthy', color: '#f59e0b',
             icon: '😷',
             advice: 'Limit outdoor activity. Use public transport.' },
        4: { level: 'Unhealthy', color: '#ef4444',
             icon: '🚨',
             advice: 'Stay indoors. Air quality is poor today.' },
        5: { level: 'Hazardous', color: '#7c3aed',
             icon: '☠️',
             advice: 'Hazardous! Avoid all outdoor activity.' }
      };

      const levelData = levels[aqi as keyof typeof levels] || levels[1];

      return {
        aqi,
        level: levelData.level as AirQuality['level'],
        pm25: Math.round(components.pm2_5),
        pm10: Math.round(components.pm10),
        color: levelData.color,
        advice: levelData.advice,
        icon: levelData.icon
      };
    },
    { staleTime: 3600000 } // Cache for 1 hour
  );

  return { data, loading, error };
};

export default useAirQuality;
