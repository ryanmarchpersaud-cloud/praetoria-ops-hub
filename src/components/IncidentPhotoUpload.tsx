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
  Clock,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { downscaleImageIfLarge, iosLog, isIOSWebView, yieldToBrowser } from '@/lib/iosDebug';
import { isIOSNative } from '@/lib/platform';

// See VisitPhotoGallery: hide the dedicated "Take Photo" shortcut on
// native iOS to avoid the WKWebView crash observed during Apple review
// on iPadOS 26.5. Users can still take a photo via the gallery picker.
const HIDE_DIRECT_CAMERA = isIOSNative();

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
  /** Notifies parent when uploads are active or a deferred iOS batch is pending,
   *  so the submit button can be disabled to prevent double-submits. */
  onBusyChange?: (busy: boolean) => void;
}

type IosBatchItem = {
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'failed';
  error?: string;
};

type IosBatchState = {
  kind: 'photo' | 'document';
  items: IosBatchItem[];
  pendingCount: number; // files the user picked but we deferred past the cap
  totalPicked: number;
} | null;

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

const GALLERY_ACCEPT = 'image/*';
const DOC_ACCEPT = 'application/pdf,.pdf,image/*,.heic,.heif';
const NATIVE_PICKER_INPUT_CLASS = 'absolute h-px w-px overflow-hidden opacity-0';

export default function IncidentPhotoUpload({
  photos,
  onPhotosChange,
  attachments = [],
  onAttachmentsChange,
  maxPhotos = 5,
  maxAttachments = 10,
  onBusyChange,
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
  const [iosBatch, setIosBatch] = useState<IosBatchState>(null);
  const isIOS = isIOSWebView();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep parent informed so the submit button can lock while uploads/pending
  // batches are still in flight on iOS.
  const hasPendingIosBatch = !!iosBatch && iosBatch.pendingCount > 0;
  const busy = uploading || docUploading || hasPendingIosBatch;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

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

    // iOS WKWebView can OOM-crash when decoding many full-resolution photos
    // back-to-back. Cap the batch on iOS and ask the user to add more after.
    const iosBatchCap = isIOS ? 3 : remaining;
    const batchSize = Math.min(remaining, iosBatchCap);
    const toUpload = Array.from(files).slice(0, batchSize);
    const deferredCount = isIOS ? Math.max(0, files.length - batchSize) : 0;

    if (isIOS) {
      // Seed the per-file iOS progress card so the user sees exactly what's
      // queued and what's still waiting after the first batch finishes.
      setIosBatch({
        kind: 'photo',
        items: toUpload.map((f) => ({ name: f.name, status: 'pending' })),
        pendingCount: deferredCount,
        totalPicked: files.length,
      });
      if (deferredCount > 0) {
        toast({
          title: `Uploading first ${batchSize} of ${files.length} photos`,
          description: `iPhone limits how many large photos can be processed at once. The remaining ${deferredCount} will stay queued — submit is locked until they're added.`,
        });
      }
    }
    setUploading(true);
    setStatus(null);

    let successCount = 0;
    const failures: string[] = [];

    try {
      const newUrls: string[] = [];
      for (let idx = 0; idx < toUpload.length; idx++) {
        const rawFile = toUpload[idx];
        if (isIOS) {
          setIosBatch((prev) => prev && {
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, status: 'uploading' } : it),
          });
        }

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
          if (isIOS) {
            setIosBatch((prev) => prev && {
              ...prev,
              items: prev.items.map((it, i) => i === idx ? { ...it, status: 'failed', error: 'over 10 MB' } : it),
            });
          }
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
          if (isIOS) {
            setIosBatch((prev) => prev && {
              ...prev,
              items: prev.items.map((it, i) => i === idx ? { ...it, status: 'failed', error: uploadError.message } : it),
            });
          }
          continue;
        }

        const { data: urlData } = await supabase.storage.from('attachments').createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (urlData?.signedUrl) newUrls.push(urlData.signedUrl);
        successCount += 1;
        if (isIOS) {
          setIosBatch((prev) => prev && {
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, status: 'done' } : it),
          });
        }

        // Yield to the event loop between photos so iOS WKWebView can
        // reclaim graphics memory before the next decode.
        await yieldToBrowser(50);
      }

      if (!isMountedRef.current) return;

      if (newUrls.length > 0) {
        onPhotosChange([...photos, ...newUrls].filter(Boolean));
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
      // If there are no deferred files left, clear the iOS batch card after a
      // short delay so the user can see the final per-file results.
      if (isIOS && deferredCount === 0 && isMountedRef.current) {
        window.setTimeout(() => {
          if (isMountedRef.current) setIosBatch(null);
        }, 4000);
      }
    }
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!onAttachmentsChange) return;

    iosLog('incident:file:attach', { count: files.length });

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

    const iosBatchCap = isIOS ? 3 : remaining;
    const batchSize = Math.min(remaining, iosBatchCap);
    const toUpload = Array.from(files).slice(0, batchSize);
    const deferredCount = isIOS ? Math.max(0, files.length - batchSize) : 0;

    if (isIOS) {
      setIosBatch({
        kind: 'document',
        items: toUpload.map((f) => ({ name: f.name, status: 'pending' })),
        pendingCount: deferredCount,
        totalPicked: files.length,
      });
      if (deferredCount > 0) {
        toast({
          title: `Uploading first ${batchSize} of ${files.length} files`,
          description: `iPhone limits how many large files can be processed at once. The remaining ${deferredCount} will stay queued — submit is locked until they're added.`,
        });
      }
    }
    setDocUploading(true);
    setStatus(null);

    let successCount = 0;
    const failures: string[] = [];
    const newAttachments: IncidentAttachment[] = [];

    try {
      for (let idx = 0; idx < toUpload.length; idx++) {
        const rawFile = toUpload[idx];
        if (isIOS) {
          setIosBatch((prev) => prev && {
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, status: 'uploading' } : it),
          });
        }

        // Compress image documents (insurance card photos, licence shots,
        // damage photos) before upload so iPhone HEIC/JPEG don't stall.
        // Leave PDFs and other docs untouched.
        let file = rawFile;
        if (rawFile.type.startsWith('image/')) {
          try {
            file = await downscaleImageIfLarge(rawFile);
          } catch {
            file = rawFile;
          }
        }

        const markFailed = (msg: string) => {
          failures.push(`${file.name}: ${msg}`);
          if (isIOS) {
            setIosBatch((prev) => prev && {
              ...prev,
              items: prev.items.map((it, i) => i === idx ? { ...it, status: 'failed', error: msg } : it),
            });
          }
        };

        if (file.size > 25 * 1024 * 1024) {
          markFailed('exceeds 25 MB');
          continue;
        }

        const safeName = file.name.replace(/[^\w.\-]+/g, '_');
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('incident-attachments')
          .upload(path, file, { upsert: false, contentType: file.type || undefined });

        if (uploadError) {
          markFailed(uploadError.message);
          continue;
        }

        const { data: signed, error: signedError } = await supabase.storage
          .from('incident-attachments')
          .createSignedUrl(path, 60 * 60 * 24 * 7);

        if (signedError || !signed?.signedUrl) {
          markFailed('could not generate access link');
          continue;
        }

        newAttachments.push({
          url: signed.signedUrl,
          path,
          name: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          category: pendingCategory,
        });
        successCount += 1;
        if (isIOS) {
          setIosBatch((prev) => prev && {
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, status: 'done' } : it),
          });
        }
        await yieldToBrowser(50);
      }

      if (!isMountedRef.current) return;

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
      iosLog('incident:file:done', { successCount, failures: failures.length });
    } catch (err: any) {
      iosLog('incident:file:error', { message: err?.message });
      if (isMountedRef.current) {
        showStatus({ type: 'error', text: err?.message || 'Upload error' });
        toast({ title: 'Upload error', description: err?.message || 'Upload error', variant: 'destructive' });
      }
    } finally {
      if (isMountedRef.current) setDocUploading(false);
      if (docRef.current) docRef.current.value = '';
      if (isIOS && deferredCount === 0 && isMountedRef.current) {
        window.setTimeout(() => {
          if (isMountedRef.current) setIosBatch(null);
        }, 4000);
      }
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

        {/* Hidden native inputs — kept mounted at all times so the file
            picker dialog can return a file even after the panel collapses.
            Mounting them inside the collapsible block (previous behavior)
            unmounted the input on click, which dropped the onChange event
            on iOS Safari and Android Chrome. */}
        <input
          ref={cameraRef}
          name="incident-camera-upload"
          type="file"
          accept={GALLERY_ACCEPT}
          {...(HIDE_DIRECT_CAMERA ? {} : { capture: 'environment' as any })}
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
              {!HIDE_DIRECT_CAMERA && (
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
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={uploadDisabled || anyUploadBusy}
                onClick={() => triggerNativePicker(galleryRef)}
              >
                <ImagePlus className="h-4 w-4 mr-2 shrink-0" />
                <span className="min-w-0 flex-1 text-left">Choose from Gallery / Photo Library</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={docDisabled || anyUploadBusy}
                onClick={() => triggerNativePicker(docRef)}
              >
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                <span className="min-w-0 flex-1 text-left">Upload File / Document</span>
              </Button>
            </div>
          )}
        </div>

        {iosBatch && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                iPhone upload batch
              </p>
              <span className="text-[10px] text-muted-foreground">
                {iosBatch.items.filter(i => i.status === 'done').length}/{iosBatch.items.length} in this batch
              </span>
            </div>
            <Progress
              value={
                iosBatch.items.length === 0
                  ? 0
                  : (iosBatch.items.filter(i => i.status === 'done' || i.status === 'failed').length /
                      iosBatch.items.length) * 100
              }
              className="h-1.5"
            />
            <ul className="space-y-1">
              {iosBatch.items.map((it, i) => (
                <li key={`${it.name}-${i}`} className="flex items-center gap-2 text-[11px]">
                  {it.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                  {it.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
                  {it.status === 'pending' && <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  {it.status === 'failed' && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                  <span className="truncate flex-1">{it.name}</span>
                  {it.status === 'failed' && it.error && (
                    <span className="text-destructive truncate max-w-[40%]">{it.error}</span>
                  )}
                </li>
              ))}
            </ul>
            {iosBatch.pendingCount > 0 ? (
              <div className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="flex-1 space-y-1">
                  <p className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">
                    {iosBatch.pendingCount} more {iosBatch.kind === 'photo' ? 'photo' : 'file'}
                    {iosBatch.pendingCount === 1 ? '' : 's'} still need to be added.
                    Submit is locked until they're uploaded or you skip them.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      disabled={anyUploadBusy}
                      onClick={() => triggerNativePicker(iosBatch.kind === 'photo' ? galleryRef : docRef)}
                    >
                      Add next batch
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px]"
                      onClick={() => setIosBatch(null)}
                    >
                      Skip remaining
                    </Button>
                  </div>
                </div>
              </div>
            ) : !anyUploadBusy ? (
              <p className="text-[11px] text-muted-foreground">Batch complete — you can submit the report.</p>
            ) : null}
          </div>
        )}

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
