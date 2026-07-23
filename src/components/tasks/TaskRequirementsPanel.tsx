import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Receipt, Camera, AlertTriangle, CheckCircle2, Upload, Trash2, Loader2, FileText, Save,
} from 'lucide-react';

interface Props {
  task: any;
  /** Called after any DB mutation so parent can refresh */
  onChanged?: () => void;
}

const BUCKET = 'task-attachments';

async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Compute missing requirement labels for a task in its current DB state */
export function missingRequirements(task: any): string[] {
  const missing: string[] = [];
  if (task?.receipt_required && !(task?.receipt_urls?.length)) {
    missing.push('Upload the required receipt.');
  }
  if (task?.photos_required && !(task?.completion_photos?.length)) {
    missing.push('Upload the required photos.');
  }
  if (task?.follow_up_required && !task?.follow_up_completed) {
    missing.push('Complete the required follow-up.');
  }
  return missing;
}

export function TaskRequirementsPanel({ task, onChanged }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState<string>(task.receipt_amount != null ? String(task.receipt_amount) : '');
  const [receiptVendor, setReceiptVendor] = useState<string>(task.receipt_vendor || '');
  const [receiptNotes, setReceiptNotes] = useState<string>(task.receipt_notes || '');
  const [followUpNotes, setFollowUpNotes] = useState<string>(task.follow_up_notes || '');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['operational_tasks'] });
    qc.invalidateQueries({ queryKey: ['my_operational_tasks'] });
    qc.invalidateQueries({ queryKey: ['operational_task', task.id] });
    onChanged?.();
  };

  async function uploadFile(file: File, kind: 'receipts' | 'photos') {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${task.id}/${kind}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  const handleReceiptUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingReceipt(true);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files)) paths.push(await uploadFile(f, 'receipts'));
      const next = [...(task.receipt_urls || []), ...paths];
      const { error } = await supabase.from('operational_tasks').update({ receipt_urls: next }).eq('id', task.id);
      if (error) throw error;
      toast({ title: 'Receipt uploaded' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingPhoto(true);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files)) paths.push(await uploadFile(f, 'photos'));
      const next = [...(task.completion_photos || []), ...paths];
      const { error } = await supabase.from('operational_tasks').update({ completion_photos: next }).eq('id', task.id);
      if (error) throw error;
      toast({ title: `${paths.length} photo${paths.length > 1 ? 's' : ''} uploaded` });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const removeFile = async (path: string, field: 'receipt_urls' | 'completion_photos') => {
    try {
      await supabase.storage.from(BUCKET).remove([path]);
      const next = (task[field] || []).filter((p: string) => p !== path);
      const { error } = await supabase.from('operational_tasks').update({ [field]: next }).eq('id', task.id);
      if (error) throw error;
      invalidate();
    } catch (e: any) {
      toast({ title: 'Remove failed', description: e.message, variant: 'destructive' });
    }
  };

  const saveReceiptDetails = async () => {
    setSavingReceipt(true);
    try {
      const { error } = await supabase.from('operational_tasks').update({
        receipt_amount: receiptAmount ? parseFloat(receiptAmount) : null,
        receipt_vendor: receiptVendor || null,
        receipt_notes: receiptNotes || null,
      }).eq('id', task.id);
      if (error) throw error;
      toast({ title: 'Receipt details saved' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingReceipt(false);
    }
  };

  const saveFollowUp = async (markComplete: boolean) => {
    setSavingFollowUp(true);
    try {
      const { error } = await supabase.from('operational_tasks').update({
        follow_up_notes: followUpNotes || null,
        ...(markComplete ? { follow_up_completed: true } : {}),
      }).eq('id', task.id);
      if (error) throw error;
      toast({ title: markComplete ? 'Follow-up completed' : 'Follow-up notes saved' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingFollowUp(false);
    }
  };

  const openAttachment = async (path: string) => {
    const url = await signedUrl(path);
    if (url) window.open(url, '_blank');
  };

  const nothingRequired = !task.receipt_required && !task.photos_required && !task.follow_up_required;
  if (nothingRequired) return null;

  const receipts: string[] = task.receipt_urls || [];
  const photos: string[] = task.completion_photos || [];
  const receiptDone = task.receipt_required && receipts.length > 0;
  const photosDone = task.photos_required && photos.length > 0;
  const followUpDone = task.follow_up_required && !!task.follow_up_completed;

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Requirements</div>

      {/* RECEIPT */}
      {task.receipt_required && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Receipt Required</span>
              </div>
              {receiptDone ? (
                <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="h-3 w-3" /> Done</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>

            {receipts.length > 0 && (
              <ul className="space-y-1">
                {receipts.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs bg-muted/40 rounded p-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <button className="flex-1 text-left truncate text-primary underline" onClick={() => openAttachment(p)}>
                      {p.split('/').pop()}
                    </button>
                    <button onClick={() => removeFile(p, 'receipt_urls')} aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleReceiptUpload(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => receiptInputRef.current?.click()}
              disabled={uploadingReceipt}
            >
              {uploadingReceipt ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {receipts.length ? 'Add another receipt' : 'Photograph / upload receipt'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Amount ($)</Label>
                <Input type="number" step="0.01" min="0" value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px]">Vendor</Label>
                <Input value={receiptVendor} onChange={(e) => setReceiptVendor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Notes (optional)</Label>
              <Textarea rows={2} value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} />
            </div>
            <Button size="sm" variant="secondary" onClick={saveReceiptDetails} disabled={savingReceipt}>
              {savingReceipt ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save receipt details
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PHOTOS */}
      {task.photos_required && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Photos Required</span>
              </div>
              {photosDone ? (
                <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="h-3 w-3" /> {photos.length}</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <PhotoTile key={p} path={p} onRemove={() => removeFile(p, 'completion_photos')} />
                ))}
              </div>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
              Take / upload photo(s)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FOLLOW-UP */}
      {task.follow_up_required && (
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-medium">Follow-up Required</span>
              </div>
              {followUpDone ? (
                <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="h-3 w-3" /> Done</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            <Textarea
              rows={3}
              placeholder="Describe follow-up actions / completion notes…"
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => saveFollowUp(false)} disabled={savingFollowUp}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save progress
              </Button>
              {!followUpDone && (
                <Button size="sm" onClick={() => saveFollowUp(true)} disabled={savingFollowUp}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark follow-up complete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PhotoTile({ path, onRemove }: { path: string; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useState(() => {
    signedUrl(path).then(setUrl);
    return undefined as any;
  });
  return (
    <div className="relative aspect-square rounded overflow-hidden border bg-muted">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
        aria-label="Remove photo"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
