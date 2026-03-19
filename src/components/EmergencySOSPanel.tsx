import { Card, CardContent } from '@/components/ui/card';
import { Phone, Navigation, AlertTriangle, FileWarning, Radio, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmergencySOSPanelProps {
  siteAddress?: string;
  siteCity?: string;
  musterPointName?: string;
  musterPointMapNotes?: string;
  supervisorPhone?: string;
  adminPhone?: string;
  siteContactPhone?: string;
  onReportIncident?: () => void;
  highRisk?: boolean;
  className?: string;
}

export function EmergencySOSPanel({
  siteAddress,
  siteCity,
  musterPointName,
  musterPointMapNotes,
  supervisorPhone,
  adminPhone = '306-555-0100',
  siteContactPhone,
  onReportIncident,
  highRisk,
  className,
}: EmergencySOSPanelProps) {
  const directionsUrl = siteAddress
    ? `https://maps.google.com/maps?daddr=${encodeURIComponent([siteAddress, siteCity].filter(Boolean).join(', '))}`
    : undefined;

  const musterUrl = musterPointMapNotes
    ? `https://maps.google.com/maps?q=${encodeURIComponent(musterPointMapNotes)}`
    : undefined;

  return (
    <div className={cn('space-y-2', className)}>
      {/* High-risk warning */}
      {highRisk && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-bold text-destructive">High-Risk Site</p>
              <p className="text-[11px] text-destructive/80">Use extra caution. Review site safety notes before starting work.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Call 911 */}
      <a href="tel:911" className="block">
        <Card className="border-destructive bg-destructive hover:bg-destructive/90 active:scale-[0.98] transition-all">
          <CardContent className="p-4 flex items-center justify-center gap-3">
            <Phone className="h-6 w-6 text-destructive-foreground" />
            <span className="text-lg font-bold text-destructive-foreground">Call 911</span>
          </CardContent>
        </Card>
      </a>

      {/* Action grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Call Admin / Dispatch */}
        <a href={`tel:${adminPhone}`} className="block">
          <Card className="h-full active:scale-[0.97] transition-transform bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[80px]">
              <Radio className="h-5 w-5 text-amber-600" />
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Call Dispatch</span>
            </CardContent>
          </Card>
        </a>

        {/* Call Supervisor */}
        {supervisorPhone ? (
          <a href={`tel:${supervisorPhone}`} className="block">
            <Card className="h-full active:scale-[0.97] transition-transform bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[80px]">
                <Phone className="h-5 w-5 text-blue-600" />
                <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">Call Supervisor</span>
              </CardContent>
            </Card>
          </a>
        ) : (
          <Card className="h-full opacity-40">
            <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[80px]">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">No Supervisor</span>
            </CardContent>
          </Card>
        )}

        {/* Site Contact */}
        {siteContactPhone ? (
          <a href={`tel:${siteContactPhone}`} className="block">
            <Card className="h-full active:scale-[0.97] transition-transform bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800">
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[80px]">
                <Phone className="h-5 w-5 text-violet-600" />
                <span className="text-[11px] font-semibold text-violet-800 dark:text-violet-300">Site Contact</span>
              </CardContent>
            </Card>
          </a>
        ) : (
          <Card className="h-full opacity-40">
            <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[80px]">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">No Site Contact</span>
            </CardContent>
          </Card>
        )}

        {/* Report Incident */}
        {onReportIncident && (
          <button onClick={onReportIncident} className="block w-full text-left">
            <Card className="h-full active:scale-[0.97] transition-transform bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800">
              <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[80px]">
                <FileWarning className="h-5 w-5 text-rose-600" />
                <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">Report Incident</span>
              </CardContent>
            </Card>
          </button>
        )}
      </div>

      {/* Directions row */}
      <div className="grid grid-cols-2 gap-2">
        {directionsUrl && (
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Card className="h-full active:scale-[0.97] transition-transform bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
              <CardContent className="p-3 flex items-center justify-center gap-2 min-h-[48px]">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Directions to Site</span>
              </CardContent>
            </Card>
          </a>
        )}
        {musterUrl && (
          <a href={musterUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Card className="h-full active:scale-[0.97] transition-transform bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800">
              <CardContent className="p-3 flex items-center justify-center gap-2 min-h-[48px]">
                <MapPin className="h-4 w-4 text-cyan-600" />
                <span className="text-[11px] font-semibold text-cyan-800 dark:text-cyan-300">Muster Point</span>
              </CardContent>
            </Card>
          </a>
        )}
      </div>
    </div>
  );
}
