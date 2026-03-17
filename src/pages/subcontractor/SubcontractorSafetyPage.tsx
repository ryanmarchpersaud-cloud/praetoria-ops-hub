import { useState } from 'react';
import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { useSubcontractorIncidentReports } from '@/hooks/useIncidentReports';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Plus, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const INCIDENT_TYPES = [
  'Site Incident', 'Property Damage', 'Vehicle / Equipment Incident',
  'Near Miss', 'Safety Concern',
];

const statusColors: Record<string, string> = {
  open: 'bg-amber-500/10 text-amber-700 border-amber-200',
  investigating: 'bg-blue-500/10 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground',
};

export default function SubcontractorSafetyPage() {
  const { data: profile } = useSubcontractorProfile();
  const { data: reports = [], isLoading } = useSubcontractorIncidentReports(profile?.id);
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Incidents & Damage</h1>
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Report
        </Button>
      </div>

      <Card className="border-amber-200 bg-amber-500/5">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Report all site incidents, property damage, and safety concerns to Praetoria immediately.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No incident reports filed.</p>
          ) : (
            <div className="space-y-2.5">
              {reports.map((r: any) => (
                <div key={r.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.incident_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.date_time), 'MMM d, yyyy · h:mm a')}
                    </p>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[r.follow_up_status] ?? ''}`}>
                    {r.follow_up_status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SubIncidentDialog open={showForm} onClose={() => setShowForm(false)} subId={profile?.id} />
    </div>
  );
}

function SubIncidentDialog({ open, onClose, subId }: { open: boolean; onClose: () => void; subId?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [type, setType] = useState('Site Incident');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setType('Site Incident'); setDateTime(''); setLocation(''); setDescription(''); };

  const handleSubmit = async () => {
    if (!description || !user) {
      toast({ title: 'Please provide a description', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('incident_reports').insert([{
        user_id: user.id,
        reporter_type: 'subcontractor',
        subcontractor_id: subId || null,
        incident_type: type,
        date_time: dateTime || new Date().toISOString(),
        location: location.trim() || null,
        description: description.trim(),
      }]);
      if (error) throw error;
      toast({ title: 'Incident report submitted' });
      qc.invalidateQueries({ queryKey: ['incident_reports_sub'] });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to submit', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> Report Incident
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Incident Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date & Time</Label>
            <Input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} />
          </div>
          <div>
            <Label>Location</Label>
            <Input placeholder="Site address or area" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea placeholder="What happened?" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} variant="destructive">
            {submitting ? 'Submitting…' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
