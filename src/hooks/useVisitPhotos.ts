import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PHOTO_TAGS = ['Before', 'After', 'Progress', 'Issue'] as const;
export type PhotoTag = typeof PHOTO_TAGS[number];
export { PHOTO_TAGS };

export function useVisitPhotos(visitId: string | undefined) {
  return useQuery({
    queryKey: ['visit_photos', visitId],
    queryFn: async () => {
      if (!visitId) return [];
      const { data, error } = await supabase
        .from('visit_photos')
        .select('*')
        .eq('visit_id', visitId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });
}

export function useUploadVisitPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      visitId,
      propertyId,
      customerId,
      photoTag,
      caption,
    }: {
      file: File;
      visitId: string;
      propertyId?: string | null;
      customerId?: string | null;
      photoTag: PhotoTag;
      caption?: string;
    }) => {
      // Defensive: empty file = nothing to upload (iOS WKWebView camera quirk)
      if (!file || file.size === 0) {
        throw new Error('Photo is empty. Please retake the photo and try again.');
      }

      // Sanitize extension — fall back to jpg if filename has no dot
      const rawExt = file.name.includes('.') ? file.name.split('.').pop()! : 'jpg';
      const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const filePath = `${visitId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Upload to storage with up to 3 attempts (handles flaky cellular)
      let lastErr: any = null;
      let uploaded = false;
      for (let attempt = 0; attempt < 3 && !uploaded; attempt++) {
        const { error: uploadError } = await supabase.storage
          .from('visit-photos')
          .upload(filePath, file, {
            upsert: false,
            contentType: file.type || `image/${ext}`,
          });
        if (!uploadError) { uploaded = true; break; }
        lastErr = uploadError;
        // Don't retry on permission / duplicate errors
        const msg = (uploadError.message || '').toLowerCase();
        if (msg.includes('row-level security') || msg.includes('duplicate') || msg.includes('exists')) break;
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      }
      if (!uploaded) {
        throw new Error(`Photo upload failed: ${lastErr?.message || 'network error'}. Check your signal and try again.`);
      }

      const { data: urlData } = supabase.storage
        .from('visit-photos')
        .getPublicUrl(filePath);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert DB record — if this fails, roll back the storage object
      const { data, error } = await supabase.from('visit_photos').insert({
        visit_id: visitId,
        property_id: propertyId || null,
        customer_id: customerId || null,
        file_url: urlData.publicUrl,
        file_name: file.name,
        photo_tag: photoTag as any,
        caption: caption || null,
        uploaded_by: user?.id || null,
      }).select().single();
      if (error) {
        // Roll back the orphaned storage object
        try { await supabase.storage.from('visit-photos').remove([filePath]); } catch { /* ignore */ }
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('row-level security') || msg.includes('policy')) {
          throw new Error('You are not assigned to this visit, so photos cannot be saved. Ask dispatch to add you to the crew.');
        }
        throw new Error(`Could not save photo: ${error.message}`);
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['visit_photos', variables.visitId] });
    },
  });
}

export function useDeleteVisitPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fileUrl, visitId }: { id: string; fileUrl: string; visitId: string }) => {
      // Extract path from URL
      const urlParts = fileUrl.split('/visit-photos/');
      if (urlParts.length > 1) {
        const path = decodeURIComponent(urlParts[1]);
        await supabase.storage.from('visit-photos').remove([path]);
      }
      const { error } = await supabase.from('visit_photos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['visit_photos', variables.visitId] });
    },
  });
}
