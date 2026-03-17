import { useWeather, weatherIcon } from '@/hooks/useWeather';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle, ArrowLeft, Wind, Droplets, Eye, Thermometer, Snowflake,
  Loader2, RefreshCw, Shield, MapPin, Clock,
  CloudSnow, TriangleAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import type { WeatherData } from '@/hooks/useWeather';

function getServiceRisk(data: WeatherData) {
  const risks: Array<{ level: 'low' | 'medium' | 'high' | 'critical'; label: string; detail: string }> = [];
  const c = data.current;
  if (!c) return risks;

  if (c.temperature !== null && c.temperature <= 0 && c.temperature > -5 && c.humidity !== null && c.humidity > 70) {
    risks.push({ level: 'high', label: 'Black Ice Risk', detail: 'Near-zero temps with high humidity — surfaces may be icy' });
  }
  if (c.windChill !== null && c.windChill < -25) {
    risks.push({ level: 'critical', label: 'Extreme Cold', detail: `Wind chill ${Math.round(c.windChill)}° — limit outdoor exposure` });
  } else if (c.windChill !== null && c.windChill < -15) {
    risks.push({ level: 'high', label: 'Cold Warning', detail: `Wind chill ${Math.round(c.windChill)}° — dress warmly` });
  }
  if (c.visibility !== null && c.visibility < 2) {
    risks.push({ level: 'high', label: 'Low Visibility', detail: `${c.visibility} km — drive carefully` });
  }
  if (c.windGust && c.windGust > 60) {
    risks.push({ level: 'high', label: 'High Winds', detail: `Gusts to ${Math.round(c.windGust)} km/h` });
  } else if (c.windSpeed !== null && c.windSpeed > 40) {
    risks.push({ level: 'medium', label: 'Strong Winds', detail: `${Math.round(c.windSpeed)} km/h sustained` });
  }
  if (data.snowAlert.hasSnowWarning) {
    risks.push({ level: 'critical', label: 'Snow Warning', detail: 'Official snow warning in effect — prepare crews' });
  } else if (data.snowAlert.forecastSnow) {
    risks.push({ level: 'medium', label: 'Snow Expected', detail: 'Snowfall in forecast — review service schedule' });
  }
  if (risks.length === 0) {
    risks.push({ level: 'low', label: 'Conditions Clear', detail: 'No weather risks for field operations' });
  }
  return risks;
}

const riskColors = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  high: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800',
  critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
};

const riskIcons = { low: Shield, medium: TriangleAlert, high: AlertTriangle, critical: AlertTriangle };

export default function WorkerWeatherDetail() {
  const [searchParams] = useSearchParams();
  const city = searchParams.get('city') || 'toronto';
  const { data, loading, error, refetch } = useWeather(city);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading weather…</span>
      </div>
    );
  }

  if (error || !data?.current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <p className="text-sm text-muted-foreground">Weather unavailable</p>
        <button onClick={refetch} className="text-sm text-primary font-medium flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  const { current, warnings, forecast, snowAlert } = data;
  const emoji = weatherIcon(current.iconCode);
  const risks = getServiceRisk(data);
  const feelsLike = current.windChill !== null && current.windChill < (current.temperature ?? 100) ? Math.round(current.windChill) : null;
  const snowPeriods = forecast.filter(f => f.snowLevel);

  return (
    <div className="space-y-4 px-4 pt-3 pb-24">
      {/* Hero */}
      <div className={cn(
        'rounded-2xl p-5',
        snowAlert.level === 'warning'
          ? 'bg-gradient-to-br from-blue-700/15 via-blue-500/8 to-blue-900/5'
          : 'bg-gradient-to-br from-primary/10 via-primary/4 to-accent/5'
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="font-medium">{data.city}, {data.province}</span>
          </div>
          <button onClick={refetch} className="w-8 h-8 rounded-lg bg-background/60 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {warnings.length > 0 && (
          <div className={cn(
            'mb-3 px-3 py-2 rounded-xl flex items-start gap-2',
            snowAlert.hasSnowWarning ? 'bg-blue-100/80 dark:bg-blue-900/40' : 'bg-amber-100/80 dark:bg-amber-900/40'
          )}>
            {snowAlert.hasSnowWarning ? <Snowflake className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
            <p className={cn('text-xs font-semibold', snowAlert.hasSnowWarning ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300')}>
              {warnings[0].description || warnings[0].type}
            </p>
          </div>
        )}

        <div className="flex items-center gap-5">
          <span className="text-6xl leading-none">{emoji}</span>
          <div>
            <p className="text-5xl font-bold text-foreground tracking-tighter leading-none">
              {current.temperature !== null ? `${Math.round(current.temperature)}°` : '--°'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{current.condition}</p>
            {feelsLike !== null && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                <Thermometer className="h-3 w-3" /> Feels like {feelsLike}°
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Service Risk */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary" /> Field Service Risk
        </h2>
        <div className="space-y-1.5">
          {risks.map((risk, i) => {
            const RiskIcon = riskIcons[risk.level];
            return (
              <div key={i} className={cn('flex items-start gap-2.5 p-3 rounded-xl border', riskColors[risk.level])}>
                <RiskIcon className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold">{risk.label}</p>
                  <p className="text-[11px] opacity-80">{risk.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conditions */}
      <div className="grid grid-cols-3 gap-2">
        {current.windSpeed !== null && (
          <Card><CardContent className="p-3 text-center">
            <Wind className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{Math.round(current.windSpeed)}</p>
            <p className="text-[9px] text-muted-foreground">km/h {current.windDirection || ''}</p>
          </CardContent></Card>
        )}
        {current.humidity !== null && (
          <Card><CardContent className="p-3 text-center">
            <Droplets className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{current.humidity}%</p>
            <p className="text-[9px] text-muted-foreground">Humidity</p>
          </CardContent></Card>
        )}
        {current.visibility !== null && (
          <Card><CardContent className="p-3 text-center">
            <Eye className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{current.visibility}</p>
            <p className="text-[9px] text-muted-foreground">km vis</p>
          </CardContent></Card>
        )}
      </div>

      {/* Snow */}
      {snowPeriods.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <CloudSnow className="h-4 w-4 text-blue-500" /> Snow Accumulation
          </h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              {snowPeriods.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{weatherIcon(p.iconCode)}</span>
                    <p className="text-xs font-medium text-foreground">{p.period}</p>
                  </div>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">❄ {p.snowLevel}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast */}
      {forecast.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Forecast</h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              {forecast.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl w-7 text-center">{weatherIcon(f.iconCode)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{f.period}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{f.summary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{f.temperature !== null ? `${Math.round(f.temperature)}°` : '--'}</p>
                    {f.snowLevel && <p className="text-[9px] text-blue-600 font-semibold">❄ {f.snowLevel}</p>}
                    {!f.snowLevel && f.pop && parseInt(f.pop) > 0 && <p className="text-[9px] text-muted-foreground">{f.pop}%</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Warnings
          </h2>
          {warnings.map((w, i) => (
            <Card key={i} className="mb-2">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{w.type || 'Alert'}</p>
                  <p className="text-[11px] text-muted-foreground">{w.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        {data.source} • {new Date(data.fetchedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
