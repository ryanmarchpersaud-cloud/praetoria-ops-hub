import { useWorkerTrainingRecords } from '@/hooks/useWorkerTaxDocs';
import { useWorkerCertifications } from '@/hooks/useWorkerProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, BookOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  valid: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
};

const typeLabels: Record<string, string> = {
  whmis: 'WHMIS',
  first_aid: 'First Aid',
  equipment_cert: 'Equipment Cert',
  ppe_ack: 'PPE Acknowledgement',
  handbook: 'Handbook / Policy',
  toolbox_talk: 'Toolbox Talk',
  other: 'Other',
};

export default function WorkerTrainingSafetyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: training = [], isLoading: loadingTraining } = useWorkerTrainingRecords();
  const { data: certs = [], isLoading: loadingCerts } = useWorkerCertifications();
  const isLoading = loadingTraining || loadingCerts;

  const handleAcknowledge = async (id: string) => {
    const { error } = await supabase
      .from('worker_training_records')
      .update({ status: 'completed', acknowledged_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user?.id ?? '');
    if (error) {
      toast({ title: 'Failed to acknowledge', variant: 'destructive' });
    } else {
      toast({ title: 'Training acknowledged' });
      qc.invalidateQueries({ queryKey: ['worker_training_records'] });
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  const pendingTraining = training.filter((t: any) => t.status === 'pending');
  const completedTraining = training.filter((t: any) => t.status !== 'pending');

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">Training & Safety</h1>

      {/* Pending acknowledgements */}
      {pendingTraining.length > 0 && (
        <Card className="border-amber-200 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <BookOpen className="h-4 w-4" /> Pending Acknowledgements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTraining.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{t.training_name}</p>
                  <p className="text-xs text-muted-foreground">{typeLabels[t.training_type] || t.training_type}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleAcknowledge(t.id)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Acknowledge
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4" /> Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No certifications on file.</p>
          ) : (
            <div className="space-y-2">
              {certs.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.cert_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.issuer && `${c.issuer} · `}
                      {c.expiry_date ? `Expires ${format(new Date(c.expiry_date), 'MMM d, yyyy')}` : 'No expiry'}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[c.status] ?? ''}`}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Training */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Training History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTraining.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No completed training records.</p>
          ) : (
            <div className="space-y-2">
              {completedTraining.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.training_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[t.training_type] || t.training_type}
                      {t.completed_date && ` · ${format(new Date(t.completed_date), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[t.status] ?? ''}`}>{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
