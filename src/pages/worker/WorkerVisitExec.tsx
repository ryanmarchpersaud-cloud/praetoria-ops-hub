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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Navigation, MapPin, Camera, ImagePlus, CheckCircle,
  AlertTriangle, Clock, Loader2, Upload, X, ChevronRight, Phone,
  FileText, Snowflake, Cloud, Send, User, Briefcase, Home,
  StickyNote, Info, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendNotification } from '@/hooks/useNotifications';
import { PropertyVerificationCard } from '@/components/PropertyVerificationCard';
import { CustomerWarningsBanner } from '@/components/CustomerWarningsBanner';
import { downscaleImageIfLarge, isIOSWebView, yieldToBrowser, iosLog, shouldSkipImagePreview } from '@/lib/iosDebug';
import { isIOSNative } from '@/lib/platform';
import { shouldUseNativeCamera, pickNativePhoto, type CameraSource } from '@/lib/nativeCamera';

// Hide direct camera capture on native iOS — see VisitPhotoGallery.
const HIDE_DIRECT_CAMERA = isIOSNative();

// ── Image compression ──
// Delegates to the iOS-safe downscaler that uses createImageBitmap (off-main-thread,
// deterministic memory release) to avoid WKWebView OOM crashes when handling
// full-resolution iPhone camera photos (often 4-8MB / 12MP+).
async function compressImage(file: File): Promise<File> {
  return downscaleImageIfLarge(file);
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

// ── Helpers ──
function buildFullAddress(property: any): string {
  if (!property) return '';
  return [property.address_line_1, property.city, property.province, property.postal_code]
    .filter(Boolean).join(', ');
}

function openDirections(property: any) {
  const addr = buildFullAddress(property);
  if (!addr) return;
  const encoded = encodeURIComponent(addr);
  // On iOS (Capacitor WKWebView), window.open('_blank') is frequently a no-op.
  // Use Apple Maps universal link on iOS so it launches the Maps app reliably,
  // and Google Maps on Android/desktop. Fall back to location.href when
  // window.open returns null (popup blocked / WKWebView).
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document);
  const url = isIOS
    ? `https://maps.apple.com/?daddr=${encoded}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  iosLog('directions:open', { isIOS, addr });
  try {
    const win = window.open(url, '_blank');
    if (!win) window.location.href = url;
  } catch {
    window.location.href = url;
  }
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
  const [activeTab, setActiveTab] = useState('visit');
  const [noteSaving, setNoteSaving] = useState(false);

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

  // Scroll to section on hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'photos') setActiveTab('visit');
    if (hash === 'notes') setActiveTab('notes');
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!visit) return <div className="p-6 text-center text-muted-foreground">Visit not found</div>;

  const property = (visit as any).properties;
  const customer = (visit as any).customers;
  const job = (visit as any).jobs;

  // Guard: worker can only access visits assigned to them
  const assignedTo = job?.assigned_to;
  if (assignedTo && user?.id && assignedTo !== user.id) {
    return (
      <div className="p-6 text-center space-y-2">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
        <p className="text-sm font-medium text-foreground">Access Denied</p>
        <p className="text-xs text-muted-foreground">This visit is not assigned to you.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/worker/schedule')}>Back to Schedule</Button>
      </div>
    );
  }

  const execState = mapStatusToExec(visit.visit_status);
  const photoCount = (photos as any[]).length + stagedFiles.length;
  const canComplete = photoCount >= MIN_PHOTOS_FOR_COMPLETION;
  const isOneTime = job?.service_frequency === 'one-time';
  const fullAddress = buildFullAddress(property);

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

  // Downscale BEFORE staging/preview. Full-resolution iPhone camera photos
  // (HEIC, 12MP+, 4-8MB) decoded into a blob URL <img> preview routinely
  // OOM-kills the iOS WKWebView right after capture. Compressing first
  // keeps memory bounded and prevents the crash.
  const addFiles = async (files: File[]) => {
    const slice = files.slice(0, 10 - photoCount);
    const skipPreview = shouldSkipImagePreview();
    const newStaged: StagedFile[] = [];
    for (const raw of slice) {
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
        // Fall back to raw on any decode error
        newStaged.push({
          file: raw,
          preview: skipPreview ? '' : URL.createObjectURL(raw),
          tag: 'After' as PhotoTag,
          caption: '',
        });
      }
    }
    setStagedFiles(prev => [...prev, ...newStaged]);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) void addFiles(files);
  };

  // Native iOS picker — avoids the iPad WKWebView camera crash by going
  // through the Capacitor Camera plugin (handles popover anchoring).
  const pickNative = async (source: CameraSource) => {
    try {
      const file = await pickNativePhoto(source);
      if (file) await addFiles([file]);
    } catch (err: any) {
      toast({ title: 'Camera error', description: err?.message || 'Could not open camera', variant: 'destructive' });
    }
  };

  const removeStagedFile = (i: number) => {
    setStagedFiles(prev => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // ── Save notes independently ──
  const saveNotes = async () => {
    setNoteSaving(true);
    try {
      await updateVisit.mutateAsync({
        id: id!,
        crew_notes: crewNotes || null,
        service_summary: serviceSummary || null,
        customer_visible_notes: customerNotes || null,
        weather_notes: weatherNotes || null,
        snow_depth: snowDepth || null,
      } as any);
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
      const updates: any = { id: id!, visit_status: mapExecToDbStatus(nextExec) };

      if (nextExec === 'en_route') {
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
              to_email: customer?.email || '',
              to_phone: customer?.phone || '',
            },
            channels: ['in_app', 'email', 'sms'],
            audience: 'customer',
          });
        } catch { /* non-critical */ }
      }

      if (nextExec === 'on_site') {
        updates.arrival_time = new Date().toISOString();
      }

      if (nextExec === 'completed') {
        if (stagedFiles.length > 0) await uploadStaged();
        updates.completion_time = new Date().toISOString();
        updates.crew_notes = crewNotes || null;
        updates.service_summary = serviceSummary || null;
        updates.customer_visible_notes = customerNotes || null;
        updates.weather_notes = weatherNotes || null;
        updates.snow_depth = snowDepth || null;
      }

      await updateVisit.mutateAsync(updates);

      if (nextExec === 'completed') {
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
              worker_name: user?.user_metadata?.full_name || user?.email || '',
              to_email: customer?.email || '',
              to_phone: customer?.phone || '',
            },
            channels: ['in_app', 'email', 'sms'],
            audience: 'customer',
          });
        } catch { /* non-critical */ }

        // Send internal ops email notification
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              action: 'visit_completed',
              visit_number: visit.visit_number,
              job_title: job?.job_title,
              property_name: property?.property_name,
              worker_name: user?.email,
              service_category: job?.service_category,
              visit_id: id,
              completed_at: new Date().toISOString(),
            },
          });
        } catch { /* non-critical */ }

        if (isOneTime && job) {
          await supabase.from('jobs').update({ status: 'Completed' }).eq('id', job.id);
        }

        // Check if all today's visits are now complete
        let allDoneMessage = '';
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: remaining } = await supabase
            .from('visits')
            .select('id')
            .eq('assigned_worker_id', user?.id)
            .eq('service_date', todayStr)
            .not('status', 'in', '("Completed","Cancelled","Skipped")');
          if (!remaining || remaining.length === 0) {
            allDoneMessage = ' 🎉 All visits for today are done — great job! Stand by for more assignments.';
          }
        } catch { /* non-critical */ }

        toast({
          title: allDoneMessage ? '🎉 All Done for Today!' : 'Visit completed!',
          description: (isOneTime ? 'Job marked as complete. ' : 'Visit recorded. ') + allDoneMessage,
          duration: allDoneMessage ? 8000 : 4000,
        });
        navigate('/worker/schedule');
        return;
      }

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
      await updateVisit.mutateAsync({
        id: id!,
        crew_notes: [crewNotes, `⚠️ ISSUE: ${issueText}`].filter(Boolean).join('\n'),
      } as any);
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

  // ── Stepper ──
  const stateSteps: { key: ExecState; label: string; icon: React.ElementType }[] = [
    { key: 'assigned', label: 'Scheduled', icon: Clock },
    { key: 'en_route', label: 'En Route', icon: Navigation },
    { key: 'on_site', label: 'On Site', icon: MapPin },
    { key: 'completed', label: 'Done', icon: CheckCircle },
  ];
  const currentStepIndex = stateSteps.findIndex(s => s.key === execState);

  // ── Primary action button ──
  const renderPrimaryAction = () => {
    if (execState === 'completed') return null;

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

      {/* ── Property + Address + Quick Actions ── */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
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
          </div>

          {/* Quick action row */}
          <div className="flex gap-2 pt-1">
            {fullAddress && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 text-xs gap-1.5"
                onClick={() => openDirections(property)}
              >
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

      {/* ── Primary Action ── */}
      {execState !== 'completed' && (
        <div>{renderPrimaryAction()}</div>
      )}

      {/* ── Completion notice ── */}
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
              Finished at {new Date(visit.completion_time).toLocaleTimeString()}
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/worker/schedule')}>
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
          {/* Property Verification */}
          {property && (
            <PropertyVerificationCard
              property={property}
              onConfirm={() => setPropertyConfirmed(true)}
              confirmed={propertyConfirmed}
            />
          )}

          {/* Service Instructions */}
          {job?.service_instructions && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">Service Instructions</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{job.service_instructions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photos section — always visible so workers can take before photos */}
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> Photos ({photoCount}/10)
                </p>
                {execState === 'on_site' && !canComplete && (
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
                        {sf.preview ? (
                          <img src={sf.preview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-[8px] text-muted-foreground p-1 text-center">
                            <Camera className="h-4 w-4 mb-0.5" />
                            <span className="truncate max-w-full">{sf.file.name.slice(-12)}</span>
                          </div>
                        )}
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
                  <Button size="sm" onClick={uploadStaged} disabled={uploading} className="w-full h-9 text-xs gap-1.5">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload {stagedFiles.length} photo{stagedFiles.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}

              {/* Capture buttons — available before completion */}
              {execState !== 'completed' && photoCount < 10 && (
                <div className="flex gap-2">
                  {!HIDE_DIRECT_CAMERA && (
                    <Button variant="outline" className="flex-1 h-12 text-xs gap-1.5" onClick={() => shouldUseNativeCamera() ? pickNative('camera') : cameraRef.current?.click()}>
                      <Camera className="h-4 w-4" /> Take Photo
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 h-12 text-xs gap-1.5" onClick={() => shouldUseNativeCamera() ? pickNative('prompt') : galleryRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" /> {HIDE_DIRECT_CAMERA ? 'Add Photo' : 'Gallery'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issue reporting — on_site only */}
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
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" onClick={() => { setShowIssueForm(false); setIssueText(''); }}>
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
        </TabsContent>

        {/* ═══ DETAILS TAB ═══ */}
        <TabsContent value="details" className="space-y-3 mt-3">
          {/* Customer card */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
              {customer ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{customer.first_name} {customer.last_name}</p>
                  {customer.company_name && <p className="text-xs text-muted-foreground">{customer.company_name}</p>}
                  {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="text-xs text-primary font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {customer.phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No customer linked</p>
              )}
            </CardContent>
          </Card>

          {/* Property card */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Property</p>
              {property ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{property.property_name}</p>
                  {fullAddress && <p className="text-xs text-muted-foreground">{fullAddress}</p>}
                  {property.access_notes && (
                    <div className="pt-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Access Notes</p>
                      <p className="text-xs">{property.access_notes}</p>
                    </div>
                  )}
                  {property.gate_code && (
                    <p className="text-xs"><span className="font-medium">Gate code:</span> {property.gate_code}</p>
                  )}
                  {property.caution_notes && (
                    <div className="pt-1 text-xs text-destructive">
                      <p className="font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Caution</p>
                      <p>{property.caution_notes}</p>
                    </div>
                  )}
                  {property.seasonal_notes && (
                    <div className="pt-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Seasonal Notes</p>
                      <p className="text-xs">{property.seasonal_notes}</p>
                    </div>
                  )}
                  {fullAddress && (
                    <Button variant="outline" size="sm" className="mt-2 h-8 text-xs gap-1.5" onClick={() => openDirections(property)}>
                      <Navigation className="h-3 w-3" /> Get Directions
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No property linked</p>
              )}
            </CardContent>
          </Card>

          {/* Job card */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Job</p>
              {job ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{job.job_title}</p>
                  <p className="text-xs text-muted-foreground">{job.job_number} · {job.service_category} · {job.service_frequency || 'One-time'}</p>
                  {job.scope_of_work && (
                    <div className="pt-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Scope</p>
                      <p className="text-xs whitespace-pre-wrap">{job.scope_of_work}</p>
                    </div>
                  )}
                  {job.service_instructions && (
                    <div className="pt-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Instructions</p>
                      <p className="text-xs whitespace-pre-wrap">{job.service_instructions}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No job linked</p>
              )}
            </CardContent>
          </Card>

          {/* Visit metadata */}
          <Card>
            <CardContent className="p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Visit Info</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Visit #</span>
                <span className="font-medium">{visit.visit_number}</span>
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{visit.service_date}</span>
                <span className="text-muted-foreground">Status</span>
                <span><StatusBadge status={visit.visit_status} showIcon={false} /></span>
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{visit.visit_type || '—'}</span>
                {visit.arrival_time && (
                  <>
                    <span className="text-muted-foreground">Arrived</span>
                    <span className="font-medium">{new Date(visit.arrival_time).toLocaleTimeString()}</span>
                  </>
                )}
                {visit.completion_time && (
                  <>
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">{new Date(visit.completion_time).toLocaleTimeString()}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ NOTES TAB ═══ */}
        <TabsContent value="notes" className="space-y-3 mt-3">
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
                  disabled={execState === 'completed'}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Cloud className="h-2.5 w-2.5" /> Weather
                  </label>
                  <Input value={weatherNotes} onChange={e => setWeatherNotes(e.target.value)} placeholder="e.g. Snow, -5C" className="mt-1 h-9 text-sm" disabled={execState === 'completed'} />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Snowflake className="h-2.5 w-2.5" /> Snow Depth
                  </label>
                  <Input value={snowDepth} onChange={e => setSnowDepth(e.target.value)} placeholder="e.g. 15cm" className="mt-1 h-9 text-sm" disabled={execState === 'completed'} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Crew Notes (internal)</label>
                <Textarea value={crewNotes} onChange={e => setCrewNotes(e.target.value)} placeholder="Internal notes..." rows={2} className="mt-1 text-sm" disabled={execState === 'completed'} />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Customer-Visible Notes</label>
                <Textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Customer will see this..." rows={2} className="mt-1 text-sm" disabled={execState === 'completed'} />
              </div>

              {execState !== 'completed' && (
                <Button size="sm" onClick={saveNotes} disabled={noteSaving} className="w-full h-9 text-xs gap-1.5">
                  {noteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StickyNote className="h-3.5 w-3.5" />}
                  Save Notes
                </Button>
              )}

              {/* Display saved notes for completed visits */}
              {execState === 'completed' && !serviceSummary && !crewNotes && !customerNotes && (
                <p className="text-xs text-muted-foreground text-center py-2">No notes recorded for this visit.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" {...(HIDE_DIRECT_CAMERA ? {} : { capture: 'environment' as any })} className="hidden" onChange={handleInput} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInput} />
    </div>
  );
}
