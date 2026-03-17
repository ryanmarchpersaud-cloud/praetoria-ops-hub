import { Card, CardContent } from '@/components/ui/card';
import { useWeather, weatherIcon } from '@/hooks/useWeather';
import { AlertTriangle, Wind, Droplets, Eye, Thermometer, Snowflake, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface WeatherCardProps {
  city?: string;
  compact?: boolean;
  className?: string;
}

export function WeatherCard({ city = 'toronto', compact = false, className }: WeatherCardProps) {
  const { data, loading, error, refetch } = useWeather(city);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading weather…</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.current) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="py-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Weather unavailable</p>
          <button onClick={refetch} className="text-[10px] text-primary font-medium flex items-center gap-1 mx-auto">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const { current, warnings, forecast, snowAlert } = data;
  const emoji = weatherIcon(current.iconCode);
  const hasWarnings = warnings.length > 0;
  const isSnowAlert = snowAlert.level !== 'none';

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full text-left rounded-xl border p-3 transition-all active:scale-[0.98]',
          isSnowAlert ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' :
          hasWarnings ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' :
          'bg-card border-border',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">
                {current.temperature !== null ? `${Math.round(current.temperature)}°` : '--°'}
              </span>
              <span className="text-xs text-muted-foreground truncate">{current.condition}</span>
            </div>
            {current.windChill !== null && current.windChill < current.temperature! && (
              <p className="text-[10px] text-blue-600 dark:text-blue-400">Feels like {Math.round(current.windChill)}°</p>
            )}
          </div>
          {isSnowAlert && <Snowflake className="h-4 w-4 text-blue-500 shrink-0" />}
          {hasWarnings && !isSnowAlert && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t border-border/50 pt-2">
            {/* Details row */}
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              {current.windSpeed !== null && (
                <span className="flex items-center gap-0.5">
                  <Wind className="h-3 w-3" /> {Math.round(current.windSpeed)} km/h
                </span>
              )}
              {current.humidity !== null && (
                <span className="flex items-center gap-0.5">
                  <Droplets className="h-3 w-3" /> {current.humidity}%
                </span>
              )}
              {current.visibility !== null && (
                <span className="flex items-center gap-0.5">
                  <Eye className="h-3 w-3" /> {current.visibility} km
                </span>
              )}
            </div>

            {/* Warnings */}
            {hasWarnings && (
              <div className="space-y-1">
                {warnings.slice(0, 2).map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px]">
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">{w.description || w.type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Forecast strip */}
            {forecast.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pt-1 -mx-1 px-1">
                {forecast.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex-shrink-0 text-center px-2 py-1.5 rounded-lg bg-background/60 min-w-[52px]">
                    <p className="text-[8px] text-muted-foreground truncate max-w-[48px]">{f.period}</p>
                    <p className="text-sm">{weatherIcon(f.iconCode)}</p>
                    <p className="text-[10px] font-semibold text-foreground">
                      {f.temperature !== null ? `${Math.round(f.temperature)}°` : '--'}
                    </p>
                    {f.snowLevel && (
                      <p className="text-[8px] text-blue-600 font-medium">❄ {f.snowLevel}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-[8px] text-muted-foreground text-right">
              {data.source} • {data.city}, {data.province}
            </p>
          </div>
        )}
      </button>
    );
  }

  // Full card view
  return (
    <Card className={cn(
      'overflow-hidden',
      isSnowAlert && 'border-blue-200 dark:border-blue-800',
      hasWarnings && !isSnowAlert && 'border-amber-200 dark:border-amber-800',
      className
    )}>
      {/* Snow/warning banner */}
      {(isSnowAlert || hasWarnings) && (
        <div className={cn(
          'px-4 py-2 flex items-center gap-2',
          isSnowAlert ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-amber-50 dark:bg-amber-950/40'
        )}>
          {isSnowAlert ? (
            <Snowflake className="h-4 w-4 text-blue-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          <span className={cn(
            'text-xs font-semibold',
            isSnowAlert ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'
          )}>
            {isSnowAlert
              ? snowAlert.level === 'warning' ? 'Snow Warning Active' : 'Snow in Forecast'
              : warnings[0]?.description || 'Weather Alert'}
          </span>
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Current conditions */}
        <div className="flex items-center gap-4">
          <span className="text-4xl">{emoji}</span>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {current.temperature !== null ? `${Math.round(current.temperature)}°` : '--°'}
              </span>
              <span className="text-sm text-muted-foreground">{current.condition}</span>
            </div>
            {current.windChill !== null && current.windChill < (current.temperature ?? 100) && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Thermometer className="h-3 w-3" /> Feels like {Math.round(current.windChill)}°
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">{data.city}, {data.province}</p>
          </div>
          <button onClick={refetch} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center active:scale-90 transition-transform">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-2">
          {current.windSpeed !== null && (
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Wind className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
              <p className="text-xs font-semibold text-foreground">{Math.round(current.windSpeed)} km/h</p>
              <p className="text-[9px] text-muted-foreground">{current.windDirection || 'Wind'}</p>
            </div>
          )}
          {current.humidity !== null && (
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Droplets className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
              <p className="text-xs font-semibold text-foreground">{current.humidity}%</p>
              <p className="text-[9px] text-muted-foreground">Humidity</p>
            </div>
          )}
          {current.visibility !== null && (
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Eye className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
              <p className="text-xs font-semibold text-foreground">{current.visibility} km</p>
              <p className="text-[9px] text-muted-foreground">Visibility</p>
            </div>
          )}
        </div>

        {/* Forecast strip */}
        {forecast.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Forecast</p>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
              {forecast.map((f, i) => (
                <div key={i} className="flex-shrink-0 text-center px-2.5 py-2 rounded-lg bg-muted/40 min-w-[60px]">
                  <p className="text-[9px] text-muted-foreground truncate max-w-[56px]">{f.period}</p>
                  <p className="text-lg my-0.5">{weatherIcon(f.iconCode)}</p>
                  <p className="text-xs font-bold text-foreground">
                    {f.temperature !== null ? `${Math.round(f.temperature)}°` : '--'}
                  </p>
                  {f.pop && parseInt(f.pop) > 0 && (
                    <p className="text-[8px] text-blue-600">{f.pop}%</p>
                  )}
                  {f.snowLevel && (
                    <p className="text-[8px] text-blue-600 font-semibold">❄ {f.snowLevel}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings list */}
        {warnings.length > 0 && (
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium text-foreground">{w.description || w.type}</p>
                  {w.priority && <p className="text-[9px] text-muted-foreground">Priority: {w.priority}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[8px] text-muted-foreground text-right">
          Source: {data.source}
        </p>
      </CardContent>
    </Card>
  );
}
