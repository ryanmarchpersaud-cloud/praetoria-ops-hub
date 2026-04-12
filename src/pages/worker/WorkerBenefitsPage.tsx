import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Building2, Calendar, Info, Shield, Activity } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  terminated: 'bg-destructive/10 text-destructive border-destructive/20',
  waived: 'bg-muted text-muted-foreground border-border',
};

function useWorkerBenefitEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['worker_benefit_enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('hr_benefit_enrollments')
        .select('*')
        .eq('employee_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch provider names
      const providerIds = [...new Set((data ?? []).map(d => (d as any).provider_id).filter(Boolean))];
      let providerMap: Record<string, string> = {};
      if (providerIds.length > 0) {
        const { data: providers } = await supabase
          .from('hr_insurance_providers')
          .select('id, provider_name')
          .in('id', providerIds);
        providerMap = Object.fromEntries((providers ?? []).map(p => [p.id, p.provider_name]));
      }

      return (data ?? []).map(d => ({
        ...d,
        provider_name: providerMap[(d as any).provider_id] || 'Unknown Provider',
      }));
    },
    enabled: !!user,
  });
}

export default function WorkerBenefitsPage() {
  const { data: enrollments = [], isLoading } = useWorkerBenefitEnrollments();

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  const activeEnrollments = enrollments.filter((e: any) => e.enrollment_status === 'active');

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Benefits</h1>
        <Badge variant="outline" className={activeEnrollments.length > 0 ? statusColors.active : statusColors.waived}>
          {activeEnrollments.length > 0 ? `${activeEnrollments.length} Active` : 'No Enrollments'}
        </Badge>
      </div>

      {enrollments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Heart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">No Benefit Enrollments</p>
            <p className="text-xs text-muted-foreground mt-1">Contact your supervisor or the admin office to get enrolled in benefits.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enrollment: any) => (
            <Card key={enrollment.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {enrollment.plan_type || 'Benefit Plan'}
                  </CardTitle>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[enrollment.enrollment_status] ?? ''}`}>
                    {enrollment.enrollment_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow icon={Building2} label="Provider" value={enrollment.provider_name} />
                <InfoRow icon={Calendar} label="Effective" value={enrollment.effective_date ? format(new Date(enrollment.effective_date), 'MMM d, yyyy') : undefined} />
                {enrollment.termination_date && (
                  <InfoRow icon={Calendar} label="Ends" value={format(new Date(enrollment.termination_date), 'MMM d, yyyy')} />
                )}
                {enrollment.dependent_count > 0 && (
                  <InfoRow icon={Activity} label="Dependents" value={String(enrollment.dependent_count)} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contact */}
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

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  );
}
