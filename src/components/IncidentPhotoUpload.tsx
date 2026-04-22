import { useId, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Camera, X, Loader2, CheckCircle2, AlertCircle, ImagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface IncidentPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

type StatusMessage =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

export default function IncidentPhotoUpload({ photos, onPhotosChange, maxPhotos = 5 }: IncidentPhotoUploadProps) {
  const { toast } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraInputId = useId();
  const galleryInputId = useId();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(null);

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

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const uploadDisabled = photos.length >= maxPhotos;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
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
          Up to {maxPhotos} photos · Max 10 MB each · Camera or gallery
        </p>
      </CardContent>
    </Card>
  );
}
