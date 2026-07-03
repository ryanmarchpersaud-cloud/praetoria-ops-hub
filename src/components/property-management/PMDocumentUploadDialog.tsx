import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  PM_DOC_TYPES, PM_DOC_VISIBILITIES, PmDocumentVisibility, useUploadPmDocument,
} from '@/hooks/pm/usePmDocuments';

interface Props {
  trigger?: React.ReactNode;
  defaults?: {
    property_id?: string | null;
    unit_id?: string | null;
    owner_id?: string | null;
    tenant_id?: string | null;
    lease_id?: string | null;
    maintenance_request_id?: string | null;
    work_order_id?: string | null;
  };
  defaultVisibility?: PmDocumentVisibility;
  onUploaded?: () => void;
}

export function PMDocumentUploadDialog({ trigger, defaults, defaultVisibility, onUploaded }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState<string>('general');
  const [category, setCategory] = useState<string>('');
  const [visibility, setVisibility] = useState<PmDocumentVisibility>(defaultVisibility ?? 'internal_only');
  const upload = useUploadPmDocument();

  const reset = () => {
    setFile(null); setTitle(''); setDescription(''); setDocType('general');
    setCategory(''); setVisibility(defaultVisibility ?? 'internal_only');
  };

  const submit = async () => {
    if (!file) { toast.error('Choose a file'); return; }
    if (!title.trim()) { toast.error('Title required'); return; }
    try {
      await upload.mutateAsync({
        file,
        meta: {
          title: title.trim(),
          description: description.trim() || null,
          document_type: docType,
          category: category.trim() || null,
          visibility,
          ...defaults,
        },
      });
      toast.success('Document uploaded');
      setOpen(false);
      reset();
      onUploaded?.();
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm"><Upload className="h-4 w-4 mr-1" /> Upload document</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Signed lease – Unit 12B" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PM_DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category (optional)</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. insurance" />
            </div>
          </div>
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as PmDocumentVisibility)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PM_DOC_VISIBILITIES.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Internal-only stays hidden from tenants and owners. Tenant-visible reaches only the linked tenant. Owner-visible reaches only the linked owner.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
