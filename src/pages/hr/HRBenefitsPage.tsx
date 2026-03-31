import { useState } from 'react';
import { useInsuranceProviders, useUpsertProvider } from '@/hooks/useHRModules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Shield, Heart, Building2, Phone, Mail, Globe, ExternalLink,
  Plus, FileText, Car, HardHat, Stethoscope,
} from 'lucide-react';

const providerTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  health: { icon: Heart, label: 'Health / Medical', color: 'bg-rose-500/10 text-rose-600 border-rose-200' },
  dental: { icon: Stethoscope, label: 'Dental', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  vision: { icon: Stethoscope, label: 'Vision', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
  life: { icon: Shield, label: 'Life / Disability', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  auto: { icon: Car, label: 'Auto / Fleet (SGI)', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  wcb: { icon: HardHat, label: 'WCB / Workers Comp', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  group: { icon: Building2, label: 'Group Benefits', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  other: { icon: FileText, label: 'Other', color: 'bg-muted text-muted-foreground border-border' },
};

const defaultProviders = [
  { provider_name: 'SGI (Saskatchewan Gov\'t Insurance)', provider_type: 'auto', contact_phone: '1-844-855-2744', website_url: 'https://www.sgi.sk.ca', portal_url: 'https://www.mysgi.sk.ca' },
  { provider_name: 'Blue Cross', provider_type: 'health', contact_phone: '1-800-667-6853', website_url: 'https://www.sk.bluecross.ca', portal_url: 'https://www.sk.bluecross.ca/member' },
  { provider_name: 'Sun Life Financial', provider_type: 'group', contact_phone: '1-877-786-5433', website_url: 'https://www.sunlife.ca', portal_url: 'https://www.sunlife.ca/signin' },
  { provider_name: 'WCB Saskatchewan', provider_type: 'wcb', contact_phone: '1-800-667-7590', website_url: 'https://www.wcbsask.com', portal_url: 'https://www.wcbsask.com/employers' },
];

function ProviderForm({ initial, onSave, onCancel }: { initial?: any; onSave: (p: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial ?? { provider_name: '', provider_type: 'health', group_policy_number: '', account_number: '', contact_phone: '', contact_email: '', website_url: '', portal_url: '', notes: '' });
  return (
    <div className="space-y-3">
      <div><Label>Provider Name</Label><Input value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })} /></div>
      <div><Label>Type</Label>
        <Select value={form.provider_type} onValueChange={v => setForm({ ...form, provider_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(providerTypeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Group Policy #</Label><Input value={form.group_policy_number || ''} onChange={e => setForm({ ...form, group_policy_number: e.target.value })} /></div>
        <div><Label>Account #</Label><Input value={form.account_number || ''} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Phone</Label><Input value={form.contact_phone || ''} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
        <div><Label>Email</Label><Input value={form.contact_email || ''} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Website</Label><Input value={form.website_url || ''} onChange={e => setForm({ ...form, website_url: e.target.value })} /></div>
        <div><Label>Portal URL</Label><Input value={form.portal_url || ''} onChange={e => setForm({ ...form, portal_url: e.target.value })} /></div>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.provider_name}>Save</Button>
      </div>
    </div>
  );
}

export default function HRBenefitsPage() {
  const { data: providers = [], isLoading } = useInsuranceProviders();
  const upsert = useUpsertProvider();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const handleSave = async (p: any) => {
    try {
      await upsert.mutateAsync(p);
      toast.success(p.id ? 'Provider updated' : 'Provider added');
      setDialogOpen(false);
      setEditing(null);
    } catch { toast.error('Failed to save'); }
  };

  const handleSeedDefaults = async () => {
    for (const d of defaultProviders) {
      const exists = providers.some(p => p.provider_name === d.provider_name);
      if (!exists) await upsert.mutateAsync(d);
    }
    toast.success('Default providers added');
  };

  if (isLoading) return <div className="space-y-3 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Benefits & Insurance Hub</h1>
          <p className="text-sm text-muted-foreground">Quick access to all insurance providers, policy numbers, and portals</p>
        </div>
        <div className="flex gap-2">
          {providers.length === 0 && (
            <Button variant="outline" onClick={handleSeedDefaults}>
              <Plus className="h-4 w-4 mr-1" /> Add Default Providers
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Provider</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Provider</DialogTitle></DialogHeader>
              <ProviderForm initial={editing} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditing(null); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {providers.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No providers configured yet</p>
          <p className="text-xs mt-1">Click "Add Default Providers" to set up SGI, Blue Cross, Sun Life & WCB quickly.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p: any) => {
            const cfg = providerTypeConfig[p.provider_type] || providerTypeConfig.other;
            const Icon = cfg.icon;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <p className="truncate">{p.provider_name}</p>
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                      </div>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setDialogOpen(true); }}>Edit</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {p.group_policy_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Policy:</span>
                      <span className="font-mono text-foreground">{p.group_policy_number}</span>
                    </div>
                  )}
                  {p.account_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Account:</span>
                      <span className="font-mono text-foreground">{p.account_number}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {p.contact_phone && (
                      <a href={`tel:${p.contact_phone}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground">
                        <Phone className="h-3 w-3" /> {p.contact_phone}
                      </a>
                    )}
                    {p.contact_email && (
                      <a href={`mailto:${p.contact_email}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground">
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    )}
                    {p.website_url && (
                      <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground">
                        <Globe className="h-3 w-3" /> Website
                      </a>
                    )}
                    {p.portal_url && (
                      <a href={p.portal_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium">
                        <ExternalLink className="h-3 w-3" /> Open Portal
                      </a>
                    )}
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground pt-1 border-t border-border">{p.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
