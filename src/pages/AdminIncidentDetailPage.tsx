import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Clock, Users, Eye, Stethoscope, User } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const statusColors: Record<string, string> = {
  open: 'bg-amber-500/10 text-amber-700 border-amber-200',
  investigating: 'bg-blue-500/10 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground',
};

const severityColors: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-200',
  high: 'bg-orange-500/10 text-orange-700 border-orange-200',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function AdminIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [correctiveNotes, setCorrectiveNotes] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['incident_report', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (report) {
      setStatus(report.follow_up_status);
      setSeverity((report as any).severity || 'medium');
      setAdminNotes(report.admin_notes || '');
      setCorrectiveNotes((report as any).corrective_action_notes || '');
    }
  }, [report]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('incident_reports')
        .update({
          follow_up_status: status,
          admin_notes: adminNotes.trim() || null,
          severity,
          corrective_action_notes: correctiveNotes.trim() || null,
        } as any)
        .eq('id', id);
      if (error) throw error;

      // Log to activity feed
      await supabase.from('activities').insert({
        action_name: `Incident ${(report as any)?.report_number || id.slice(0, 8)} updated — status: ${status}, severity: ${severity}`,
        record_type: 'incident_report',
        record_id: id,
        status: 'completed',
      });

      toast({ title: 'Report updated' });
      qc.invalidateQueries({ queryKey: ['incident_report', id] });
      qc.invalidateQueries({ queryKey: ['admin_incident_reports'] });
    } catch (e: any) {
      toast({ title: 'Failed to update', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setStatus('closed');
    // Will be saved when user clicks Save
    toast({ title: 'Status set to closed — click Save to confirm' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Report not found.</p>
        <Link to="/incidents"><Button variant="link">Back to incidents</Button></Link>
      </div>
    );
  }

  const r = report as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/incidents">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{report.incident_type}</h1>
            <Badge variant="outline" className="font-mono text-xs">{r.report_number || report.id.slice(0, 8).toUpperCase()}</Badge>
            <Badge variant="outline" className="capitalize">{report.reporter_type}</Badge>
            <Badge variant="outline" className={statusColors[report.follow_up_status] ?? ''}>
              {report.follow_up_status}
            </Badge>
            <Badge variant="outline" className={severityColors[r.severity] ?? ''}>
              {r.severity} severity
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column — Report details */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">When & Where</h2>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{format(new Date(report.date_time), 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(report.date_time), 'h:mm a')}</p>
                </div>
              </div>
              {report.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm">{report.location}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h2>
              <p className="text-sm whitespace-pre-wrap">{report.description || 'No description provided.'}</p>
            </CardContent>
          </Card>

          {(report.people_involved || report.witnesses) && (
            <Card>
              <CardContent className="p-5 space-y-3">
                {report.people_involved && (
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">People Involved</p>
                      <p className="text-sm">{report.people_involved}</p>
                    </div>
                  </div>
                )}
                {report.witnesses && (
                  <div className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Witnesses</p>
                      <p className="text-sm">{report.witnesses}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">Medical Attention: <strong>{report.medical_attention ? 'Yes' : 'No'}</strong></p>
              </div>
              {report.reported_to && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">Reported to: <strong>{report.reported_to}</strong></p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Admin actions */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Admin Actions</h2>

              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Follow-up Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Corrective Action Notes</Label>
                <Textarea
                  placeholder="Describe corrective actions taken or required…"
                  value={correctiveNotes}
                  onChange={e => setCorrectiveNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-xs">Admin Notes</Label>
                <Textarea
                  placeholder="Internal notes about this incident…"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                {status !== 'closed' && (
                  <Button variant="outline" onClick={handleClose}>
                    Close Report
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">
                Filed {format(new Date(report.created_at), 'MMM d, yyyy · h:mm a')}
              </p>
              {report.updated_at !== report.created_at && (
                <p className="text-xs text-muted-foreground">
                  Updated {format(new Date(report.updated_at), 'MMM d, yyyy · h:mm a')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
