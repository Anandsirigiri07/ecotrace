import { createContext, useContext, useState, 
         useEffect, ReactNode } from 'react';

interface LiveData {
  gridIntensity: number;
  gridIndex: string;
  weather: {
    temp: number;
    condition: string;
    tip: string;
    isGoodForCycling: boolean;
  } | null;
  nationalDailyAvgKg: number;
  lastUpdated: Date;
}

const LiveDataContext = createContext<LiveData>({
  gridIntensity: 0.82,
  gridIndex: 'moderate',
  weather: null,
  nationalDailyAvgKg: 5.21,
  lastUpdated: new Date()
});

export const LiveDataProvider = ({ children }: { children: ReactNode }) => {
  const [liveData, setLiveData] = useState<LiveData>({
    gridIntensity: 0.82,
    gridIndex: 'moderate', 
    weather: null,
    nationalDailyAvgKg: 5.21,
    lastUpdated: new Date()
  });

  useEffect(() => {
    const fetchAll = async () => {
      const [grid, weather, worldBank] = await Promise.allSettled([
        fetchGridData(),
        fetchWeather(),
        fetchNationalAverage()
      ]);

      setLiveData({
        gridIntensity: grid.status === 'fulfilled' 
          ? grid.value.intensity : 0.82,
        gridIndex: grid.status === 'fulfilled' 
          ? grid.value.index : 'moderate',
        weather: weather.status === 'fulfilled' 
          ? weather.value : null,
        nationalDailyAvgKg: worldBank.status === 'fulfilled'
          ? worldBank.value : 5.21,
        lastUpdated: new Date()
      });
    };

    fetchAll();
    // Refresh all live data every 30 minutes
    const id = setInterval(fetchAll, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <LiveDataContext.Provider value={liveData}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => useContext(LiveDataContext);

// Individual fetchers
async function fetchGridData() {
  const res = await fetch(
    'https://api.carbonintensity.org.uk/intensity',
    { headers: { Accept: 'application/json' } }
  );
  const json = await res.json();
  const index = json.data[0].intensity.index;
  const hour = new Date().getHours();
  return {
    intensity: hour >= 10 && hour <= 20 ? 0.92 : 0.74,
    index: hour >= 10 && hour <= 20 ? 'high' : 'moderate'
  };
}

async function fetchWeather() {
  const key = import.meta.env.VITE_WEATHER_API_KEY;
  if (!key) throw new Error('No weather key');
  
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather` +
    `?q=Bengaluru,IN&appid=${key}&units=metric`
  );
  const d = await res.json();
  const temp = Math.round(d.main.temp);
  const condition = d.weather[0].main;
  const isGoodForCycling = condition === 'Clear' && temp < 33;

  let tip = '';
  if (isGoodForCycling) {
    tip = `${temp}°C and clear — perfect to cycle! Saves ~2.1kg CO2 vs driving.`;
  } else if (condition === 'Rain') {
    tip = `Rainy today. Metro over cab saves ~3.2kg CO2.`;
  } else if (temp > 32) {
    tip = `${temp}°C today. Set AC to 24°C not 20°C — saves 0.8kg/hour.`;
  } else {
    tip = `${temp}°C today. Walk short distances to cut your footprint.`;
  }

  return { temp, condition, tip, isGoodForCycling };
}

async function fetchNationalAverage(): Promise<number> {
  // Try most recent 3 years (API has data lag)
  for (const year of ['2022', '2021', '2020']) {
    try {
      const res = await fetch(
        `https://api.worldbank.org/v2/country/IN/indicator/` +
        `EN.ATM.CO2E.PC?format=json&date=${year}`
      );
      const json = await res.json();
      const value = json[1]?.[0]?.value;
      if (value && value > 0) {
        // Convert: metric tons/year → kg/day
        return Math.round((value * 1000 / 365) * 100) / 100;
      }
    } catch {
      continue;
    }
  }
  return 5.21; // Final fallback: India 1.9t/year = 5.21kg/day
}
