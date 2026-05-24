import { useState, useRef, useCallback } from 'react';
import { useVisitPhotos, useUploadVisitPhoto, useDeleteVisitPhoto, PHOTO_TAGS, PhotoTag } from '@/hooks/useVisitPhotos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Camera, ImagePlus, X, Trash2, ChevronLeft, ChevronRight, ImageIcon, Upload, Loader2 } from 'lucide-react';
import { downscaleImageIfLarge, yieldToBrowser, shouldSkipImagePreview } from '@/lib/iosDebug';
import { isIOSNative } from '@/lib/platform';
import { SignedVisitPhotoImg } from '@/components/SignedVisitPhotoImg';

// On native iOS we currently rely on the gallery/files picker only.
// The direct `capture="environment"` camera path has been linked to
// WKWebView crashes during Apple review on iPadOS 26.5, so we hide
// the dedicated Camera button on native iOS and let users pick from
// the photo library (which still allows "Take Photo" from inside the
// system picker on iPhone / iPad). Web + Android keep the shortcut.
const HIDE_DIRECT_CAMERA = isIOSNative();

const TAG_COLORS: Record<string, string> = {
  Before: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  After: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Issue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

interface StagedFile {
  file: File;
  preview: string;
  tag: PhotoTag;
  caption: string;
}

interface VisitPhotoGalleryProps {
  visitId: string;
  propertyId?: string | null;
  customerId?: string | null;
}

// Use the iOS-safe downscaler (createImageBitmap, off-main-thread,
// deterministic memory release) to avoid WKWebView OOM crashes when
// handling full-resolution iPhone camera photos.
async function compressImage(file: File): Promise<File> {
  return downscaleImageIfLarge(file);
}

export function VisitPhotoGallery({ visitId, propertyId, customerId }: VisitPhotoGalleryProps) {
  const { data: photos = [], isLoading } = useVisitPhotos(visitId);
  const uploadPhoto = useUploadVisitPhoto();
  const deletePhoto = useDeleteVisitPhoto();
  const { toast } = useToast();

  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const existingCount = (photos as any[]).length;
  const remainingSlots = 10 - existingCount;

  const filteredPhotos = filterTag === 'all'
    ? photos
    : (photos as any[]).filter((p: any) => p.photo_tag === filterTag);

  // Downscale BEFORE staging/preview. Full-resolution iPhone camera photos
  // (HEIC, 12MP+, 4-8MB) decoded into a blob URL <img> preview routinely
  // OOM-kills the iOS WKWebView right after capture.
  const addFiles = useCallback(async (files: File[]) => {
    const available = remainingSlots - stagedFiles.length;
    if (available <= 0) {
      toast({ title: 'Limit reached', description: 'Maximum 10 photos per visit', variant: 'destructive' });
      return;
    }
    const toAdd = files.slice(0, available);
    if (files.length > available) {
      toast({ title: `Only ${available} slot${available > 1 ? 's' : ''} remaining`, description: `Added ${toAdd.length} of ${files.length} selected photos.` });
    }
    const skipPreview = shouldSkipImagePreview();
    const newStaged: StagedFile[] = [];
    for (const raw of toAdd) {
      try {
        const compressed = await downscaleImageIfLarge(raw);
        newStaged.push({
          file: compressed,
          preview: skipPreview ? '' : URL.createObjectURL(compressed),
          tag: 'After' as PhotoTag,
          caption: '',
        });
        await yieldToBrowser(0);
      } catch {
        newStaged.push({
          file: raw,
          preview: skipPreview ? '' : URL.createObjectURL(raw),
          tag: 'After' as PhotoTag,
          caption: '',
        });
      }
    }
    setStagedFiles(prev => [...prev, ...newStaged]);
    if (!uploadOpen) setUploadOpen(true);
  }, [remainingSlots, stagedFiles.length, uploadOpen, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // reset so same file can be re-selected
    if (files.length > 0) void addFiles(files);
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateStagedTag = (index: number, tag: PhotoTag) => {
    setStagedFiles(prev => prev.map((f, i) => i === index ? { ...f, tag } : f));
  };

  const updateStagedCaption = (index: number, caption: string) => {
    setStagedFiles(prev => prev.map((f, i) => i === index ? { ...f, caption } : f));
  };

  const handleUpload = async () => {
    if (stagedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    let uploaded = 0;
    try {
      for (const staged of stagedFiles) {
        const compressed = await compressImage(staged.file);
        await uploadPhoto.mutateAsync({
          file: compressed,
          visitId,
          propertyId,
          customerId,
          photoTag: staged.tag,
          caption: staged.caption || undefined,
        });
        uploaded++;
        setUploadProgress(Math.round((uploaded / stagedFiles.length) * 100));
      }
      toast({ title: `${uploaded} photo${uploaded > 1 ? 's' : ''} uploaded` });
      // Clean up previews
      stagedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setStagedFiles([]);
      setUploadOpen(false);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: `${uploaded}/${stagedFiles.length} uploaded. ${err.message}`, variant: 'destructive' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteExisting = async (photo: any) => {
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

  const openViewer = (index: number) => { setViewerIndex(index); setViewerOpen(true); };
  const navigateViewer = (dir: 'prev' | 'next') => {
    if (dir === 'prev') setViewerIndex(Math.max(0, viewerIndex - 1));
    else setViewerIndex(Math.min(filteredPhotos.length - 1, viewerIndex + 1));
  };

  const currentPhoto = filteredPhotos[viewerIndex] as any;

  const handleCloseUpload = (open: boolean) => {
    if (!open && !uploading) {
      stagedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setStagedFiles([]);
    }
    if (!uploading) setUploadOpen(open);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> Photos ({existingCount}/10)
            </CardTitle>
            {remainingSlots > 0 && (
              <div className="flex gap-1.5">
                {!HIDE_DIRECT_CAMERA && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs gap-1.5"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Camera</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs gap-1.5"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{HIDE_DIRECT_CAMERA ? 'Add Photos' : 'Gallery'}</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Tag filter */}
          {existingCount > 0 && (
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
                {existingCount === 0 ? 'No photos yet' : 'No photos with this tag'}
              </p>
              {existingCount === 0 && (
                <div className="flex justify-center gap-2 mt-3">
                  {!HIDE_DIRECT_CAMERA && (
                    <Button variant="ghost" size="sm" className="text-xs h-9 gap-1.5" onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="h-3.5 w-3.5" /> Take photo
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs h-9 gap-1.5" onClick={() => galleryInputRef.current?.click()}>
                    <ImagePlus className="h-3.5 w-3.5" /> {HIDE_DIRECT_CAMERA ? 'Add photos' : 'From gallery'}
                  </Button>
                </div>
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
                  <SignedVisitPhotoImg
                    fileUrl={photo.file_url}
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

      {/* Hidden file inputs — camera vs gallery. On native iOS we omit
          the `capture` attribute so iOS shows its standard action sheet
          (Photo Library / Take Photo / Choose Files), which avoids the
          direct UIImagePickerController crash observed in WKWebView. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        {...(HIDE_DIRECT_CAMERA ? {} : { capture: 'environment' as any })}
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Upload staging dialog */}
      <Dialog open={uploadOpen} onOpenChange={handleCloseUpload}>
        <DialogContent className="max-w-md mx-3 max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base">
              Review Photos ({stagedFiles.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
            {stagedFiles.map((staged, i) => (
              <div key={i} className="flex gap-3 p-2 rounded-lg border bg-muted/30">
                {/* Preview */}
                <div className="relative shrink-0 w-20 h-20 rounded-md overflow-hidden border">
                  {staged.preview ? (
                    <img src={staged.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-[9px] text-muted-foreground p-1 text-center">
                      <ImageIcon className="h-5 w-5 mb-0.5" />
                      <span className="truncate max-w-full">Photo {i + 1}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeStagedFile(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {/* Tag + caption */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex gap-1 flex-wrap">
                    {PHOTO_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => updateStagedTag(i, tag)}
                        className={`text-[10px] px-2 py-1 rounded-md border transition-colors font-medium ${
                          staged.tag === tag ? TAG_COLORS[tag] : 'border-input hover:bg-muted'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={staged.caption}
                    onChange={e => updateStagedCaption(i, e.target.value)}
                    placeholder="Caption (optional)"
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground truncate">
                    {staged.file.name} · {(staged.file.size / 1024).toFixed(0)}KB
                  </p>
                </div>
              </div>
            ))}

            {/* Add more button */}
            {stagedFiles.length > 0 && stagedFiles.length < remainingSlots && (
              <div className="flex gap-2">
                {!HIDE_DIRECT_CAMERA && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs gap-1.5"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-3.5 w-3.5" /> Take more
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-xs gap-1.5"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Add more
                </Button>
              </div>
            )}
          </div>

          {/* Upload button with progress */}
          <div className="shrink-0 pt-2 border-t">
            {uploading && (
              <div className="w-full bg-muted rounded-full h-1.5 mb-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            <Button
              onClick={handleUpload}
              className="w-full h-11 text-sm gap-2"
              disabled={uploading || stagedFiles.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {stagedFiles.length} Photo{stagedFiles.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-view modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden mx-2 bg-black/95">
          {currentPhoto && (
            <div className="relative">
              <div className="flex items-center justify-center min-h-[300px] max-h-[70vh]">
                <SignedVisitPhotoImg
                  fileUrl={currentPhoto.file_url}
                  alt={currentPhoto.caption || currentPhoto.file_name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              {filteredPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => navigateViewer('prev')}
                    disabled={viewerIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 disabled:opacity-20 hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => navigateViewer('next')}
                    disabled={viewerIndex === filteredPhotos.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 disabled:opacity-20 hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
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
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDeleteExisting(currentPhoto)}
                  >
                    <Trash2 className="h-4 w-4" />
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
