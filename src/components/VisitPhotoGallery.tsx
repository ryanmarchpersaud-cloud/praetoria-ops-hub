import { useState, useRef } from 'react';
import { useVisitPhotos, useUploadVisitPhoto, useDeleteVisitPhoto, PHOTO_TAGS, PhotoTag } from '@/hooks/useVisitPhotos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, X, Trash2, ChevronLeft, ChevronRight, ImageIcon, Tag } from 'lucide-react';

const TAG_COLORS: Record<string, string> = {
  Before: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  After: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Issue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

interface VisitPhotoGalleryProps {
  visitId: string;
  propertyId?: string | null;
  customerId?: string | null;
}

export function VisitPhotoGallery({ visitId, propertyId, customerId }: VisitPhotoGalleryProps) {
  const { data: photos = [], isLoading } = useVisitPhotos(visitId);
  const uploadPhoto = useUploadVisitPhoto();
  const deletePhoto = useDeleteVisitPhoto();
  const { toast } = useToast();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [selectedTag, setSelectedTag] = useState<PhotoTag>('After');
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filterTag, setFilterTag] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPhotos = filterTag === 'all'
    ? photos
    : (photos as any[]).filter((p: any) => p.photo_tag === filterTag);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = (photos as any[]).length + files.length;
    if (totalPhotos > 10) {
      toast({ title: 'Limit reached', description: 'Maximum 10 photos per visit', variant: 'destructive' });
      return;
    }
    setSelectedFiles(files);
    if (files.length > 0) setUploadOpen(true);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    try {
      for (const file of selectedFiles) {
        await uploadPhoto.mutateAsync({
          file,
          visitId,
          propertyId,
          customerId,
          photoTag: selectedTag,
          caption: caption || undefined,
        });
      }
      toast({ title: `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} uploaded` });
      setUploadOpen(false);
      setSelectedFiles([]);
      setCaption('');
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (photo: any) => {
    try {
      await deletePhoto.mutateAsync({ id: photo.id, fileUrl: photo.file_url, visitId });
      toast({ title: 'Photo deleted' });
      if (viewerOpen) {
        if (filteredPhotos.length <= 1) setViewerOpen(false);
        else if (viewerIndex >= filteredPhotos.length - 1) setViewerIndex(Math.max(0, viewerIndex - 1));
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const navigateViewer = (dir: 'prev' | 'next') => {
    if (dir === 'prev') setViewerIndex(Math.max(0, viewerIndex - 1));
    else setViewerIndex(Math.min(filteredPhotos.length - 1, viewerIndex + 1));
  };

  const currentPhoto = filteredPhotos[viewerIndex] as any;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> Photos ({(photos as any[]).length}/10)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={(photos as any[]).length >= 10}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Tag filter */}
          {(photos as any[]).length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilterTag('all')}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${filterTag === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
              >
                All
              </button>
              {PHOTO_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${filterTag === tag ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Thumbnail grid */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading photos...</p>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {(photos as any[]).length === 0 ? 'No photos yet' : 'No photos with this tag'}
              </p>
              {(photos as any[]).length === 0 && (
                <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-3 w-3 mr-1" /> Take or upload photo
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
              {filteredPhotos.map((photo: any, i: number) => (
                <button
                  key={photo.id}
                  onClick={() => openViewer(i)}
                  className="relative aspect-square rounded-md overflow-hidden border hover:ring-2 hover:ring-primary/50 transition-all group"
                >
                  <img
                    src={photo.file_url}
                    alt={photo.caption || photo.file_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className={`absolute top-1 left-1 text-[8px] font-medium px-1 py-0.5 rounded ${TAG_COLORS[photo.photo_tag] || 'bg-muted text-muted-foreground'}`}>
                    {photo.photo_tag}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-sm mx-3">
          <DialogHeader>
            <DialogTitle className="text-base">Upload Photo{selectedFiles.length > 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Preview thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {selectedFiles.map((f, i) => (
                <div key={i} className="relative shrink-0 w-16 h-16 rounded-md overflow-hidden border">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3" /> Tag</Label>
              <div className="flex gap-1.5 mt-1">
                {PHOTO_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${selectedTag === tag
                      ? TAG_COLORS[tag]
                      : 'border-input hover:bg-muted'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Caption (optional)</Label>
              <Input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="e.g. Driveway cleared and salted"
              />
            </div>

            <Button
              onClick={handleUpload}
              className="w-full h-10"
              disabled={uploadPhoto.isPending || selectedFiles.length === 0}
            >
              {uploadPhoto.isPending ? 'Uploading...' : `Upload ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-view modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden mx-2 bg-black/95">
          {currentPhoto && (
            <div className="relative">
              {/* Image */}
              <div className="flex items-center justify-center min-h-[300px] max-h-[70vh]">
                <img
                  src={currentPhoto.file_url}
                  alt={currentPhoto.caption || currentPhoto.file_name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>

              {/* Navigation arrows */}
              {filteredPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => navigateViewer('prev')}
                    disabled={viewerIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 disabled:opacity-20 hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => navigateViewer('next')}
                    disabled={viewerIndex === filteredPhotos.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 disabled:opacity-20 hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Info bar */}
              <div className="bg-background p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TAG_COLORS[currentPhoto.photo_tag]}`}>
                      {currentPhoto.photo_tag}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{currentPhoto.file_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{viewerIndex + 1}/{filteredPhotos.length}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(currentPhoto)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {currentPhoto.caption && (
                  <p className="text-xs text-foreground">{currentPhoto.caption}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(currentPhoto.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
