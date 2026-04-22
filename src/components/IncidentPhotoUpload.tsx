import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Camera,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
  FileText,
  Paperclip,
  FileIcon,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downscaleImageIfLarge, iosLog } from '@/lib/iosDebug';

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

const GALLERY_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/*';
const DOC_ACCEPT = 'application/pdf,image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif';
const NATIVE_PICKER_INPUT_CLASS = 'pointer-events-none fixed -left-[9999px] top-auto h-px w-px opacity-0';

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
  const isMountedRef = useRef(true);
  const [uploading, setUploading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [pendingCategory, setPendingCategory] = useState<string>('Insurance');
  const [showAddMoreOptions, setShowAddMoreOptions] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const showStatus = (msg: StatusMessage) => {
    setStatus(msg);
    if (msg) {
      window.setTimeout(() => {
        setStatus((current) => (current === msg ? null : current));
      }, 5000);
    }
  };

  const triggerNativePicker = (ref: React.RefObject<HTMLInputElement>) => {
    const input = ref.current;
    if (!input) return;

    const which =
      ref === cameraRef ? 'camera' : ref === galleryRef ? 'gallery' : 'document';
    iosLog(`incident:${which}:tap`);

    try {
      input.value = '';
      input.click();
      setShowAddMoreOptions(false);
      setStatus(null);
    } catch (err) {
      console.error('Failed to open incident attachment picker', err);
      const text = 'Could not open the file picker on this device. Please try again.';
      showStatus({ type: 'error', text });
      toast({ title: 'Attachment picker failed', description: text, variant: 'destructive' });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    iosLog('incident:photo:select', { count: files.length });

    const totalCount = photos.length + attachments.length;
    const remaining = totalMaxAttachments - totalCount;
    if (remaining <= 0) {
      const text = `Maximum ${totalMaxAttachments} total attachments allowed`;
      showStatus({ type: 'error', text });
      toast({ title: text, variant: 'destructive' });
      e.target.value = '';
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setStatus(null);

    let successCount = 0;
    const failures: string[] = [];

    try {
      const newUrls: string[] = [];
      for (const rawFile of toUpload) {
        // iPhone photos (HEIC/large JPEG) are 4–8 MB and freeze Safari on
        // serial uploads. Downscale on the main thread before uploading.
        let file = rawFile;
        try {
          file = await downscaleImageIfLarge(rawFile);
          iosLog('incident:photo:resized', {
            from: rawFile.size,
            to: file.size,
            name: file.name,
          });
        } catch {
          file = rawFile;
        }

        if (file.size > 10 * 1024 * 1024) {
          failures.push(`${file.name}: exceeds 10 MB`);
          toast({ title: `${file.name} exceeds 10 MB limit`, variant: 'destructive' });
          continue;
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const path = `incidents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, file, { upsert: false, contentType: file.type || undefined });

        if (uploadError) {
          failures.push(`${file.name}: ${uploadError.message}`);
          toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
          continue;
        }

        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
        successCount += 1;
      }

      if (!isMountedRef.current) return;

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
      iosLog('incident:photo:done', { successCount, failures: failures.length });
    } catch (err: any) {
      const text = err?.message || 'Upload error';
      iosLog('incident:photo:error', { message: text });
      if (isMountedRef.current) {
        showStatus({ type: 'error', text });
        toast({ title: 'Upload error', description: text, variant: 'destructive' });
      }
    } finally {
      if (isMountedRef.current) setUploading(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!onAttachmentsChange) return;

    const totalCount = photos.length + attachments.length;
    const remaining = totalMaxAttachments - totalCount;
    if (remaining <= 0) {
      const text = `Maximum ${totalMaxAttachments} total attachments allowed`;
      showStatus({ type: 'error', text });
      toast({ title: text, variant: 'destructive' });
      e.target.value = '';
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      toast({ title: 'You must be signed in to upload documents', variant: 'destructive' });
      e.target.value = '';
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

        const safeName = file.name.replace(/[^\w.\-]+/g, '_');
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('incident-attachments')
          .upload(path, file, { upsert: false, contentType: file.type || undefined });

        if (uploadError) {
          failures.push(`${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: signed } = await supabase.storage
          .from('incident-attachments')
          .createSignedUrl(path, 60 * 60 * 24 * 7);

        newAttachments.push({
          url: signed?.signedUrl || '',
          path,
          name: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          category: pendingCategory,
        });
        successCount += 1;
      }

      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
      }

      if (successCount > 0 && failures.length === 0) {
        showStatus({ type: 'success', text: `${successCount} file${successCount === 1 ? '' : 's'} attached` });
      } else if (successCount > 0 && failures.length > 0) {
        showStatus({
          type: 'error',
          text: `${successCount} attached, ${failures.length} failed: ${failures.join('; ')}`,
        });
      } else if (failures.length > 0) {
        showStatus({ type: 'error', text: `Upload failed: ${failures.join('; ')}` });
      }
    } catch (err: any) {
      showStatus({ type: 'error', text: err?.message || 'Upload error' });
      toast({ title: 'Upload error', description: err?.message || 'Upload error', variant: 'destructive' });
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
    if (att?.path) {
      try {
        await supabase.storage.from('incident-attachments').remove([att.path]);
      } catch {
        // Ignore storage cleanup failures during pre-submit removal.
      }
    }
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const updateAttachmentCategory = (index: number, category: string) => {
    if (!onAttachmentsChange) return;
    onAttachmentsChange(attachments.map((a, i) => (i === index ? { ...a, category } : a)));
  };

  const totalMaxAttachments = Math.min(maxPhotos, maxAttachments);
  const totalCount = photos.length + attachments.length;
  const uploadDisabled = totalCount >= totalMaxAttachments;
  const docDisabled = totalCount >= totalMaxAttachments;
  const anyUploadBusy = uploading || docUploading;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incident Attachments</p>
          <p className="text-xs text-muted-foreground">
            Add photos from the camera, choose existing images from the gallery, or upload PDFs and other incident files.
          </p>
        </div>

        <input
          ref={cameraRef}
          name="incident-camera-upload"
          type="file"
          accept={GALLERY_ACCEPT}
          capture="environment"
          disabled={uploadDisabled}
          aria-label="Take photo"
          className={NATIVE_PICKER_INPUT_CLASS}
          onChange={handleFileSelect}
        />

        <input
          ref={galleryRef}
          name="incident-gallery-upload"
          type="file"
          accept={GALLERY_ACCEPT}
          multiple
          disabled={uploadDisabled}
          aria-label="Choose photos from gallery"
          className={NATIVE_PICKER_INPUT_CLASS}
          onChange={handleFileSelect}
        />

        <input
          ref={docRef}
          name="incident-document-upload"
          type="file"
          accept={DOC_ACCEPT}
          multiple
          disabled={docDisabled}
          aria-label="Upload file or document"
          className={NATIVE_PICKER_INPUT_CLASS}
          onChange={handleDocSelect}
        />

        <div className="space-y-2">
          <Select value={pendingCategory} onValueChange={setPendingCategory}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Category for next file upload" />
            </SelectTrigger>
            <SelectContent>
              {ATTACHMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            disabled={anyUploadBusy || (uploadDisabled && docDisabled)}
            onClick={() => setShowAddMoreOptions((prev) => !prev)}
          >
            <span className="flex items-center gap-2">
              {anyUploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              {totalCount > 0 ? `Add More (${totalCount}/${totalMaxAttachments})` : 'Add Attachment'}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAddMoreOptions ? 'rotate-180' : ''}`} />
          </Button>

          {showAddMoreOptions && (
            <div className="grid gap-2 rounded-md border border-border bg-muted/20 p-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={uploadDisabled || anyUploadBusy}
                onClick={() => triggerNativePicker(cameraRef)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={uploadDisabled || anyUploadBusy}
                onClick={() => triggerNativePicker(galleryRef)}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Choose from Gallery / Photo Library
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={docDisabled || anyUploadBusy}
                onClick={() => triggerNativePicker(docRef)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload File / Document
              </Button>
            </div>
          )}
        </div>

        {photos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Photos ({photos.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border">
                  <img src={url} alt={`Incident photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {onAttachmentsChange && attachments.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Files & Documents ({attachments.length})
            </p>
            <ul className="space-y-2">
              {attachments.map((att, i) => {
                const isImage = att.mime?.startsWith('image/');
                return (
                  <li
                    key={`${att.path}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2"
                  >
                    {isImage && att.url ? (
                      <img
                        src={att.url}
                        alt={att.name}
                        className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
                      />
                    ) : isImage ? (
                      <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{att.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(att.size / 1024).toFixed(0)} KB · {att.mime || 'file'}
                      </p>
                    </div>
                    <Select value={att.category} onValueChange={(v) => updateAttachmentCategory(i, v)}>
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
                );
              })}
            </ul>
          </div>
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
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="leading-snug">{status.text}</span>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground">
          Total attachments: up to {totalMaxAttachments} · Photos: JPG, PNG, HEIC · Files: PDF, JPG, PNG, HEIC · Stored securely
        </p>
      </CardContent>
    </Card>
  );
}
