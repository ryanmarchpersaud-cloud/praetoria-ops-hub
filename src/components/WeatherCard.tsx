import { Card, CardContent } from '@/components/ui/card';
import { useWeather, weatherIcon } from '@/hooks/useWeather';
import { AlertTriangle, Wind, Droplets, Eye, Thermometer, Snowflake, Loader2, RefreshCw, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface WeatherCardProps {
  city?: string;
  compact?: boolean;
  className?: string;
  linkTo?: string;
}

export function WeatherCard({ city = 'regina', compact = false, className, linkTo }: WeatherCardProps) {
  const { data, loading, error, refetch } = useWeather(city);

  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="py-8 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading weather…</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.current) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="py-5 text-center space-y-2">
          <p className="text-xs text-muted-foreground">Weather unavailable</p>
          <button onClick={refetch} className="text-[11px] text-primary font-medium flex items-center gap-1 mx-auto active:opacity-70">
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
  const feelsLike = current.windChill !== null && current.windChill < (current.temperature ?? 100)
    ? Math.round(current.windChill)
    : null;

  // Get the snow forecast periods
  const snowPeriods = forecast.filter(f => f.snowLevel);
  const precipPeriods = forecast.filter(f => f.pop && parseInt(f.pop) > 30);

  const resolvedLink = linkTo || (compact ? '/worker/weather' : '/weather');

  const cardInner = (
    <Card className={cn(
      'overflow-hidden transition-all group',
      isSnowAlert && 'ring-1 ring-blue-300/50 dark:ring-blue-700/50',
      hasWarnings && !isSnowAlert && 'ring-1 ring-amber-300/50 dark:ring-amber-700/50',
      className
    )}>
      {/* Gradient header with weather */}
      <div className={cn(
        'relative px-4 pt-4 pb-3',
        isSnowAlert
          ? 'bg-gradient-to-br from-blue-600/10 via-blue-500/5 to-background'
          : hasWarnings
          ? 'bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-background'
          : 'bg-gradient-to-br from-primary/8 via-primary/3 to-background'
      )}>
        {/* Alert banner */}
        {(isSnowAlert || hasWarnings) && (
          <div className={cn(
            'flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold',
            isSnowAlert
              ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          )}>
            {isSnowAlert ? <Snowflake className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {isSnowAlert
              ? snowAlert.level === 'warning' ? 'Snow Warning Active' : 'Snow in Forecast'
              : warnings[0]?.description || 'Weather Alert'
            }
          </div>
        )}

        {/* Main weather display */}
        <div className="flex items-center gap-4">
          <div className="text-5xl leading-none">{emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground tracking-tight">
                {current.temperature !== null ? `${Math.round(current.temperature)}°` : '--°'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-snug">{current.condition}</p>
            {feelsLike !== null && (
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 flex items-center gap-1 mt-0.5">
                <Thermometer className="h-3 w-3" /> Feels like {feelsLike}°
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground font-medium">{data.city}</p>
            <p className="text-[9px] text-muted-foreground">{data.province}</p>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-3 mt-3 text-[11px] text-muted-foreground">
          {current.windSpeed !== null && (
            <span className="flex items-center gap-1">
              <Wind className="h-3 w-3 text-muted-foreground/70" />
              {Math.round(current.windSpeed)} km/h
              {current.windGust && current.windGust > current.windSpeed && (
                <span className="text-[9px] text-destructive/70">G{Math.round(current.windGust)}</span>
              )}
            </span>
          )}
          {current.humidity !== null && (
            <span className="flex items-center gap-1">
              <Droplets className="h-3 w-3 text-muted-foreground/70" /> {current.humidity}%
            </span>
          )}
          {current.visibility !== null && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-muted-foreground/70" /> {current.visibility} km
            </span>
          )}
        </div>
      </div>

      {/* Forecast strip */}
      {forecast.length > 0 && !compact && (
        <div className="px-3 py-2.5 border-t border-border/50">
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1 scrollbar-none">
            {forecast.slice(0, 6).map((f, i) => (
              <div key={i} className="flex-shrink-0 text-center px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors min-w-[56px]">
                <p className="text-[9px] text-muted-foreground font-medium truncate max-w-[52px]">{f.period}</p>
                <p className="text-lg my-0.5 leading-none">{weatherIcon(f.iconCode)}</p>
                <p className="text-[11px] font-bold text-foreground">
                  {f.temperature !== null ? `${Math.round(f.temperature)}°` : '--'}
                </p>
                {f.snowLevel && (
                  <p className="text-[8px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">❄ {f.snowLevel}</p>
                )}
                {!f.snowLevel && f.pop && parseInt(f.pop) > 30 && (
                  <p className="text-[8px] text-blue-500/70 mt-0.5">{f.pop}%</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snow / service risk indicators */}
      {(snowPeriods.length > 0 || precipPeriods.length > 0) && !compact && (
        <div className="px-4 py-2.5 border-t border-border/50 space-y-1.5">
          {snowPeriods.length > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <Snowflake className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="text-foreground font-medium">
                Snow expected: {snowPeriods.map(s => `${s.period} (${s.snowLevel})`).join(', ')}
              </span>
            </div>
          )}
          {precipPeriods.length > 0 && snowPeriods.length === 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <Droplets className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="text-muted-foreground">
                Precip: {precipPeriods.map(p => `${p.period} ${p.pop}%`).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Compact forecast row */}
      {compact && forecast.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50 flex gap-2 overflow-x-auto scrollbar-none">
          {forecast.slice(0, 4).map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
              <span>{weatherIcon(f.iconCode)}</span>
              <span className="font-medium text-foreground">{f.temperature !== null ? `${Math.round(f.temperature)}°` : '--'}</span>
              <span className="truncate max-w-[40px]">{f.period}</span>
              {f.snowLevel && <span className="text-blue-600 font-semibold">❄</span>}
            </div>
          ))}
        </div>
      )}

      {/* Footer link */}
      <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between">
        <p className="text-[9px] text-muted-foreground">
          {data.source}
        </p>
        <span className="flex items-center gap-0.5 text-[11px] text-primary font-medium group-hover:gap-1 transition-all">
          Details <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Card>
  );

  if (resolvedLink) {
    return <Link to={resolvedLink} className="block">{cardInner}</Link>;
  }

  return cardInner;
}
