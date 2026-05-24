import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { SignedVisitPhotoImg } from '@/components/SignedVisitPhotoImg';

const TAG_COLORS: Record<string, string> = {
  Before: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  After: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Issue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function PortalPhotos() {
  const { data: customer } = useCustomerProfile();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [filterTag, setFilterTag] = useState('all');

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['portal_photos', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('visit_photos')
        .select('*, visits(visit_number, service_date)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const filtered = filterTag === 'all' ? photos : photos.filter((p: any) => p.photo_tag === filterTag);
  const current = filtered[viewerIndex] as any;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Camera className="h-5 w-5" /> My Photos
      </h1>

      {/* Tag filters */}
      <div className="flex gap-1.5 flex-wrap">
        {['all', 'Before', 'After', 'Progress', 'Issue'].map(tag => (
          <button
            key={tag}
            onClick={() => setFilterTag(tag)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterTag === tag
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input hover:bg-muted'
            }`}
          >
            {tag === 'all' ? 'All' : tag}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No photos found.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filtered.map((photo: any, i: number) => (
            <button
              key={photo.id}
              onClick={() => { setViewerIndex(i); setViewerOpen(true); }}
              className="relative aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary/50 transition-all group"
            >
              <SignedVisitPhotoImg fileUrl={photo.file_url} alt={photo.caption || ''} className="w-full h-full object-cover" loading="lazy" />
              <span className={`absolute top-1.5 left-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded ${TAG_COLORS[photo.photo_tag] || ''}`}>
                {photo.photo_tag}
              </span>
              {photo.visits && (
                <span className="absolute bottom-1 right-1 text-[8px] bg-background/80 px-1 py-0.5 rounded">
                  {photo.visits.visit_number}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Viewer modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden mx-2 bg-black/95">
          {current && (
            <div className="relative">
              <div className="flex items-center justify-center min-h-[300px] max-h-[70vh]">
                <img src={current.file_url} alt={current.caption || ''} className="max-w-full max-h-[70vh] object-contain" />
              </div>
              {filtered.length > 1 && (
                <>
                  <button
                    onClick={() => setViewerIndex(Math.max(0, viewerIndex - 1))}
                    disabled={viewerIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 disabled:opacity-20"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewerIndex(Math.min(filtered.length - 1, viewerIndex + 1))}
                    disabled={viewerIndex === filtered.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 disabled:opacity-20"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="bg-background p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TAG_COLORS[current.photo_tag]}`}>
                    {current.photo_tag}
                  </span>
                  <span className="text-xs text-muted-foreground">{viewerIndex + 1}/{filtered.length}</span>
                </div>
                {current.caption && <p className="text-xs text-foreground">{current.caption}</p>}
                <p className="text-[10px] text-muted-foreground">
                  {current.visits?.visit_number} · {new Date(current.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
