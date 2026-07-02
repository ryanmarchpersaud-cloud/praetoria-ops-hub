import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera, X, Loader2, Upload } from 'lucide-react';

interface PropertyPhotoUploadProps {
  propertyId: string;
  label: string;
  currentUrl: string | null;
  photoKey: 'photo_front_url' | 'photo_winter_url' | 'photo_night_url';
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

export function PropertyPhotoUpload({ propertyId, label, currentUrl, photoKey, onUploaded, onRemoved }: PropertyPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${propertyId}/${photoKey}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData, error: signErr } = await supabase.storage.from('property-photos').createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      onUploaded(urlData.signedUrl);
      toast({ title: `${label} photo uploaded` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (currentUrl) {
      const parts = currentUrl.split('/property-photos/');
      if (parts.length > 1) {
        await supabase.storage.from('property-photos').remove([decodeURIComponent(parts[1])]);
      }
    }
    onRemoved();
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {currentUrl ? (
        <div className="relative w-full h-28 rounded-lg overflow-hidden border bg-muted group">
          <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button variant="destructive" size="sm" onClick={handleRemove} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Remove
            </Button>
          </div>
          <span className="absolute bottom-1 left-1 text-[9px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded">{label}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-[11px]">Upload {label}</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
