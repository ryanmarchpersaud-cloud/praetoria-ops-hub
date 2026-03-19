import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ShieldCheck, Upload, FileUp, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    signed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    expired: 'bg-destructive/10 text-destructive',
    missing: 'bg-muted text-muted-foreground',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

const COMPLIANCE_DOC_TYPES = [
  { value: 'insurance', label: 'Insurance Certificate' },
  { value: 'wcb', label: 'WCB / Workers Comp' },
  { value: 'business_license', label: 'Business License' },
  { value: 'agreement', label: 'Signed Agreement' },
  { value: 'safety', label: 'Safety Documentation' },
  { value: 'certificate', label: 'Trade Certificate' },
  { value: 'other', label: 'Other' },
];

export default function SubcontractorCompliance() {
  const { data: profile, isLoading } = useSubcontractorProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('');
  const [docName, setDocName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;

  const items = [
    { label: 'Insurance', status: profile.insurance_status, expiry: profile.insurance_expiry },
    { label: 'WCB / Workers Comp', status: profile.wcb_status, expiry: profile.wcb_expiry },
    { label: 'Business License', status: profile.business_license_status, expiry: profile.business_license_expiry },
    { label: 'Signed Agreement', status: profile.agreement_signed_status },
    { label: 'Safety Documentation', status: profile.safety_doc_status },
  ];

  const resetForm = () => {
    setDocType('');
    setDocName('');
    setExpiryDate('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !docType || !docName) {
      toast.error('Please fill in document name, type, and select a file.');
      return;
    }

    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop();
      const filePath = `${profile.id}/${Date.now()}-${docName.replace(/\s+/g, '_')}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('subcontractor-documents')
        .upload(filePath, selectedFile);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('subcontractor-documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('subcontractor_documents')
        .insert({
          subcontractor_id: profile.id,
          document_name: docName,
          document_type: docType,
          file_url: publicUrl,
          file_name: selectedFile.name,
          status: 'pending',
          uploaded_by: user?.id,
          expiry_date: expiryDate || null,
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully. Admin will review shortly.');
      queryClient.invalidateQueries({ queryKey: ['subcontractor_documents'] });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Compliance</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Compliance Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Document Type *</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_DOC_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Document Name *</Label>
                <Input placeholder="e.g. 2025 Liability Insurance" value={docName} onChange={e => setDocName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date (if applicable)</Label>
                <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>File (PDF, Word, Image) *</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</p>
                )}
              </div>
              <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {uploading ? 'Uploading...' : 'Submit Document'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-0">
          {items.map(item => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.expiry && <p className="text-[10px] text-muted-foreground">Expires: {format(new Date(item.expiry), 'MMM d, yyyy')}</p>}
              </div>
              <StatusChip status={item.status} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed border-muted-foreground/20 p-4 text-center">
        <ShieldCheck className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">Upload your compliance documents above. Admin will review and update your status.</p>
      </div>
    </div>
  );
}
