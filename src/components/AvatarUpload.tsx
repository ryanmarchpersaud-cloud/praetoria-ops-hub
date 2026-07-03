import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentUrl?: string | null;
  initials: string;
  onUploaded: (url: string) => void;
  size?: 'sm' | 'lg';
  className?: string;
}

export function AvatarUpload({ currentUrl, initials, onUploaded, size = 'lg', className }: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-lg';
  const cameraSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const badgeSize = size === 'lg' ? 'w-6 h-6 -bottom-0.5 -right-0.5' : 'w-5 h-5 -bottom-0.5 -right-0.5';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // avatars bucket is private — use a long-lived signed URL so <img> can render it.
      const { data: signed, error: signErr } = await supabase.storage
        .from('avatars')
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
      if (signErr) throw signErr;

      const url = `${signed.signedUrl}${signed.signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      onUploaded(url);
      toast.success('Photo updated!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={cn('relative rounded-full group', className)}
      disabled={uploading}
    >
      {currentUrl ? (
        <img
          src={currentUrl}
          alt="Profile"
          className={cn(sizeClasses, 'rounded-full object-cover border-2 border-primary-foreground/30')}
        />
      ) : (
        <div className={cn(
          sizeClasses,
          'rounded-full bg-primary-foreground/20 flex items-center justify-center font-bold border-2 border-primary-foreground/30'
        )}>
          {initials}
        </div>
      )}
      <div className={cn(
        badgeSize,
        'absolute rounded-full bg-primary-foreground/90 flex items-center justify-center shadow-sm',
        uploading && 'animate-pulse'
      )}>
        <Camera className={cn(cameraSize, 'text-primary')} />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </button>
  );
}
