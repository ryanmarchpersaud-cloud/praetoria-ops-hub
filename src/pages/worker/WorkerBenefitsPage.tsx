import { useWorkerProfile } from '@/hooks/useWorkerProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Building2, Calendar, Info } from 'lucide-react';

const benefitStatusColors: Record<string, string> = {
  enrolled: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  'not-enrolled': 'bg-muted text-muted-foreground border-border',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  waived: 'bg-muted text-muted-foreground border-border',
};

export default function WorkerBenefitsPage() {
  const { data: profile, isLoading } = useWorkerProfile();

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  const status = profile?.benefits_status ?? 'not-enrolled';

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Benefits</h1>
        <Badge variant="outline" className={benefitStatusColors[status] ?? ''}>
          {status.replace('-', ' ')}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" /> Health Benefits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row icon={Building2} label="Provider" value={profile?.benefits_provider} />
          <Row icon={Calendar} label="Effective Date" value={profile?.benefits_effective_date} />
          {profile?.benefits_plan_summary && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Plan Summary</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{profile.benefits_plan_summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Need help with benefits?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contact your supervisor or the admin office for benefit enrollment, changes, or claims support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  );
}
