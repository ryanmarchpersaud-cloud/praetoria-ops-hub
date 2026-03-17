import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

const SERVICE_TYPES = ['Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance', 'Property Management', 'Power Washing', 'Cleaning Services', 'Other'];
const URGENCY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent'];

export default function PortalRequests() {
  const { user } = useAuth();
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', service_type: 'Other', urgency: 'Normal', property_id: '' });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['portal_requests', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, properties(property_name)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['portal_properties_select', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name')
        .eq('customer_id', customer.id)
        .order('property_name');
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!customer || !user) throw new Error('Not authenticated');
      const { error } = await supabase.from('service_requests').insert({
        customer_id: customer.id,
        user_id: user.id,
        subject: form.subject,
        description: form.description || null,
        service_type: form.service_type,
        urgency: form.urgency,
        property_id: form.property_id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_requests'] });
      setDialogOpen(false);
      setForm({ subject: '', description: '', service_type: 'Other', urgency: 'Normal', property_id: '' });
      toast({ title: 'Request submitted' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Requests</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Request
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <MessageSquarePlus className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No requests yet. Submit a new service request to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{r.subject}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.service_type}</span>
                  <span>·</span>
                  <span>{r.urgency}</span>
                  {r.properties?.property_name && (
                    <>
                      <span>·</span>
                      <span>{r.properties.property_name}</span>
                    </>
                  )}
                </div>
                {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New request dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle>New Service Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Subject *</Label>
              <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Snow removal needed" />
            </div>
            <div>
              <Label className="text-xs">Service Type</Label>
              <select
                value={form.service_type}
                onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
              >
                {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Urgency</Label>
              <select
                value={form.urgency}
                onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
              >
                {URGENCY_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {properties.length > 0 && (
              <div>
                <Label className="text-xs">Property (optional)</Label>
                <select
                  value={form.property_id}
                  onChange={e => setForm(p => ({ ...p, property_id: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
                >
                  <option value="">Select property...</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe what you need..." />
            </div>
            <Button
              className="w-full"
              disabled={!form.subject.trim() || createRequest.isPending}
              onClick={() => createRequest.mutate()}
            >
              {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
