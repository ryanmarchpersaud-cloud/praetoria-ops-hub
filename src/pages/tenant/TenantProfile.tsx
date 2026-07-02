import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Car, Cat, Users, ShieldCheck, PhoneCall, Upload, FileText, ClipboardCheck } from 'lucide-react';
import {
  useEmergencyContacts, useOccupants, useVehicles, usePets, useInsurance,
  useUploadOwnInsurance, useInspections, signInsuranceProof,
} from '@/hooks/useTenantProfile';
import { toast } from 'sonner';

const REVIEW_NOTE = 'These records are reviewed and maintained by Praetoria Group. To update, tap "Request update" or email ops@praetoriagroup.ca.';

export default function TenantProfile() {
  const { data: contacts = [] } = useEmergencyContacts();
  const { data: occ = [] } = useOccupants();
  const { data: veh = [] } = useVehicles();
  const { data: pets = [] } = usePets();
  const { data: ins } = useInsurance();
  const { data: inspections = [] } = useInspections();
  const upload = useUploadOwnInsurance();

  const [provider, setProvider] = useState('');
  const [policy, setPolicy] = useState('');
  const [expiry, setExpiry] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const insStatus = ins?.status ?? 'not_provided';

  const requestUpdate = (topic: string) => {
    const subject = encodeURIComponent(`Tenant portal — update request: ${topic}`);
    window.location.href = `mailto:ops@praetoriagroup.ca?subject=${subject}`;
  };

  return (
    <div className="p-4 space-y-4">
      <Button variant="ghost" size="sm" asChild><Link to="/tenant/account"><ArrowLeft className="h-4 w-4 mr-1" />Account</Link></Button>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><PhoneCall className="h-4 w-4 text-emerald-700" /> Emergency Contacts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {contacts.length === 0 && <p className="text-muted-foreground">No emergency contacts on file.</p>}
          {contacts.map((c: any) => (
            <div key={c.id} className="border rounded p-2">
              <p className="font-medium">{c.contact_name} {c.is_primary && <Badge className="ml-1 bg-emerald-100 text-emerald-800">Primary</Badge>}</p>
              <p className="text-xs text-muted-foreground">{[c.relationship, c.phone, c.email].filter(Boolean).join(' · ')}</p>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => requestUpdate('Emergency contacts')}>Request update</Button>
          <p className="text-xs text-muted-foreground pt-1">{REVIEW_NOTE}</p>
        </CardContent>
      </Card>

      {/* Insurance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Renters Insurance</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={insStatus === 'provided' ? 'default' : insStatus === 'expired' ? 'destructive' : 'secondary'}>{insStatus.replace('_', ' ')}</Badge>
            {ins?.admin_verified && <Badge className="bg-emerald-100 text-emerald-800">Verified by Praetoria</Badge>}
          </div>
          {ins?.provider && <p><span className="text-muted-foreground">Provider:</span> {ins.provider}</p>}
          {ins?.policy_number && <p><span className="text-muted-foreground">Policy:</span> {ins.policy_number}</p>}
          {ins?.coverage_expiry && <p><span className="text-muted-foreground">Expires:</span> {ins.coverage_expiry}</p>}
          {ins?.storage_path && (
            <Button variant="outline" size="sm" onClick={async () => window.open(await signInsuranceProof(ins.storage_path), '_blank')}>
              <FileText className="h-4 w-4 mr-1" />View proof on file
            </Button>
          )}

          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium">Upload / update proof of insurance</p>
            <div className="grid grid-cols-1 gap-2">
              <div><Label className="text-xs">Provider</Label><Input value={provider} onChange={e => setProvider(e.target.value)} placeholder={ins?.provider ?? ''} /></div>
              <div><Label className="text-xs">Policy number</Label><Input value={policy} onChange={e => setPolicy(e.target.value)} placeholder={ins?.policy_number ?? ''} /></div>
              <div><Label className="text-xs">Coverage expiry</Label><Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} /></div>
              <div><Label className="text-xs">Proof (PDF or image)</Label><Input type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
            </div>
            <Button
              size="sm"
              disabled={upload.isPending || (!provider && !policy && !expiry && !file)}
              onClick={async () => {
                try {
                  await upload.mutateAsync({
                    provider: provider || undefined,
                    policy_number: policy || undefined,
                    coverage_expiry: expiry || undefined,
                    file: file ?? undefined,
                  });
                  toast.success('Sent to Praetoria for review');
                  setProvider(''); setPolicy(''); setExpiry(''); setFile(null);
                } catch (e: any) { toast.error(e.message); }
              }}
            ><Upload className="h-4 w-4 mr-1" />{upload.isPending ? 'Uploading…' : 'Submit for review'}</Button>
            <p className="text-xs text-muted-foreground">Insurance records are reviewed by Praetoria Group. Praetoria does not sell or process insurance.</p>
          </div>
        </CardContent>
      </Card>

      {/* Occupants */}
      <ProfileList
        title="Occupants" icon={<Users className="h-4 w-4 text-emerald-700" />}
        items={occ} render={(o: any) => (
          <>
            <p className="font-medium">{o.occupant_name} {o.is_minor && <Badge variant="outline" className="ml-1">Minor</Badge>}</p>
            <p className="text-xs text-muted-foreground">{o.relationship}</p>
          </>
        )}
        onRequest={() => requestUpdate('Occupants')}
      />

      {/* Vehicles */}
      <ProfileList
        title="Vehicles / Parking" icon={<Car className="h-4 w-4 text-emerald-700" />}
        items={veh} render={(v: any) => (
          <>
            <p className="font-medium">{v.make_model} {v.colour && <span className="text-muted-foreground">· {v.colour}</span>}</p>
            <p className="text-xs text-muted-foreground">{[v.plate, v.parking_note].filter(Boolean).join(' · ')}</p>
          </>
        )}
        onRequest={() => requestUpdate('Vehicles / parking')}
      />

      {/* Pets */}
      <ProfileList
        title="Pets" icon={<Cat className="h-4 w-4 text-emerald-700" />}
        items={pets} render={(p: any) => (
          <>
            <p className="font-medium">{p.pet_name} {p.is_approved ? <Badge className="ml-1 bg-emerald-100 text-emerald-800">Approved</Badge> : <Badge variant="outline" className="ml-1">Pending</Badge>}</p>
            <p className="text-xs text-muted-foreground">{[p.pet_type, p.breed].filter(Boolean).join(' · ')}</p>
          </>
        )}
        onRequest={() => requestUpdate('Pets')}
      />

      {/* Shared inspections */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-emerald-700" /> Move-In / Move-Out Inspections</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {inspections.length === 0 && <p className="text-muted-foreground">No inspections have been shared with you yet.</p>}
          {inspections.map((i: any) => (
            <div key={i.id} className="border rounded p-2">
              <p className="font-medium">{i.inspection_type} · {i.inspection_date ?? '—'}</p>
              {i.general_notes && <p className="text-xs mt-1">{i.general_notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileList({ title, icon, items, render, onRequest }:
  { title: string; icon: React.ReactNode; items: any[]; render: (r: any) => React.ReactNode; onRequest: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {items.length === 0 && <p className="text-muted-foreground">None on file.</p>}
        {items.map((r: any) => <div key={r.id} className="border rounded p-2">{render(r)}</div>)}
        <Button variant="outline" size="sm" onClick={onRequest}>Request update</Button>
      </CardContent>
    </Card>
  );
}
