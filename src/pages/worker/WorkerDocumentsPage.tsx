import { useState } from 'react';
import { useWorkerDocuments } from '@/hooks/useWorkerProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Upload, Download, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const typeLabels: Record<string, string> = {
  certificate: 'Certificate',
  policy: 'Signed Policy',
  id: 'ID Document',
  payroll: 'Payroll',
  training: 'Training',
  other: 'Other',
};

export default function WorkerDocumentsPage() {
  const { data: docs = [], isLoading } = useWorkerDocuments();
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">My Documents</h1>
        <Button size="sm" variant="outline" onClick={() => setShowUpload(true)}>
          <Plus className="h-4 w-4 mr-1" /> Upload
        </Button>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs mt-1">Upload certificates, training records, or signed policies.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <Card key={doc.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{doc.document_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">{typeLabels[doc.document_type] ?? doc.document_type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={async () => {
                    try {
                      const { openWorkerDocument } = await import('@/lib/workerDocuments');
                      await openWorkerDocument(doc.file_url);
                    } catch (e: any) {
                      toast({ title: 'Could not open document', description: e?.message, variant: 'destructive' });
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UploadDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}

function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('other');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setDocName(''); setDocType('other'); setFile(null); };

  const handleUpload = async () => {
    if (!file || !docName.trim() || !user) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('worker-documents')
        .upload(path, file);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('worker_documents').insert([{
        user_id: user.id,
        document_name: docName.trim(),
        document_type: docType,
        file_url: path,
        file_name: file.name,
        uploaded_by: user.id,
      }]);
      if (dbError) throw dbError;

      toast({ title: 'Document uploaded' });
      qc.invalidateQueries({ queryKey: ['worker_documents'] });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Upload Document
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Document Name</Label>
            <Input placeholder="e.g. First Aid Certificate" value={docName} onChange={e => setDocName(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="policy">Signed Policy</SelectItem>
                <SelectItem value="id">ID Document</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>File</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleUpload} disabled={submitting}>{submitting ? 'Uploading…' : 'Upload'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
