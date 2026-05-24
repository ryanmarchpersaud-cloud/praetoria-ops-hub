import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Extract the storage path from either a full public URL or a raw path. */
export function extractVisitPhotoPath(fileUrl: string): string | null {
  if (!fileUrl) return null;
  const marker = '/visit-photos/';
  const idx = fileUrl.indexOf(marker);
  if (idx >= 0) {
    try { return decodeURIComponent(fileUrl.slice(idx + marker.length)); } catch { return fileUrl.slice(idx + marker.length); }
  }
  // Already a path (no scheme)
  if (!/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return null;
}

/** React hook: returns a short-lived signed URL for a visit-photos file. */
export function useSignedVisitPhotoUrl(fileUrl?: string | null, expiresIn = 3600) {
  const [signed, setSigned] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!fileUrl) { setSigned(null); return; }
    const path = extractVisitPhotoPath(fileUrl);
    if (!path) { setSigned(fileUrl); return; }
    supabase.storage.from('visit-photos').createSignedUrl(path, expiresIn).then(({ data }) => {
      if (!cancelled) setSigned(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [fileUrl, expiresIn]);
  return signed;
}

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  fileUrl: string;
}

/** Drop-in <img> replacement for visit photos backed by the private bucket. */
export function SignedVisitPhotoImg({ fileUrl, ...rest }: Props) {
  const url = useSignedVisitPhotoUrl(fileUrl);
  if (!url) {
    return <div {...(rest as any)} aria-label="Loading photo" />;
  }
  return <img src={url} {...rest} />;
}
