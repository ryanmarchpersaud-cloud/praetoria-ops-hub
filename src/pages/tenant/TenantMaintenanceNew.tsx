import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Search, AlertTriangle, Phone } from 'lucide-react';
import { useMyTenantContext, useCreateMaintenanceRequest } from '@/hooks/useTenantPortal';
import {
  MAINTENANCE_CATALOG,
  MaintenanceCategory,
  MaintenanceIssue,
  popularIssues,
  searchIssues,
  issueKey,
} from '@/lib/maintenanceCatalog';

type Step = 'category' | 'issue' | 'details';

export default function TenantMaintenanceNew() {
  const nav = useNavigate();
  const { data: ctx, isLoading } = useMyTenantContext();
  const create = useCreateMaintenanceRequest();

  const [step, setStep] = useState<Step>('category');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory | null>(null);
  const [issue, setIssue] = useState<MaintenanceIssue | null>(null);
  const [otherTitle, setOtherTitle] = useState('');

  const [form, setForm] = useState({
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'urgent',
    contact_notes: '',
    permission_to_enter: false,
    preferred_contact_time: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const searchResults = useMemo(() => searchIssues(search), [search]);
  const popular = useMemo(() => popularIssues(), []);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!ctx?.tenant || !ctx.activeLease) {
    return (
      <div className="p-6">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          You need an active lease to submit a maintenance request. Please contact your property manager.
        </CardContent></Card>
      </div>
    );
  }

  const pickIssue = (cat: MaintenanceCategory, iss: MaintenanceIssue) => {
    setCategory(cat);
    setIssue(iss);
    setForm(f => ({ ...f, priority: iss.priority ?? 'normal' }));
    setOtherTitle('');
    setStep('details');
  };

  const pickOther = (cat: MaintenanceCategory) => {
    setCategory(cat);
    setIssue(null);
    setOtherTitle('');
    setForm(f => ({ ...f, priority: 'normal' }));
    setStep('details');
  };

  const title = issue?.label || otherTitle.trim();

  const submit = async () => {
    if (!category) { toast.error('Please choose a category'); return; }
    if (!title) { toast.error('Please describe your issue'); return; }
    try {
      await create.mutateAsync({
        tenant_id: ctx.tenant.id,
        property_id: ctx.activeLease.property_id,
        unit_id: ctx.activeLease.unit_id,
        lease_id: ctx.activeLease.id,
        title,
        description: form.description || undefined,
        category: category.key,
        priority: form.priority,
        contact_notes: form.contact_notes || undefined,
        permission_to_enter: form.permission_to_enter,
        preferred_contact_time: form.preferred_contact_time || undefined,
        files,
        // Structured catalog metadata
        issue_label: issue?.label ?? null,
        issue_key: issue ? issueKey(category.key, issue.label) : null,
        is_urgent_safety: issue?.urgent === true,
        priority_suggested_by_catalog: issue?.priority ?? null,
      });
      toast.success('Request submitted');
      nav('/tenant/maintenance');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to submit');
    }
  };

  // ---------- STEP: Category ----------
  if (step === 'category') {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What kind of issue are you reporting?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-11"
                placeholder="Search issues (e.g. leak, toilet, no heat)…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {search.trim() ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search results</p>
                {searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground">No matches. Try a different word, or scroll down to browse.</p>
                )}
                <div className="grid gap-2">
                  {searchResults.map(({ category: cat, issue: iss }) => (
                    <button
                      key={cat.key + iss.label}
                      onClick={() => pickIssue(cat, iss)}
                      className="text-left px-3 py-2.5 rounded-md border hover:bg-emerald-50 hover:border-emerald-500 transition"
                    >
                      <div className="text-sm font-medium">{iss.label}</div>
                      <div className="text-xs text-muted-foreground">{cat.icon} {cat.label}{iss.urgent ? ' • Urgent' : ''}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Common issues</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {popular.map(({ category: cat, issue: iss }) => (
                      <button
                        key={cat.key + iss.label}
                        onClick={() => pickIssue(cat, iss)}
                        className="text-left px-3 py-2.5 rounded-md border hover:bg-emerald-50 hover:border-emerald-500 transition"
                      >
                        <div className="text-sm font-medium">{iss.label}</div>
                        <div className="text-xs text-muted-foreground">{cat.icon} {cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Browse categories</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MAINTENANCE_CATALOG.map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => { setCategory(cat); setStep('issue'); }}
                        className="flex flex-col items-center gap-1 p-4 rounded-md border hover:bg-emerald-50 hover:border-emerald-500 transition min-h-[88px]"
                      >
                        <span className="text-2xl">{cat.icon}</span>
                        <span className="text-xs font-medium text-center">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- STEP: Issue ----------
  if (step === 'issue' && category) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setStep('category')} className="h-8 px-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">{category.icon} {category.label}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {category.issues.map(iss => (
              <button
                key={iss.label}
                onClick={() => pickIssue(category, iss)}
                className="w-full text-left px-3 py-3 rounded-md border hover:bg-emerald-50 hover:border-emerald-500 transition flex items-center justify-between gap-2"
              >
                <span className="text-sm font-medium">{iss.label}</span>
                {iss.urgent && <Badge variant="destructive" className="text-[10px]">URGENT</Badge>}
              </button>
            ))}
            <button
              onClick={() => pickOther(category)}
              className="w-full text-left px-3 py-3 rounded-md border border-dashed hover:bg-muted transition text-sm"
            >
              Something else in {category.label}…
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- STEP: Details ----------
  const showUrgentWarning = issue?.urgent === true;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {showUrgentWarning && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-red-800">This looks urgent</p>
                <p className="text-red-700 mt-1">
                  If there is immediate danger (gas leak, fire, flooding, injury), <strong>call 911 first</strong>.
                  Then contact Praetoria right away — do not wait for a portal reply.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <a href="tel:+13066343666" className="inline-flex items-center gap-1 rounded-md bg-red-600 text-white px-3 py-1.5 text-xs font-semibold">
                    <Phone className="h-3 w-3" /> Call Praetoria
                  </a>
                  <a href="tel:911" className="inline-flex items-center gap-1 rounded-md bg-red-800 text-white px-3 py-1.5 text-xs font-semibold">
                    <Phone className="h-3 w-3" /> Call 911
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setStep(category ? 'issue' : 'category')} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">Add details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="text-xs text-muted-foreground">{category?.icon} {category?.label}</div>
            <div className="font-medium">{issue?.label ?? 'Other'}</div>
          </div>

          {!issue && (
            <div>
              <Label>Describe the issue *</Label>
              <Input
                value={otherTitle}
                onChange={e => setOtherTitle(e.target.value)}
                placeholder="Short title, e.g. Bedroom closet rod fell down"
              />
            </div>
          )}

          <div>
            <Label>More details (optional)</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="When did it start? How bad is it? Any other useful info…"
            />
          </div>

          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low — cosmetic / not urgent</SelectItem>
                <SelectItem value="normal">Normal — needs attention</SelectItem>
                <SelectItem value="urgent">Urgent — safety / major damage</SelectItem>
              </SelectContent>
            </Select>
            {issue?.priority && (
              <p className="text-xs text-muted-foreground mt-1">Suggested: {issue.priority}</p>
            )}
          </div>

          <div>
            <Label>Photos / files (optional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={e => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} file(s) selected</p>}
          </div>

          <div>
            <Label>Access / contact notes (optional)</Label>
            <Textarea
              rows={2}
              value={form.contact_notes}
              onChange={e => setForm({ ...form, contact_notes: e.target.value })}
              placeholder="e.g. Key under mat, dog inside, buzz apartment 2B"
            />
          </div>

          <div>
            <Label>Preferred contact time (optional)</Label>
            <Input
              value={form.preferred_contact_time}
              onChange={e => setForm({ ...form, preferred_contact_time: e.target.value })}
              placeholder="e.g. Weekdays after 5pm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.permission_to_enter}
              onCheckedChange={(v) => setForm({ ...form, permission_to_enter: !!v })}
            />
            <span>Permission to enter if I am not home</span>
          </label>

          <Button
            onClick={submit}
            disabled={create.isPending}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold text-base shadow-md"
          >
            {create.isPending ? 'Submitting…' : 'Submit Request'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
