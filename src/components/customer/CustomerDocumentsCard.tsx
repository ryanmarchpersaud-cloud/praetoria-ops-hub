import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen, Upload, Download, Trash2, FileText, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['Contract', 'Access', 'Insurance', 'Site Map', 'Photo', 'Other'] as const;

const categoryColor: Record<string, string> = {
  Contract: 'bg-blue-100 text-blue-700 border-blue-200',
  Access: 'bg-purple-100 text-purple-700 border-purple-200',
  Insurance: 'bg-amber-100 text-amber-700 border-amber-200',
  'Site Map': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Photo: 'bg-pink-100 text-pink-700 border-pink-200',
  Other: 'bg-gray-100 text-gray-700 border-gray-200',
};

interface Props {
  customerId: string;
}

export function CustomerDocumentsCard({ customerId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Contract');
  const [notes, setNotes] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['customer_documents', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });

  const reset = () => {
    setTitle('');
    setCategory('Contract');
    setNotes('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast({ title: 'Choose a file', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `customer-documents/${customerId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('customer_documents').insert({
        customer_id: customerId,
        uploaded_by: userData.user?.id,
        title: title.trim(),
        category,
        notes: notes.trim() || null,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });
      if (insErr) throw insErr;

      toast({ title: 'Document uploaded' });
      qc.invalidateQueries({ queryKey: ['customer_documents', customerId] });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(doc.file_path, 60 * 10);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      toast({ title: 'Cannot open file', description: err.message, variant: 'destructive' });
    }
  };

  const deleteMut = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from('attachments').remove([doc.file_path]);
      const { error } = await supabase.from('customer_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Document deleted' });
      qc.invalidateQueries({ queryKey: ['customer_documents', customerId] });
    },
    onError: (err: any) => toast({ title: 'Delete failed', description: err.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5" /> Documents
          <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-muted text-foreground">
            {docs.length}
          </span>
        </CardTitle>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setOpen(true)}>
          <Plus className="h-3 w-3" /> Upload
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No documents yet. Upload contracts, insurance, access notes, site maps, etc.</p>
        ) : (
          docs.map((d: any) => (
            <div key={d.id} className="flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-accent/30 transition">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => handleDownload(d)} className="text-sm font-medium text-primary hover:underline truncate text-left">
                    {d.title}
                  </button>
                  <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${categoryColor[d.category] || categoryColor.Other}`}>
                    {d.category}
                  </Badge>
                </div>
                {d.notes && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{d.notes}</p>}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {d.file_name} · {d.file_size ? `${(d.file_size / 1024).toFixed(0)} KB · ` : ''}
                  {d.created_at ? format(new Date(d.created_at), 'MMM d, yyyy') : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(d)} title="Open">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Delete "${d.title}"? This cannot be undone.`)) deleteMut.mutate(d);
                  }}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Snow Removal Contract 2026" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any context the team should know..." />
            </div>
            <div>
              <Label className="text-xs">File *</Label>
              <Input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" />
              <p className="text-[10px] text-muted-foreground mt-1">PDF, images, Word, Excel, etc. Max 20MB.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-1" /> Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
