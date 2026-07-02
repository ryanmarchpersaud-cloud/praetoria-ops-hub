import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Upload, FileText, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAdminOwnerDocuments,
  useUploadOwnerDocument,
  useDeleteOwnerDocument,
  useToggleOwnerDocumentVisibility,
  signOwnerDocument,
} from '@/hooks/useOwnerPortal';

interface Props {
  ownerId?: string;
  propertyId?: string;
}

export function OwnerDocumentsManager({ ownerId, propertyId }: Props) {
  const { data: docs = [], isLoading } = useAdminOwnerDocuments({ ownerId, propertyId });
  const upload = useUploadOwnerDocument();
  const del = useDeleteOwnerDocument();
  const toggle = useToggleOwnerDocumentVisibility();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visible, setVisible] = useState(true);

  const reset = () => {
    setFile(null); setTitle(''); setDescription(''); setCategory(''); setVisible(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    if (!file) { toast.error('Choose a file'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }
    try {
      await upload.mutateAsync({
        file, title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        owner_id: ownerId, property_id: propertyId,
        is_owner_visible: visible,
      });
      toast.success('Document uploaded');
      reset();
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed');
    }
  };

  const open = async (path: string) => {
    try {
      const url = await signOwnerDocument(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not open');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Owner documents</CardTitle>
        <p className="text-xs text-muted-foreground">
          Files stored privately. When "Visible to owner" is on, the property owner sees the document in their portal via a signed link.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-md bg-muted/30">
          <div className="md:col-span-2"><Label>File</Label>
            <Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Property management agreement" /></div>
          <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="agreement, inspection, notice…" /></div>
          <div className="md:col-span-2"><Label>Description (optional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={visible} onCheckedChange={setVisible} />
            <Label>Visible to property owner</Label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={submit} disabled={upload.isPending}>
              <Upload className="h-4 w-4 mr-1" />{upload.isPending ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            docs.map((d: any) => (
              <div key={d.id} className="flex items-center gap-2 border rounded-md px-3 py-2">
                <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {d.property?.property_name ?? 'Owner-level'}
                    {d.category ? ` · ${d.category}` : ''}
                    {' · '}{new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggle.mutate({ id: d.id, is_owner_visible: !d.is_owner_visible })} title={d.is_owner_visible ? 'Hide from owner' : 'Show to owner'}>
                  {d.is_owner_visible ? <Eye className="h-4 w-4 text-emerald-700" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => open(d.file_path)}>Open</Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this document?')) del.mutate({ id: d.id, file_path: d.file_path }); }}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
