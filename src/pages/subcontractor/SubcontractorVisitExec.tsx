import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVisitPhotos, useUploadVisitPhoto, PHOTO_TAGS, PhotoTag } from '@/hooks/useVisitPhotos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { DirectionsButton } from '@/components/DirectionsButton';
import { CustomerWarningsBanner } from '@/components/CustomerWarningsBanner';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Navigation, MapPin, Camera, ImagePlus, CheckCircle,
  AlertTriangle, Clock, Loader2, X, Phone, Send, User, Briefcase,
  Home, StickyNote, Info, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isIOSNative } from '@/lib/platform';
import { LiveVisitTimer } from '@/components/visits/LiveVisitTimer';
import { VisitTimerControls } from '@/components/visits/VisitTimerControls';
import { useVisitPauses, closeOpenPauseIfAny } from '@/hooks/useVisitPauses';
import { formatTzTime } from '@/lib/timezone';

// Hide direct camera capture on native iOS — see VisitPhotoGallery.
const HIDE_DIRECT_CAMERA = isIOSNative();

// ── Image compression ──
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
    case 'issue_reported': return 'In Progress';
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

function buildFullAddress(property: any): string {
  if (!property) return '';
  return [property.address_line_1, property.city, property.province, property.postal_code]
    .filter(Boolean).join(', ');
}

function openDirections(property: any) {
  const addr = buildFullAddress(property);
  if (!addr) return;
  window.open(`https://maps.google.com/maps?daddr=${encodeURIComponent(addr)}`, '_blank');
}

export default function SubcontractorVisitExec() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: visit, isLoading } = useQuery({
    queryKey: ['subcontractor_visit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('visits')
        .select('*, properties(property_name, address_line_1, city, province, postal_code, access_notes, gate_code), jobs(id, job_number, job_title, service_category, scope_of_work, service_instructions, service_frequency, assigned_to), customers:customer_id(first_name, last_name, phone, email, company_name)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: photos = [] } = useVisitPhotos(id);
  const { data: pauses = [] } = useVisitPauses(id);
  const uploadPhoto = useUploadVisitPhoto();

  const [crewNotes, setCrewNotes] = useState('');
  const [serviceSummary, setServiceSummary] = useState('');
  const [issueText, setIssueText] = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState('visit');
  const [noteSaving, setNoteSaving] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visit) {
      setCrewNotes(visit.crew_notes || '');
      setServiceSummary(visit.service_summary || '');
    }
  }, [visit]);

  // Backfill arrival_time if visit is already On Site but arrival_time was never
  // stamped (e.g. admin flipped the status manually). Without this, the live
  // timer + Pause/Resume controls stay hidden on the subcontractor screen.
  useEffect(() => {
    if (!visit || !id) return;
    if (visit.visit_status === 'In Progress' && !visit.arrival_time) {
      const stamp = new Date().toISOString();
      supabase
        .from('visits')
        .update({ arrival_time: stamp })
        .eq('id', id)
        .then(({ error }) => {
          if (!error) queryClient.invalidateQueries({ queryKey: ['subcontractor_visit', id] });
        });
    }
  }, [visit, id, queryClient]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!visit) return <div className="p-6 text-center text-muted-foreground">Visit not found</div>;

  const property = (visit as any).properties;
  const customer = (visit as any).customers;
  const job = (visit as any).jobs;
  const fullAddress = buildFullAddress(property);

  const execState = mapStatusToExec(visit.visit_status);
  const photoCount = (photos as any[]).length + stagedFiles.length;
  const canComplete = photoCount >= MIN_PHOTOS_FOR_COMPLETION;
  const isOneTime = job?.service_frequency === 'one-time';

  // ── Upload staged photos ──
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

  // ── Save notes ──
  const saveNotes = async () => {
    setNoteSaving(true);
    try {
      const { error } = await supabase.from('visits').update({
        crew_notes: crewNotes || null,
        service_summary: serviceSummary || null,
      }).eq('id', id!);
      if (error) throw error;
      toast({ title: 'Notes saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setNoteSaving(false);
    }
  };

  // ── State transitions ──
  const transitionTo = async (nextExec: ExecState) => {
    setTransitioning(true);
    try {
      const updates: any = { visit_status: mapExecToDbStatus(nextExec) };

      if (nextExec === 'on_site') {
        updates.arrival_time = new Date().toISOString();
      }

      if (nextExec === 'completed') {
        if (stagedFiles.length > 0) await uploadStaged();
        const completionIso = new Date().toISOString();
        try { await closeOpenPauseIfAny(id!, completionIso); } catch { /* non-critical */ }
        updates.completion_time = completionIso;
        updates.crew_notes = crewNotes || null;
        updates.service_summary = serviceSummary || null;
      }

      if (nextExec === 'completed') {
        const { error } = await (supabase as any).rpc('complete_assigned_visit', {
          _visit_id: id!,
          _crew_notes: crewNotes || null,
          _service_summary: serviceSummary || null,
          _customer_visible_notes: null,
          _weather_notes: null,
          _snow_depth: null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('visits').update(updates).eq('id', id!);
        if (error) throw error;
      }

      if (nextExec === 'completed') {
        await supabase.from('activities').insert({
          action_name: `Visit ${visit.visit_number} completed by subcontractor`,
          workflow_name: 'subcontractor_app',
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

        // Mark subcontractor assignment as completed
        const subProfile = await supabase
          .from('subcontractors')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle();
        if (subProfile.data) {
          await supabase
            .from('subcontractor_assignments')
            .update({ assignment_status: 'completed' })
            .eq('visit_id', id!)
            .eq('subcontractor_id', subProfile.data.id);
        }

        toast({
          title: 'Visit completed!',
          description: isOneTime ? 'Job marked as complete.' : 'Visit recorded successfully.',
        });
        queryClient.invalidateQueries({ queryKey: ['subcontractor_visit'] });
        queryClient.invalidateQueries({ queryKey: ['subcontractor_assignments'] });
        navigate('/subcontractor/schedule');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['subcontractor_visit', id] });
      toast({ title: nextExec === 'en_route' ? 'On my way!' : 'Arrived on site' });
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
      const updatedNotes = [crewNotes, `⚠️ ISSUE: ${issueText}`].filter(Boolean).join('\n');
      const { error } = await supabase.from('visits').update({ crew_notes: updatedNotes }).eq('id', id!);
      if (error) throw error;
      await supabase.from('activities').insert({
        action_name: `Issue reported on ${visit.visit_number}`,
        workflow_name: 'subcontractor_app',
        record_type: 'visit',
        record_id: id,
        status: 'needs_attention',
        user_id: user?.id,
        payload_summary: { issue: issueText, property: property?.property_name },
      });
      setCrewNotes(updatedNotes);
      setIssueText('');
      setShowIssueForm(false);
      toast({ title: 'Issue reported', description: 'Admin has been notified.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTransitioning(false);
    }
  };

  // ── Stepper ──
  const stateSteps: { key: ExecState; label: string; icon: React.ElementType }[] = [
    { key: 'assigned', label: 'Scheduled', icon: Clock },
    { key: 'en_route', label: 'En Route', icon: Navigation },
    { key: 'on_site', label: 'On Site', icon: MapPin },
    { key: 'completed', label: 'Done', icon: CheckCircle },
  ];
  const currentStepIndex = stateSteps.findIndex(s => s.key === execState);

  const isCancelledOrArchived =
    visit.visit_status === 'Cancelled' || !!(visit as any).archived_at;

  // ── Primary action button ──
  const renderPrimaryAction = () => {
    if (execState === 'completed') return null;
    if (isCancelledOrArchived) return null;


    if (execState === 'assigned') {
      return (
        <Button
          onClick={() => transitionTo('en_route')}
          disabled={transitioning}
          className="w-full h-14 text-base gap-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          {transitioning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          On My Way
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
          I've Arrived
        </Button>
      );
    }

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

  return (
    <div className="space-y-3 px-4 pt-3 pb-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{job?.job_title || visit.visit_type || 'Service Visit'}</span>
            <StatusBadge status={visit.visit_status} showIcon={false} />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {visit.visit_number} · {visit.service_date} · {job?.service_category || 'Service'}
          </p>
        </div>
      </div>

      {isCancelledOrArchived && (
        <div className="rounded-lg border-2 border-destructive/60 bg-destructive/10 px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-destructive">
              {visit.visit_status === 'Cancelled'
                ? 'This visit has been cancelled by Praetoria Group.'
                : 'This visit has been archived by Praetoria Group.'}
            </p>
            <p className="text-muted-foreground mt-0.5">
              You cannot start the timer, complete the visit, or submit new work.
              Existing photos and notes are preserved.
            </p>
          </div>
        </div>
      )}


      {/* ── Property + Address + Quick Actions ── */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="min-w-0 flex-1">
            {property && (
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Home className="h-3 w-3 text-muted-foreground shrink-0" />
                {property.property_name}
              </p>
            )}
            {fullAddress && (
              <p className="text-[11px] text-muted-foreground mt-0.5 pl-[18px]">{fullAddress}</p>
            )}
            {customer && (
              <p className="text-[11px] text-muted-foreground mt-0.5 pl-[18px] flex items-center gap-1">
                <User className="h-2.5 w-2.5" />
                {customer.first_name} {customer.last_name}
                {customer.company_name && ` · ${customer.company_name}`}
              </p>
            )}
            {job && (
              <p className="text-[11px] text-muted-foreground mt-0.5 pl-[18px] flex items-center gap-1">
                <Briefcase className="h-2.5 w-2.5" />
                {job.job_number} · {job.job_title}
              </p>
            )}
          </div>

          {/* Quick action row */}
          <div className="flex gap-2 pt-1">
            {fullAddress && (
              <Button variant="outline" size="sm" className="flex-1 h-10 text-xs gap-1.5" onClick={() => openDirections(property)}>
                <Navigation className="h-4 w-4 text-blue-600" />
                Directions
              </Button>
            )}
            {customer?.phone && (
              <a href={`tel:${customer.phone}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full h-10 text-xs gap-1.5">
                  <Phone className="h-4 w-4 text-green-600" />
                  Call
                </Button>
              </a>
            )}
          </div>

          {property?.access_notes && <p className="text-[11px] text-muted-foreground mt-1">🔑 Access: {property.access_notes}</p>}
          {property?.gate_code && <p className="text-[11px] text-muted-foreground">🚪 Gate: {property.gate_code}</p>}
        </CardContent>
      </Card>

      {/* ── Customer Warnings ── */}
      <CustomerWarningsBanner customerId={(visit as any).customer_id} />

      {/* ── Progress stepper ── */}
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

      {/* ── Live On-Site Timer ── */}
      {(execState === 'on_site' || execState === 'completed') && (
        <>
          <LiveVisitTimer
            arrivalTime={visit.arrival_time || new Date().toISOString()}
            completionTime={visit.completion_time}
            variant="hero"
            pauses={pauses}
          />
          {execState === 'on_site' && id && !isCancelledOrArchived && (
            <VisitTimerControls visitId={id} active size="lg" />
          )}
        </>
      )}

      {/* ── Primary Action ── */}
      {execState !== 'completed' && (
        <div>{renderPrimaryAction()}</div>
      )}

      {/* ── Photo requirement notice ── */}
      {execState === 'on_site' && !canComplete && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 px-4 py-2.5">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            📷 At least {MIN_PHOTOS_FOR_COMPLETION} photo required before completing.
          </p>
        </div>
      )}

      {/* ── Completed banner ── */}
      {execState === 'completed' && (
        <div className="text-center py-4 space-y-1.5">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="text-base font-bold text-foreground">Visit Complete</p>
          {visit.completion_time && (
            <p className="text-xs text-muted-foreground">
              Finished at {formatTzTime(visit.completion_time)}
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/subcontractor/schedule')}>
            Back to Schedule
          </Button>
        </div>
      )}

      {/* ── Tabs: Visit / Details / Notes ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="visit" className="text-xs gap-1"><Eye className="h-3 w-3" /> Visit</TabsTrigger>
          <TabsTrigger value="details" className="text-xs gap-1"><Info className="h-3 w-3" /> Details</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1"><StickyNote className="h-3 w-3" /> Notes</TabsTrigger>
        </TabsList>

        {/* ═══ VISIT TAB ═══ */}
        <TabsContent value="visit" className="space-y-3 mt-3">
          {/* Photo capture */}
          {execState !== 'completed' && (
            <Card>
              <CardContent className="p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photos ({photoCount})</p>
                <div className="flex gap-2">
                  {!HIDE_DIRECT_CAMERA && (
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => cameraRef.current?.click()}>
                      <Camera className="h-4 w-4" /> Camera
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => galleryRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" /> {HIDE_DIRECT_CAMERA ? 'Add Photo' : 'Gallery'}
                  </Button>
                  <input ref={cameraRef} type="file" accept="image/*" {...(HIDE_DIRECT_CAMERA ? {} : { capture: 'environment' as any })} className="hidden" onChange={handleInput} />
                  <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInput} />
                </div>

                {/* Staged files preview */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {stagedFiles.map((sf, i) => (
                        <div key={i} className="relative group">
                          <img src={sf.preview} className="w-full h-20 object-cover rounded-lg" alt="" />
                          <button
                            onClick={() => removeStagedFile(i)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <select
                            value={sf.tag}
                            onChange={e => {
                              const updated = [...stagedFiles];
                              updated[i] = { ...updated[i], tag: e.target.value as PhotoTag };
                              setStagedFiles(updated);
                            }}
                            className="absolute bottom-1 left-1 text-[9px] bg-background/90 rounded px-1 py-0.5 border"
                          >
                            {PHOTO_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" onClick={uploadStaged} disabled={uploading} className="w-full gap-1.5">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {uploading ? 'Uploading...' : `Upload ${stagedFiles.length} Photo(s)`}
                    </Button>
                  </div>
                )}

                {/* Existing photos */}
                {(photos as any[]).length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {(photos as any[]).map((p: any) => (
                      <div key={p.id} className="relative">
                        <img src={p.photo_url} className="w-full h-20 object-cover rounded-lg" alt="" />
                        {p.photo_tag && (
                          <span className={cn('absolute top-1 left-1 text-[8px] font-medium px-1.5 py-0.5 rounded-full', TAG_COLORS[p.photo_tag] || 'bg-muted text-muted-foreground')}>
                            {p.photo_tag}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Completed photos */}
          {execState === 'completed' && (photos as any[]).length > 0 && (
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Photos ({(photos as any[]).length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {(photos as any[]).map((p: any) => (
                    <div key={p.id} className="relative">
                      <img src={p.photo_url} className="w-full h-20 object-cover rounded-lg" alt="" />
                      {p.photo_tag && (
                        <span className={cn('absolute top-1 left-1 text-[8px] font-medium px-1.5 py-0.5 rounded-full', TAG_COLORS[p.photo_tag] || 'bg-muted text-muted-foreground')}>
                          {p.photo_tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Issue */}
          {execState === 'on_site' && (
            <Card>
              <CardContent className="p-3 space-y-2">
                {!showIssueForm ? (
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-destructive border-destructive/30" onClick={() => setShowIssueForm(true)}>
                    <AlertTriangle className="h-4 w-4" /> Report Issue
                  </Button>
                ) : (
                  <>
                    <Textarea
                      placeholder="Describe the issue (blocked access, hazard, missing equipment, etc.)"
                      value={issueText}
                      onChange={e => setIssueText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setShowIssueForm(false); setIssueText(''); }}>Cancel</Button>
                      <Button size="sm" variant="destructive" className="flex-1 gap-1" disabled={transitioning || !issueText.trim()} onClick={handleReportIssue}>
                        {transitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                        Submit Issue
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ DETAILS TAB ═══ */}
        <TabsContent value="details" className="space-y-3 mt-3">
          {job && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Info</p>
                <p className="text-sm font-medium text-foreground">{job.job_title}</p>
                <p className="text-xs text-muted-foreground">Category: {job.service_category}</p>
                {job.scope_of_work && <p className="text-xs text-muted-foreground">{job.scope_of_work}</p>}
                {job.service_instructions && (
                  <div className="bg-muted/50 rounded-lg p-3 mt-2">
                    <p className="text-xs font-medium text-foreground mb-1">Instructions</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{job.service_instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visit Details</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground capitalize">{visit.visit_type}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="text-foreground">{visit.service_date}</span></div>
                {visit.arrival_time && <div><span className="text-muted-foreground">Arrived:</span> <span className="text-foreground">{formatTzTime(visit.arrival_time)}</span></div>}
                {visit.completion_time && <div><span className="text-muted-foreground">Completed:</span> <span className="text-foreground">{formatTzTime(visit.completion_time)}</span></div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ NOTES TAB ═══ */}
        <TabsContent value="notes" className="space-y-3 mt-3">
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Crew / Work Notes</label>
                <Textarea
                  placeholder="Record observations, materials used, special conditions..."
                  value={crewNotes}
                  onChange={e => setCrewNotes(e.target.value)}
                  rows={4}
                  disabled={execState === 'completed'}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Service Summary</label>
                <Textarea
                  placeholder="Brief summary of work completed..."
                  value={serviceSummary}
                  onChange={e => setServiceSummary(e.target.value)}
                  rows={3}
                  disabled={execState === 'completed'}
                />
              </div>
              {execState !== 'completed' && (
                <Button size="sm" onClick={saveNotes} disabled={noteSaving} className="w-full gap-1.5">
                  {noteSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <StickyNote className="h-3 w-3" />}
                  Save Notes
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
