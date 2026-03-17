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
      // Upload file to storage
      const ext = file.name.split('.').pop();
      const filePath = `${visitId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('visit-photos')
        .upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('visit-photos')
        .getPublicUrl(filePath);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert record
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
      if (error) throw error;
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
