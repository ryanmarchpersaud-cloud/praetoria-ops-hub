import { useSnowLogs } from '@/hooks/useSnowLogs';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Snowflake, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo } from 'react';

export default function PortalSnowHistory() {
  const { data: customer } = useCustomerProfile();
  const { data: logs = [], isLoading } = useSnowLogs(
    customer?.id ? { customerId: customer.id } : undefined
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof logs>();
    logs.forEach((l) => {
      const key = l.season ?? 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Snowflake className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Snow & Ice History</h1>
          <p className="text-sm text-muted-foreground">Permanent record of every snow service we've performed at your property.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          No snow service history available yet.
        </CardContent></Card>
      ) : (
        grouped.map(([season, entries]) => (
          <Card key={season}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Snowflake className="h-4 w-4 text-blue-600" />
                Winter {season} <Badge variant="secondary" className="ml-2">{entries.length} visits</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {entries.map((l) => (
                <div key={l.id} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{format(new Date(l.service_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</div>
                      {l.properties?.property_name && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{l.properties.property_name}
                        </div>
                      )}
                    </div>
                    {l.snowfall_cm != null && (
                      <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                        {l.snowfall_cm} cm snowfall
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {l.weather_conditions && (
                      <div><span className="text-muted-foreground">Conditions:</span> {l.weather_conditions}{l.temperature_c != null && ` (${l.temperature_c}°C)`}</div>
                    )}
                    {(l.services_performed?.length ?? 0) > 0 && (
                      <div><span className="text-muted-foreground">Services:</span> {l.services_performed!.join(', ')}</div>
                    )}
                    {(l.start_time || l.end_time) && (
                      <div><span className="text-muted-foreground">Time:</span> {l.start_time ?? '—'}{l.end_time ? ` – ${l.end_time}` : ''}</div>
                    )}
                  </div>
                  {l.customer_summary && (
                    <div className="mt-2 text-sm text-foreground/90 italic">"{l.customer_summary}"</div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
