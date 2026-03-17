import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Clock, Users, Eye, Stethoscope, User } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const statusColors: Record<string, string> = {
  open: 'bg-amber-500/10 text-amber-700 border-amber-200',
  investigating: 'bg-blue-500/10 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground',
};

export default function AdminIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

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

  const [status, setStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Sync state when report loads
  const initialized = status || adminNotes;
  if (report && !initialized) {
    setStatus(report.follow_up_status);
    setAdminNotes(report.admin_notes || '');
  }

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('incident_reports')
        .update({ follow_up_status: status, admin_notes: adminNotes.trim() || null })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Report updated' });
      qc.invalidateQueries({ queryKey: ['incident_report', id] });
      qc.invalidateQueries({ queryKey: ['admin_incident_reports'] });
    } catch (e: any) {
      toast({ title: 'Failed to update', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
            <Badge variant="outline" className="capitalize">{report.reporter_type}</Badge>
            <Badge variant="outline" className={statusColors[report.follow_up_status] ?? ''}>
              {report.follow_up_status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{report.id.slice(0, 8).toUpperCase()}</p>
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
                <p className="text-xs font-medium text-muted-foreground mb-1">Follow-up Status</p>
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
                <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes</p>
                <Textarea
                  placeholder="Internal notes about this incident…"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
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
