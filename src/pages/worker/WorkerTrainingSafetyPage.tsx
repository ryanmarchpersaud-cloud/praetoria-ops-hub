import { useWorkerTrainingRecords } from '@/hooks/useWorkerTaxDocs';
import { useWorkerCertifications } from '@/hooks/useWorkerProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, BookOpen, ShieldCheck, CheckCircle2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [uploadCertOpen, setUploadCertOpen] = useState(false);
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certExpiry, setCertExpiry] = useState('');
  const [uploading, setUploading] = useState(false);

  // Worker action: acknowledge training
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

  // Worker action: upload own completion certificate (pending approval)
  const handleUploadCert = async () => {
    if (!certName.trim()) {
      toast({ title: 'Enter certificate name', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const { error } = await supabase
      .from('worker_certifications')
      .insert({
        user_id: user?.id,
        cert_name: certName.trim(),
        issuer: certIssuer.trim() || null,
        expiry_date: certExpiry || null,
        status: 'pending', // requires admin/manager approval
      } as any);
    setUploading(false);
    if (error) {
      toast({ title: 'Failed to submit certificate', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Certificate submitted for approval' });
      setCertName(''); setCertIssuer(''); setCertExpiry('');
      setUploadCertOpen(false);
      qc.invalidateQueries({ queryKey: ['worker_certifications'] });
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Training & Safety</h1>
        <Button size="sm" variant="outline" onClick={() => setUploadCertOpen(true)} className="gap-1.5 text-xs">
          <Upload className="h-3.5 w-3.5" /> Submit Certificate
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">View your assigned training and certifications. Submit completion certificates for manager approval.</p>

      {/* Pending acknowledgements — worker can acknowledge */}
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

      {/* Certifications — view only, worker sees status (pending = awaiting approval) */}
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
                    {c.status === 'pending' && (
                      <p className="text-xs text-amber-600">⏳ Awaiting manager approval</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[c.status] ?? ''}`}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Training — view only */}
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

      {/* Worker Upload Certificate Dialog */}
      <Dialog open={uploadCertOpen} onOpenChange={setUploadCertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Submit Certificate
            </DialogTitle>
            <DialogDescription>Submit a completion certificate for manager review and approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Certificate Name *</Label>
              <Input placeholder="e.g. WHMIS 2025, First Aid Level C" value={certName} onChange={e => setCertName(e.target.value)} />
            </div>
            <div>
              <Label>Issuer (optional)</Label>
              <Input placeholder="e.g. St. John Ambulance" value={certIssuer} onChange={e => setCertIssuer(e.target.value)} />
            </div>
            <div>
              <Label>Expiry Date (optional)</Label>
              <Input type="date" value={certExpiry} onChange={e => setCertExpiry(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadCertOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadCert} disabled={uploading}>
              {uploading ? 'Submitting…' : 'Submit for Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
