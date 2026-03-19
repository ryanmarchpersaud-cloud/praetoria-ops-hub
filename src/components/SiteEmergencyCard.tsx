import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Shield, Flame, Cross, DoorOpen, AlertTriangle } from 'lucide-react';

interface SiteEmergencyCardProps {
  musterPointName?: string | null;
  musterPointDescription?: string | null;
  musterPointPhotoUrl?: string | null;
  emergencyExitNotes?: string | null;
  firstAidKitLocation?: string | null;
  fireExtinguisherLocation?: string | null;
  siteEmergencyNotes?: string | null;
  highRisk?: boolean;
  cautionNotes?: string | null;
}

export function SiteEmergencyCard({
  musterPointName,
  musterPointDescription,
  musterPointPhotoUrl,
  emergencyExitNotes,
  firstAidKitLocation,
  fireExtinguisherLocation,
  siteEmergencyNotes,
  highRisk,
  cautionNotes,
}: SiteEmergencyCardProps) {
  const hasContent = musterPointName || emergencyExitNotes || firstAidKitLocation ||
    fireExtinguisherLocation || siteEmergencyNotes || cautionNotes;

  if (!hasContent && !highRisk) return null;

  return (
    <Card className={highRisk ? 'border-destructive/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Site Safety Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {highRisk && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">High-Risk Site</p>
              {cautionNotes && <p className="text-[11px] text-destructive/80 mt-0.5">{cautionNotes}</p>}
            </div>
          </div>
        )}

        {musterPointName && (
          <InfoItem icon={MapPin} label="Muster Point" value={musterPointName} detail={musterPointDescription} />
        )}
        {musterPointPhotoUrl && (
          <img src={musterPointPhotoUrl} alt="Muster point" className="rounded-lg w-full max-h-32 object-cover" />
        )}
        {emergencyExitNotes && (
          <InfoItem icon={DoorOpen} label="Emergency Exits" value={emergencyExitNotes} />
        )}
        {firstAidKitLocation && (
          <InfoItem icon={Cross} label="First Aid Kit" value={firstAidKitLocation} />
        )}
        {fireExtinguisherLocation && (
          <InfoItem icon={Flame} label="Fire Extinguisher" value={fireExtinguisherLocation} />
        )}
        {siteEmergencyNotes && (
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Emergency Notes</p>
            <p className="text-xs text-foreground">{siteEmergencyNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoItem({ icon: Icon, label, value, detail }: {
  icon: React.ElementType; label: string; value: string; detail?: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-xs text-foreground">{value}</p>
        {detail && <p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}
