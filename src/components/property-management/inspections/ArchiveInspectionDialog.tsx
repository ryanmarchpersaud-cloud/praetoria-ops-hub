import { useState } from 'react';
import { Archive, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  PM_DOC_VISIBILITIES, PmDocumentVisibility,
} from '@/hooks/pm/usePmDocuments';

const ARCHIVABLE_STATUSES = new Set(['completed', 'reviewed']);

interface Props {
  inspectionId: string;
  status?: string | null;
  title?: string | null;
  inspected_at?: string | null;
  property_id?: string | null;
  unit_id?: string | null;
  tenant_id?: string | null;
  owner_id?: string | null;
  lease_id?: string | null;
}

export function ArchiveInspectionDialog(p: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<PmDocumentVisibility>('internal_only');
  const [busy, setBusy] = useState(false);

  const canArchive = !!p.status && ARCHIVABLE_STATUSES.has(p.status);

  const submit = async () => {
    if (!canArchive) {
      toast.warning('Complete or review this inspection before archiving it.');
      return;
    }
    setBusy(true);
    try {
      // Duplicate check: same inspection + visibility + active
      const { data: existing, error: exErr } = await supabase
        .from('pm_documents')
        .select('id')
        .eq('inspection_id', p.inspectionId)
        .eq('visibility', visibility)
        .eq('status', 'active')
        .limit(1);
      if (exErr) throw exErr;
      if (existing && existing.length > 0) {
        toast.info('An archived inspection report already exists for this visibility.');
        setBusy(false);
        return;
      }

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;

      const dateStr = p.inspected_at
        ? new Date(p.inspected_at).toLocaleDateString()
        : new Date().toLocaleDateString();
      const title = `Inspection Report — ${p.title ?? 'Inspection'} — ${dateStr}`;
      // pm_documents.file_path is required. Use a sentinel path referencing the inspection.
      // Consumers detect document_type === 'inspection' and open the print route instead of signing storage.
      const sentinelPath = `__inspection_report__/${p.inspectionId}`;
      const fileName = `${title}.report`;

      const { error: insErr } = await supabase.from('pm_documents').insert({
        title,
        description: 'Inspection report archived from PM inspection record.',
        document_type: 'inspection',
        category: 'inspection',
        property_id: p.property_id ?? null,
        unit_id: p.unit_id ?? null,
        tenant_id: p.tenant_id ?? null,
        owner_id: p.owner_id ?? null,
        lease_id: p.lease_id ?? null,
        inspection_id: p.inspectionId,
        visibility,
        status: 'active',
        file_path: sentinelPath,
        file_name: fileName,
        mime_type: 'application/x-inspection-report',
        uploaded_by: uid,
      });
      if (insErr) throw insErr;

      // Log inspection activity (internal-only so tenant/owner don't see internal note)
      await supabase.from('pm_inspection_activity').insert({
        inspection_id: p.inspectionId,
        actor_id: uid,
        action: 'report_archived',
        detail: { visibility } as any,
        visibility: 'internal_only',
      });

      qc.invalidateQueries({ queryKey: ['pm_documents'] });
      qc.invalidateQueries({ queryKey: ['pm_inspection', p.inspectionId] });
      qc.invalidateQueries({ queryKey: ['tenant_pm_documents'] });
      qc.invalidateQueries({ queryKey: ['owner_pm_documents'] });
      toast.success('Inspection report saved to Document Hub.');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to archive inspection report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Archive className="h-4 w-4 mr-1" /> Save to Document Hub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save inspection report to Document Hub</DialogTitle>
          <DialogDescription>
            Archives a linked record in the PM Document Hub. Visibility here controls who sees the document
            entry. What each viewer sees when they open the report is still governed by the inspection's own
            tenant/owner visibility rules.
          </DialogDescription>
        </DialogHeader>

        {!canArchive && (
          <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Complete or review this inspection before archiving it.</span>
          </div>
        )}

        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as PmDocumentVisibility)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PM_DOC_VISIBILITIES.map((v) => (
                <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !canArchive}>
            {busy ? 'Saving…' : 'Save to Document Hub'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
