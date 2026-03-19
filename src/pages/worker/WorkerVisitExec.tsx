import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVisit, useUpdateVisit } from '@/hooks/useVisits';
import { useVisitPhotos, useUploadVisitPhoto, PHOTO_TAGS, PhotoTag } from '@/hooks/useVisitPhotos';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Navigation, MapPin, Camera, ImagePlus, CheckCircle,
  AlertTriangle, Clock, Loader2, Upload, X, ChevronRight, Phone,
  FileText, Snowflake, Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendNotification } from '@/hooks/useNotifications';
import { DirectionsButton } from '@/components/DirectionsButton';
import { PropertyVerificationCard } from '@/components/PropertyVerificationCard';

// Compress image for mobile upload
async function compressImage(file: File, maxWidth = 1920, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 200_000) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= maxWidth && file.size < 1_500_000) { resolve(file); return; }
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob && blob.size < file.size ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

const TAG_COLORS: Record<string, string> = {
  Before: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  After: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Issue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// Execution states map to existing visit_status enum values
type ExecState = 'assigned' | 'en_route' | 'on_site' | 'completed' | 'issue_reported';

function mapStatusToExec(status: string): ExecState {
  switch (status) {
    case 'En Route': return 'en_route';
    case 'In Progress': return 'on_site';
    case 'Completed': return 'completed';
    default: return 'assigned';
  }
}

function mapExecToDbStatus(exec: ExecState): string {
  switch (exec) {
    case 'en_route': return 'En Route';
    case 'on_site': return 'In Progress';
    case 'completed': return 'Completed';
    case 'issue_reported': return 'In Progress'; // stay In Progress
    default: return 'Scheduled';
  }
}

const MIN_PHOTOS_FOR_COMPLETION = 1;

interface StagedFile {
  file: File;
  preview: string;
  tag: PhotoTag;
  caption: string;
}

export default function WorkerVisitExec() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: visit, isLoading } = useVisit(id);
  const { data: photos = [] } = useVisitPhotos(id);
  const updateVisit = useUpdateVisit();
  const uploadPhoto = useUploadVisitPhoto();

  const [crewNotes, setCrewNotes] = useState('');
  const [serviceSummary, setServiceSummary] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [snowDepth, setSnowDepth] = useState('');
  const [issueText, setIssueText] = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [propertyConfirmed, setPropertyConfirmed] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visit) {
      setCrewNotes(visit.crew_notes || '');
      setServiceSummary(visit.service_summary || '');
      setCustomerNotes(visit.customer_visible_notes || '');
      setWeatherNotes(visit.weather_notes || '');
      setSnowDepth(visit.snow_depth || '');
    }
  }, [visit]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!visit) return <div className="p-6 text-center text-muted-foreground">Visit not found</div>;

  const property = (visit as any).properties;
  const customer = (visit as any).customers;
  const job = (visit as any).jobs;
  const execState = mapStatusToExec(visit.visit_status);
  const photoCount = (photos as any[]).length + stagedFiles.length;
  const canComplete = photoCount >= MIN_PHOTOS_FOR_COMPLETION;
  const isOneTime = job?.service_frequency === 'one-time';

  // Upload staged files
  const uploadStaged = async () => {
    if (stagedFiles.length === 0) return;
    setUploading(true);
    try {
      for (const staged of stagedFiles) {
        const compressed = await compressImage(staged.file);
        await uploadPhoto.mutateAsync({
          file: compressed,
          visitId: id!,
          propertyId: (visit as any).property_id,
          customerId: (visit as any).customer_id,
          photoTag: staged.tag,
          caption: staged.caption || undefined,
        });
      }
      stagedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setStagedFiles([]);
      toast({ title: `${stagedFiles.length} photo(s) uploaded` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addFiles = (files: File[]) => {
    const newStaged = files.slice(0, 10 - photoCount).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      tag: 'After' as PhotoTag,
      caption: '',
    }));
    setStagedFiles(prev => [...prev, ...newStaged]);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) addFiles(files);
    e.target.value = '';
  };

  const removeStagedFile = (i: number) => {
    setStagedFiles(prev => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // Transition to next state
  const transitionTo = async (nextExec: ExecState) => {
    setTransitioning(true);
    try {
      const updates: any = { id: id!, visit_status: mapExecToDbStatus(nextExec) };

      if (nextExec === 'en_route') {
        // Notify customer
        try {
          await sendNotification({
            event: 'worker_en_route',
            customer_id: (visit as any).customer_id,
            record_type: 'visit',
            record_id: id,
            variables: {
              customer_name: customer ? `${customer.first_name} ${customer.last_name}` : '',
              property: property?.property_name || '',
              service_type: job?.service_category || '',
              worker_name: user?.user_metadata?.full_name || user?.email || '',
            },
            channels: ['in_app'],
            audience: 'customer',
          });
        } catch { /* non-critical */ }
      }

      if (nextExec === 'on_site') {
        updates.arrival_time = new Date().toISOString();
      }

      if (nextExec === 'completed') {
        // Upload any remaining staged photos first
        if (stagedFiles.length > 0) await uploadStaged();

        updates.completion_time = new Date().toISOString();
        updates.crew_notes = crewNotes || null;
        updates.service_summary = serviceSummary || null;
        updates.customer_visible_notes = customerNotes || null;
        updates.weather_notes = weatherNotes || null;
        updates.snow_depth = snowDepth || null;
      }

      await updateVisit.mutateAsync(updates);

      // Post-completion: log activity and handle job completion
      if (nextExec === 'completed') {
        // Log activity
        await supabase.from('activities').insert({
          action_name: `Visit ${visit.visit_number} completed`,
          workflow_name: 'worker_app',
          record_type: 'visit',
          record_id: id,
          status: 'completed',
          user_id: user?.id,
          payload_summary: {
            visit_number: visit.visit_number,
            property: property?.property_name,
            customer: customer ? `${customer.first_name} ${customer.last_name}` : null,
            photos_count: photoCount,
          },
        });

        // Notify customer of completion
        try {
          await sendNotification({
            event: 'visit_completed',
            customer_id: (visit as any).customer_id,
            record_type: 'visit',
            record_id: id,
            variables: {
              customer_name: customer ? `${customer.first_name} ${customer.last_name}` : '',
              property: property?.property_name || '',
              service_type: job?.service_category || '',
              scheduled_date: visit.service_date,
            },
            channels: ['in_app'],
            audience: 'customer',
          });
        } catch { /* non-critical */ }

        // For one-time jobs: mark job as Completed
        if (isOneTime && job) {
          await supabase.from('jobs').update({ status: 'Completed' }).eq('id', job.id);
        }

        toast({ title: 'Visit completed!', description: isOneTime ? 'Job marked as complete.' : 'Visit recorded.' });
        navigate('/worker/schedule');
        return;
      }

      toast({ title: nextExec === 'en_route' ? 'En route!' : 'Arrived on site' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTransitioning(false);
    }
  };

  const handleReportIssue = async () => {
    if (!issueText.trim()) return;
    setTransitioning(true);
    try {
      await updateVisit.mutateAsync({
        id: id!,
        crew_notes: [crewNotes, `⚠️ ISSUE: ${issueText}`].filter(Boolean).join('\n'),
      });
      await supabase.from('activities').insert({
        action_name: `Issue reported on ${visit.visit_number}`,
        workflow_name: 'worker_app',
        record_type: 'visit',
        record_id: id,
        status: 'needs_attention',
        user_id: user?.id,
        payload_summary: { issue: issueText, property: property?.property_name },
      });
      setCrewNotes(prev => [prev, `⚠️ ISSUE: ${issueText}`].filter(Boolean).join('\n'));
      setIssueText('');
      setShowIssueForm(false);
      toast({ title: 'Issue reported', description: 'Admin has been notified.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTransitioning(false);
    }
  };

  // State machine for primary action button
  const renderPrimaryAction = () => {
    if (execState === 'completed') return null;

    if (execState === 'assigned') {
      return (
        <Button
          onClick={() => transitionTo('en_route')}
          disabled={transitioning}
          className="w-full h-14 text-base gap-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          {transitioning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
          Start — En Route
        </Button>
      );
    }

    if (execState === 'en_route') {
      return (
        <Button
          onClick={() => transitionTo('on_site')}
          disabled={transitioning}
          className="w-full h-14 text-base gap-3 bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
        >
          {transitioning ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
          Mark Arrived
        </Button>
      );
    }

    // on_site
    return (
      <Button
        onClick={() => transitionTo('completed')}
        disabled={transitioning || !canComplete}
        className={cn(
          'w-full h-14 text-base gap-3 shadow-lg',
          canComplete
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {transitioning ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
        Complete Visit
      </Button>
    );
  };

  const stateSteps: { key: ExecState; label: string; icon: React.ElementType }[] = [
    { key: 'assigned', label: 'Assigned', icon: Clock },
    { key: 'en_route', label: 'En Route', icon: Navigation },
    { key: 'on_site', label: 'On Site', icon: MapPin },
    { key: 'completed', label: 'Done', icon: CheckCircle },
  ];

  const currentStepIndex = stateSteps.findIndex(s => s.key === execState);

  return (
    <div className="space-y-3 px-4 pt-3 pb-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{visit.visit_number}</span>
            <StatusBadge status={visit.visit_status} showIcon={false} />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {visit.service_date} · {job?.service_category || 'Service'}
          </p>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center gap-1 px-1">
        {stateSteps.map((step, i) => {
          const isActive = i === currentStepIndex;
          const isPast = i < currentStepIndex;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                isPast ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                'bg-muted text-muted-foreground'
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={cn('text-[9px] font-medium', isActive ? 'text-primary' : isPast ? 'text-emerald-600' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Property & Customer info */}
      <Card>
        <CardContent className="p-3 space-y-2">
          {property && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{property.property_name}</p>
                {property.address_line_1 && (
                  <p className="text-[11px] text-muted-foreground">
                    {property.address_line_1}{property.city && `, ${property.city}`}
                  </p>
                )}
                {property.gate_code && <p className="text-[11px] text-amber-600">Gate: {property.gate_code}</p>}
                {property.access_notes && <p className="text-[11px] text-muted-foreground italic">{property.access_notes}</p>}
              </div>
              <DirectionsButton
                address={property.address_line_1}
                city={property.city}
                province={property.province}
                postalCode={property.postal_code}
                variant="icon"
              />
            </div>
          )}
          {customer && (
            <div className="flex items-center justify-between pt-1 border-t">
              <div>
                <p className="text-xs font-medium">{customer.first_name} {customer.last_name}</p>
                {customer.company_name && <p className="text-[10px] text-muted-foreground">{customer.company_name}</p>}
              </div>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job instructions */}
      {job?.service_instructions && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">Instructions</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{job.service_instructions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos section — visible on_site and later */}
      {(execState === 'on_site' || execState === 'completed') && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" /> Photos ({photoCount}/10)
              </p>
              {!canComplete && execState === 'on_site' && (
                <span className="text-[10px] text-destructive font-medium">
                  Min {MIN_PHOTOS_FOR_COMPLETION} required
                </span>
              )}
            </div>

            {/* Existing photos */}
            {(photos as any[]).length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {(photos as any[]).map((p: any) => (
                  <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border">
                    <img src={p.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <span className={`absolute top-0.5 left-0.5 text-[7px] font-medium px-1 rounded ${TAG_COLORS[p.photo_tag] || ''}`}>
                      {p.photo_tag}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Staged files */}
            {stagedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ready to upload</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {stagedFiles.map((sf, i) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden border-2 border-dashed border-primary/30">
                      <img src={sf.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeStagedFile(i)}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 flex gap-0.5 p-0.5">
                        {PHOTO_TAGS.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setStagedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, tag } : f))}
                            className={cn(
                              'text-[6px] px-1 rounded font-bold',
                              sf.tag === tag ? TAG_COLORS[tag] : 'bg-background/60 text-foreground/60'
                            )}
                          >
                            {tag[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={uploadStaged}
                  disabled={uploading}
                  className="w-full h-9 text-xs gap-1.5"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload {stagedFiles.length} photo{stagedFiles.length > 1 ? 's' : ''}
                </Button>
              </div>
            )}

            {/* Capture buttons */}
            {execState === 'on_site' && photoCount < 10 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-xs gap-1.5"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> Take Photo
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-xs gap-1.5"
                  onClick={() => galleryRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" /> Gallery
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes — visible on_site */}
      {execState === 'on_site' && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Service Summary</label>
              <Textarea
                value={serviceSummary}
                onChange={e => setServiceSummary(e.target.value)}
                placeholder="What was done..."
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Cloud className="h-2.5 w-2.5" /> Weather
                </label>
                <Input value={weatherNotes} onChange={e => setWeatherNotes(e.target.value)} placeholder="e.g. Snow, -5C" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Snowflake className="h-2.5 w-2.5" /> Snow Depth
                </label>
                <Input value={snowDepth} onChange={e => setSnowDepth(e.target.value)} placeholder="e.g. 15cm" className="mt-1 h-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Crew Notes (internal)</label>
              <Textarea value={crewNotes} onChange={e => setCrewNotes(e.target.value)} placeholder="Internal notes..." rows={2} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Customer-Visible Notes</label>
              <Textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Customer will see this..." rows={2} className="mt-1 text-sm" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue reporting */}
      {execState === 'on_site' && (
        <>
          {!showIssueForm ? (
            <button
              onClick={() => setShowIssueForm(true)}
              className="w-full flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 active:bg-destructive/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Report Issue</span>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/50" />
            </button>
          ) : (
            <Card className="border-destructive/30">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Report Issue
                </p>
                <Textarea
                  value={issueText}
                  onChange={e => setIssueText(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs"
                    onClick={() => { setShowIssueForm(false); setIssueText(''); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 h-9 text-xs gap-1.5"
                    onClick={handleReportIssue}
                    disabled={!issueText.trim() || transitioning}
                  >
                    {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                    Submit Issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Completion requirement notice */}
      {execState === 'on_site' && !canComplete && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 px-4 py-3">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            📷 At least {MIN_PHOTOS_FOR_COMPLETION} photo required before completing this visit.
          </p>
        </div>
      )}

      {/* Primary action */}
      <div className="pt-1">
        {renderPrimaryAction()}
      </div>

      {/* Completed state */}
      {execState === 'completed' && (
        <div className="text-center py-6 space-y-2">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
          <p className="text-lg font-bold text-foreground">Visit Complete</p>
          <p className="text-xs text-muted-foreground">
            {visit.completion_time && `Finished at ${new Date(visit.completion_time).toLocaleTimeString()}`}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => navigate('/worker/schedule')}>
            Back to Schedule
          </Button>
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInput} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInput} />
    </div>
  );
}
