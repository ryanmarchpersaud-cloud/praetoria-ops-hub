import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, ImagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IncidentPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function IncidentPhotoUpload({ photos, onPhotosChange, maxPhotos = 5 }: IncidentPhotoUploadProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      toast({ title: `Maximum ${maxPhotos} photos allowed`, variant: 'destructive' });
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of toUpload) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: `${file.name} exceeds 10 MB limit`, variant: 'destructive' });
          continue;
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const path = `incidents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, file, { upsert: false });

        if (uploadError) {
          toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
          continue;
        }

        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        onPhotosChange([...photos, ...newUrls]);
      }
    } catch (err: any) {
      toast({ title: 'Upload error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

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

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={uploading || photos.length >= maxPhotos}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
          ) : (
            <><Camera className="h-4 w-4 mr-2" />{photos.length === 0 ? 'Add Photos' : `Add More (${photos.length}/${maxPhotos})`}</>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Up to {maxPhotos} photos · Max 10 MB each · Camera or gallery
        </p>
      </CardContent>
    </Card>
  );
}
