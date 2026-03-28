import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, ArrowLeft, CheckCircle2, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

const INCIDENT_TYPES = [
  'Site Incident', 'Property Damage', 'Vehicle / Equipment Incident',
  'Near Miss', 'Safety Concern',
];

export default function SubcontractorNewIncidentPage() {
  const { user } = useAuth();
  const { data: profile } = useSubcontractorProfile();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [type, setType] = useState('Site Incident');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string; report_number: string } | null>(null);

  const handleSubmit = async () => {
    if (!description.trim() || !user) {
      toast({ title: 'Please provide a description', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('incident_reports').insert([{
        user_id: user.id,
        reporter_type: 'subcontractor',
        subcontractor_id: profile?.id || null,
        incident_type: type,
        date_time: dateTime || new Date().toISOString(),
        location: location.trim() || null,
        description: description.trim(),
      }]).select('id, report_number').single();
      if (error) throw error;

      // Log to activity feed
      await supabase.from('activities').insert({
        action_name: `Incident report ${(data as any).report_number} submitted by subcontractor`,
        record_type: 'incident_report',
        record_id: data.id,
        user_id: user.id,
        status: 'completed',
      });

      // Send internal ops + admin email notification
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            action: 'incident_report',
            report_number: (data as any).report_number,
            incident_type: type,
            severity: 'medium',
            description: description.trim(),
            reporter_name: user.email,
            incident_id: data.id,
          },
        });
      } catch { /* non-critical */ }

      qc.invalidateQueries({ queryKey: ['incident_reports_sub'] });
      setSubmitted({ id: data.id, report_number: (data as any).report_number });
    } catch (e: any) {
      toast({ title: 'Failed to submit', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="px-4 pt-12 pb-4 space-y-6 animate-fade-in text-center">
        <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
        <div>
          <h1 className="text-xl font-bold">Report Submitted</h1>
          <p className="text-sm text-muted-foreground mt-1">Your incident report has been filed.</p>
        </div>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Report Number</p>
            <p className="text-lg font-mono font-bold mt-1">{submitted.report_number}</p>
          </CardContent>
        </Card>
        <div className="flex gap-2 justify-center">
          <Link to="/subcontractor/incidents">
            <Button variant="outline">View All Reports</Button>
          </Link>
          <Link to={`/subcontractor/incidents/${submitted.id}`}>
            <Button>View Report</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/subcontractor/incidents">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h1 className="text-lg font-bold">New Incident Report</h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What Happened</p>
          <div>
            <Label>Incident Type *</Label>
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
            <p className="text-[10px] text-muted-foreground mt-0.5">Leave blank to use current time</p>
          </div>
          <div>
            <Label>Location</Label>
            <Input placeholder="Site address or area" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
          <div>
            <Label>Description *</Label>
            <Textarea placeholder="Describe what happened…" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <Camera className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
          <p className="text-xs text-muted-foreground">Photo upload coming soon</p>
        </CardContent>
      </Card>

      <Button className="w-full" variant="destructive" onClick={handleSubmit} disabled={submitting || !description.trim()}>
        {submitting ? 'Submitting…' : 'Submit Incident Report'}
      </Button>
    </div>
  );
}
