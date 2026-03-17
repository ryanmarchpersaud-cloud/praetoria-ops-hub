import { useState, useEffect, useCallback } from 'react';

export interface WeatherCurrent {
  condition: string;
  temperature: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDirection: string | null;
  humidity: number | null;
  pressure: number | null;
  visibility: number | null;
  windChill: number | null;
  iconCode: string | null;
  observedAt: string | null;
}

export interface WeatherWarning {
  type: string;
  priority: string;
  description: string;
}

export interface WeatherForecastPeriod {
  period: string;
  summary: string;
  temperature: number | null;
  iconCode: string | null;
  pop: string | null;
  snowLevel: string | null;
}

export interface WeatherData {
  city: string;
  province: string;
  source: string;
  fetchedAt: string;
  current: WeatherCurrent | null;
  warnings: WeatherWarning[];
  forecast: WeatherForecastPeriod[];
  snowAlert: {
    level: 'none' | 'watch' | 'warning';
    hasSnowWarning: boolean;
    forecastSnow: boolean;
  };
}

const CACHE_KEY = 'praetoria_weather_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 min

function getCachedWeather(city: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${city}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached._cachedAt > CACHE_DURATION) return null;
    return cached.data;
  } catch { return null; }
}

function setCachedWeather(city: string, data: WeatherData) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${city}`, JSON.stringify({ data, _cachedAt: Date.now() }));
  } catch { /* storage full */ }
}

export function useWeather(city = 'toronto') {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    const cached = getCachedWeather(city);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `https://${projectId}.supabase.co/functions/v1/weather?city=${encodeURIComponent(city)}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
      });

      if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
      
      const weatherData: WeatherData = await response.json();
      setCachedWeather(city, weatherData);
      setData(weatherData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return { data, loading, error, refetch: fetchWeather };
}

// Map ECCC icon codes to emoji for lightweight display
export function weatherIcon(iconCode: string | null | undefined): string {
  if (!iconCode) return '🌤';
  const code = parseInt(iconCode);
  if ([0, 1].includes(code)) return '☀️';
  if ([2, 3, 4, 5].includes(code)) return '⛅';
  if ([6, 7, 8, 9, 10, 20, 21, 22].includes(code)) return '🌧';
  if ([11, 12, 13, 28, 33].includes(code)) return '🌨';
  if ([14, 15, 16, 17, 18, 19, 26, 27].includes(code)) return '❄️';
  if ([23, 24, 25].includes(code)) return '🌩';
  if ([30, 31, 32].includes(code)) return '🌙';
  if ([34, 35, 36].includes(code)) return '🌫';
  return '🌤';
}
