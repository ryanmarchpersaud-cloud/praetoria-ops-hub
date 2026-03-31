import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useHRFiles(recordType: string, recordId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['hr_files', recordType, recordId],
    queryFn: async () => {
      if (!recordId) return [];
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('record_type', recordType)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!recordId,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!recordId || !user?.id) throw new Error('Missing context');
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${recordType}/${recordId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('hr-documents')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('hr-documents')
        .getPublicUrl(path);

      // For private buckets, use createSignedUrl pattern in component
      const { error: dbError } = await supabase.from('files').insert({
        file_name: file.name,
        file_url: path, // store path, not full URL
        file_type: ext,
        record_type: recordType,
        record_id: recordId,
        uploaded_by: user.id,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_files', recordType, recordId] }),
  });

  const remove = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from('hr-documents').remove([filePath]);
      const { error } = await supabase.from('files').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr_files', recordType, recordId] }),
  });

  return { files: query.data ?? [], isLoading: query.isLoading, upload, remove };
}
