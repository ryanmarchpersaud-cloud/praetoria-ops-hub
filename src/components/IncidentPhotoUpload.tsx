import { useId, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Loader2, CheckCircle2, AlertCircle, ImagePlus, FileText, Paperclip, FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type IncidentAttachment = {
  url: string;
  path: string;        // storage path inside incident-attachments
  name: string;
  mime: string;
  size: number;
  category: string;    // Insurance, Driver's Licence, etc.
};

interface IncidentPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  attachments?: IncidentAttachment[];
  onAttachmentsChange?: (attachments: IncidentAttachment[]) => void;
  maxPhotos?: number;
  maxAttachments?: number;
}

type StatusMessage =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

const ATTACHMENT_CATEGORIES = [
  'Insurance',
  "Driver's Licence",
  'Vehicle Registration',
  'Damage Photos',
  'Police / Incident Document',
  'Witness Document',
  'Towing Receipt',
  'Other',
];

const DOC_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';

export default function IncidentPhotoUpload({
  photos,
  onPhotosChange,
  attachments = [],
  onAttachmentsChange,
  maxPhotos = 5,
  maxAttachments = 10,
}: IncidentPhotoUploadProps) {
  const { toast } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const cameraInputId = useId();
  const galleryInputId = useId();
  const docInputId = useId();
  const [uploading, setUploading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [pendingCategory, setPendingCategory] = useState<string>('Insurance');

  const showStatus = (msg: StatusMessage) => {
    setStatus(msg);
    if (msg) {
      window.setTimeout(() => {
        setStatus((current) => (current === msg ? null : current));
      }, 5000);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      const text = `Maximum ${maxPhotos} photos allowed`;
      showStatus({ type: 'error', text });
      toast({ title: text, variant: 'destructive' });
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setStatus(null);

    let successCount = 0;
    const failures: string[] = [];

    try {
      const newUrls: string[] = [];
      for (const file of toUpload) {
        if (file.size > 10 * 1024 * 1024) {
          failures.push(`${file.name}: exceeds 10 MB`);
          toast({ title: `${file.name} exceeds 10 MB limit`, variant: 'destructive' });
          continue;
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const path = `incidents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, file, { upsert: false });

        if (uploadError) {
          failures.push(`${file.name}: ${uploadError.message}`);
          toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
          continue;
        }

        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
        successCount += 1;
      }

      if (newUrls.length > 0) {
        onPhotosChange([...photos, ...newUrls]);
      }

      if (successCount > 0 && failures.length === 0) {
        showStatus({
          type: 'success',
          text: `${successCount} photo${successCount === 1 ? '' : 's'} uploaded successfully`,
        });
      } else if (successCount > 0 && failures.length > 0) {
        showStatus({
          type: 'error',
          text: `${successCount} uploaded, ${failures.length} failed: ${failures.join('; ')}`,
        });
      } else if (failures.length > 0) {
        showStatus({ type: 'error', text: `Upload failed: ${failures.join('; ')}` });
      }
    } catch (err: any) {
      const text = err?.message || 'Upload error';
      showStatus({ type: 'error', text });
      toast({ title: 'Upload error', description: text, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!onAttachmentsChange) return;

    const remaining = maxAttachments - attachments.length;
    if (remaining <= 0) {
      const text = `Maximum ${maxAttachments} documents allowed`;
      showStatus({ type: 'error', text });
      toast({ title: text, variant: 'destructive' });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      toast({ title: 'You must be signed in to upload documents', variant: 'destructive' });
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setDocUploading(true);
    setStatus(null);

    let successCount = 0;
    const failures: string[] = [];
    const newAttachments: IncidentAttachment[] = [];

    try {
      for (const file of toUpload) {
        if (file.size > 25 * 1024 * 1024) {
          failures.push(`${file.name}: exceeds 25 MB`);
          continue;
        }
        const ext = file.name.split('.').pop() || 'bin';
        const safeName = file.name.replace(/[^\w.\-]+/g, '_');
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('incident-attachments')
          .upload(path, file, { upsert: false, contentType: file.type || undefined });

        if (uploadError) {
          failures.push(`${file.name}: ${uploadError.message}`);
          continue;
        }

        // Signed URL valid for ~7 days for in-flight viewing; admin will regenerate fresh signed URLs server-side.
        const { data: signed } = await supabase.storage
          .from('incident-attachments')
          .createSignedUrl(path, 60 * 60 * 24 * 7);

        newAttachments.push({
          url: signed?.signedUrl || '',
          path,
          name: file.name,
          mime: file.type || ext,
          size: file.size,
          category: pendingCategory,
        });
        successCount += 1;
      }

      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
      }
      if (successCount > 0 && failures.length === 0) {
        showStatus({ type: 'success', text: `${successCount} document${successCount === 1 ? '' : 's'} attached` });
      } else if (failures.length > 0) {
        showStatus({ type: 'error', text: `Some uploads failed: ${failures.join('; ')}` });
      }
    } catch (err: any) {
      showStatus({ type: 'error', text: err?.message || 'Upload error' });
    } finally {
      setDocUploading(false);
      if (docRef.current) docRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const removeAttachment = async (index: number) => {
    if (!onAttachmentsChange) return;
    const att = attachments[index];
    // Best-effort delete from storage
    if (att?.path) {
      try {
        await supabase.storage.from('incident-attachments').remove([att.path]);
      } catch { /* ignore */ }
    }
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const updateAttachmentCategory = (index: number, category: string) => {
    if (!onAttachmentsChange) return;
    onAttachmentsChange(attachments.map((a, i) => (i === index ? { ...a, category } : a)));
  };

  const uploadDisabled = photos.length >= maxPhotos;
  const docDisabled = attachments.length >= maxAttachments;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photos</p>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border">
                <img src={url} alt={`Incident photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploading ? (
          <Button type="button" variant="outline" className="w-full" disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input
              id={cameraInputId}
              ref={cameraRef}
              type="file"
              accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              disabled={uploadDisabled}
              aria-label="Take photo"
              className="sr-only"
              onChange={handleFileSelect}
            />
            <label
              htmlFor={cameraInputId}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full cursor-pointer',
                uploadDisabled && 'pointer-events-none opacity-50'
              )}
            >
              <Camera className="h-4 w-4 mr-2" />Take Photo
            </label>

            <input
              id={galleryInputId}
              ref={galleryRef}
              type="file"
              accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              disabled={uploadDisabled}
              aria-label="Choose photos from gallery"
              className="sr-only"
              onChange={handleFileSelect}
            />
            <label
              htmlFor={galleryInputId}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full cursor-pointer',
                uploadDisabled && 'pointer-events-none opacity-50'
              )}
            >
              <ImagePlus className="h-4 w-4 mr-2" />Gallery
            </label>
          </div>
        )}
        {photos.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">{photos.length}/{maxPhotos} photos added</p>
        )}

        {/* Documents section */}
        {onAttachmentsChange && (
          <>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Documents <span className="font-normal normal-case">(PDF, photos of IDs, insurance, etc.)</span>
                </p>
              </div>

              {attachments.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {attachments.map((att, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2"
                    >
                      {att.mime?.startsWith('image/') ? (
                        <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{att.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(att.size / 1024).toFixed(0)} KB · {att.mime || 'file'}
                        </p>
                      </div>
                      <Select
                        value={att.category}
                        onValueChange={(v) => updateAttachmentCategory(i, v)}
                      >
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ATTACHMENT_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        aria-label={`Remove ${att.name}`}
                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Select value={pendingCategory} onValueChange={setPendingCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Category for next upload" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTACHMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {docUploading ? (
                  <Button type="button" variant="outline" disabled className="h-9">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…
                  </Button>
                ) : (
                  <>
                    <input
                      id={docInputId}
                      ref={docRef}
                      type="file"
                      accept={DOC_ACCEPT}
                      multiple
                      disabled={docDisabled}
                      aria-label="Attach documents"
                      className="sr-only"
                      onChange={handleDocSelect}
                    />
                    <label
                      htmlFor={docInputId}
                      className={cn(
                        buttonVariants({ variant: 'outline' }),
                        'cursor-pointer h-9',
                        docDisabled && 'pointer-events-none opacity-50'
                      )}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />Attach
                    </label>
                  </>
                )}
              </div>
              {attachments.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  {attachments.length}/{maxAttachments} documents attached
                </p>
              )}
            </div>
          </>
        )}

        {status && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-start gap-2 rounded-md border p-2 text-xs ${
              status.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <span className="leading-snug">{status.text}</span>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          Photos: up to {maxPhotos} · 10 MB each · Documents: PDF/JPG/PNG/HEIC up to 25 MB · Stored securely
        </p>
      </CardContent>
    </Card>
  );
}
