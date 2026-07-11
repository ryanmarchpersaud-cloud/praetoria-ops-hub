import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateVisit } from '@/hooks/useVisits';
import { useEmployees } from '@/hooks/useEmployees';
import {
  useVisitCrew,
  useVisitSubAssignments,
  useAddVisitCrewMember,
  useRemoveVisitCrewMember,
  useAddVisitSubAssignment,
  useRemoveVisitSubAssignment,
  useActiveSubcontractors,
} from '@/hooks/useVisitCrew';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays, Phone, MapPin, CheckSquare, MoreHorizontal,
  Pencil, Trash2, Mail, MessageSquare, ExternalLink, Navigation, Briefcase, User, UserPlus, Check, X, Users, HardHat, Undo2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ReinstateVisitDialog } from '@/components/schedule/ReinstateVisitDialog';
import { CancelVisitDialog } from '@/components/schedule/CancelVisitDialog';

interface ScheduleVisitPopoverProps {
  visit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleVisitPopover({ visit, open, onOpenChange }: ScheduleVisitPopoverProps) {
  const updateVisit = useUpdateVisit();
  const { data: employees = [] } = useEmployees();
  const { data: subcontractors = [] } = useActiveSubcontractors();
  const { data: crew = [] } = useVisitCrew(visit?.id);
  const { data: subAssignments = [] } = useVisitSubAssignments(visit?.id);
  const addCrew = useAddVisitCrewMember();
  const removeCrew = useRemoveVisitCrewMember();
  const addSub = useAddVisitSubAssignment();
  const removeSub = useRemoveVisitSubAssignment();
  const { toast } = useToast();
  const [tab, setTab] = useState('info');
  const [reinstateOpen, setReinstateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!visit) return null;

  const assignedWorker = (employees as any[]).find(e => e.user_id === visit.assigned_worker_id);
  const assignedName = assignedWorker?.full_name || visit.worker_profiles?.full_name || null;
  const crewIds = new Set((crew as any[]).map((c: any) => c.worker_user_id));
  const subIds = new Set((subAssignments as any[]).map((s: any) => s.subcontractor_id));

  const handleSetLead = async (workerId: string | null) => {
    try {
      if (workerId && crewIds.has(workerId)) {
        await removeCrew.mutateAsync({ visitId: visit.id, workerUserId: workerId });
      }
      await updateVisit.mutateAsync({ id: visit.id, assigned_worker_id: workerId });
      toast({
        title: workerId ? 'Lead worker set' : 'Lead worker cleared',
        description: workerId
          ? `${(employees as any[]).find(e => e.user_id === workerId)?.full_name || 'Worker'} is now the lead on this visit.`
          : undefined,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleCrew = async (workerId: string) => {
    try {
      if (crewIds.has(workerId)) {
        await removeCrew.mutateAsync({ visitId: visit.id, workerUserId: workerId });
      } else {
        await addCrew.mutateAsync({ visitId: visit.id, workerUserId: workerId });
        toast({ title: 'Added to crew', description: (employees as any[]).find(e => e.user_id === workerId)?.full_name });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleSub = async (subId: string) => {
    try {
      if (subIds.has(subId)) {
        await removeSub.mutateAsync({ visitId: visit.id, subcontractorId: subId });
      } else {
        await addSub.mutateAsync({ visitId: visit.id, subcontractorId: subId, jobId: visit.job_id ?? null });
        const sub = (subcontractors as any[]).find(s => s.id === subId);
        toast({ title: 'Subcontractor added', description: sub?.company_name || sub?.contact_name });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const customer = visit.customers;
  const property = visit.properties;
  const job = visit.jobs;
  const customerName = customer
    ? `${customer.first_name} ${customer.last_name}`
    : 'Unknown Customer';
  const jobTitle = job?.job_title || 'Visit';
  const title = `${customerName} – ${jobTitle}`;

  const address = property
    ? [property.address_line_1, property.city, property.province, property.postal_code].filter(Boolean).join(', ')
    : null;

  const directionsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : null;

  const handleMarkComplete = async () => {
    try {
      await updateVisit.mutateAsync({ id: visit.id, visit_status: 'Completed' });
      toast({ title: 'Visit marked complete' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    // For safety, we just set it to Cancelled rather than hard deleting
    try {
      await updateVisit.mutateAsync({ id: visit.id, visit_status: 'Cancelled' });
      toast({ title: 'Visit cancelled' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold leading-snug">{title}</DialogTitle>
              {address && (
                <p className="text-xs text-muted-foreground mt-1">{address}</p>
              )}
            </div>
            <StatusBadge status={visit.visit_status || 'Scheduled'} />
          </div>
        </DialogHeader>

        {/* Quick info row */}
        <div className="px-5 pb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {visit.service_date
              ? format(parseISO(visit.service_date + 'T12:00:00'), 'MMM d, yyyy')
              : '—'}
            {visit.arrival_time
              ? ` · ${format(parseISO(visit.arrival_time), 'h:mm a')}`
              : ' · Anytime'}
          </span>
          {customer?.phone && (
            <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </a>
          )}
          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <Navigation className="h-3.5 w-3.5" />
              Directions
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-3 flex gap-2">
          {visit.visit_status === 'Cancelled' ? (
            <Button
              onClick={() => setReinstateOpen(true)}
              className="flex-1 h-10"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Reinstate Visit
            </Button>
          ) : visit.visit_status !== 'Completed' && (
            <Button
              onClick={handleMarkComplete}
              className="flex-1 h-10"
              disabled={updateVisit.isPending}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-1.5">
                <MoreHorizontal className="h-4 w-4" />
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to={`/visits/${visit.id}`} className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" /> Edit Visit
                </Link>
              </DropdownMenuItem>
              {job && (
                <DropdownMenuItem asChild>
                  <Link to={`/jobs/${job.id}`} className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> View Job
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="flex items-center gap-2 opacity-50">
                <MessageSquare className="h-4 w-4" /> Text Reminder
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="flex items-center gap-2 opacity-50">
                <Mail className="h-4 w-4" /> Email Reminder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {visit.visit_status === 'Cancelled' ? (
                <DropdownMenuItem
                  onClick={() => setReinstateOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Undo2 className="h-4 w-4" /> Reinstate Visit
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Cancel Visit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Crew assignment: lead + helpers + subcontractors */}
        <div className="px-5 pb-3 space-y-2">
          {/* Lead worker */}
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lead Worker</p>
                <p className="text-xs font-medium truncate">{assignedName || 'Unassigned'}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={updateVisit.isPending}>
                  {assignedName ? 'Change Lead' : 'Set Lead'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto bg-popover z-50">
                <DropdownMenuItem onClick={() => handleSetLead(null)} className="flex items-center gap-2 text-xs">
                  {!visit.assigned_worker_id ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                  <span>No lead</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {(employees as any[]).length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs">No workers available</DropdownMenuItem>
                ) : (
                  (employees as any[]).map((emp) => {
                    const isCurrent = emp.user_id === visit.assigned_worker_id;
                    return (
                      <DropdownMenuItem
                        key={emp.user_id}
                        onClick={() => handleSetLead(emp.user_id)}
                        className="flex items-center gap-2 text-xs"
                      >
                        {isCurrent ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                        <span className="truncate">{emp.full_name}</span>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Crew + Subs row */}
          <div className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Crew & Subcontractors</p>
                {crew.length === 0 && subAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No additional crew</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(crew as any[]).map((c: any) => {
                      const emp = (employees as any[]).find(e => e.user_id === c.worker_user_id);
                      return (
                        <Badge key={c.id} variant="secondary" className="text-[10px] gap-1 pr-1">
                          {emp?.full_name || 'Worker'}
                          <button
                            onClick={() => handleToggleCrew(c.worker_user_id)}
                            className="hover:bg-destructive/20 rounded-full p-0.5"
                            aria-label="Remove from crew"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      );
                    })}
                    {(subAssignments as any[]).map((sa: any) => {
                      const sub = (subcontractors as any[]).find(s => s.id === sa.subcontractor_id);
                      return (
                        <Badge key={sa.id} variant="outline" className="text-[10px] gap-1 pr-1 border-amber-400/60 text-amber-700 dark:text-amber-300">
                          <HardHat className="h-2.5 w-2.5" />
                          {sub?.company_name || sub?.contact_name || 'Sub'}
                          <button
                            onClick={() => handleToggleSub(sa.subcontractor_id)}
                            className="hover:bg-destructive/20 rounded-full p-0.5"
                            aria-label="Remove subcontractor"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto bg-popover z-50">
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Workers</div>
                {(employees as any[]).filter(e => e.user_id !== visit.assigned_worker_id).length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs">No other workers</DropdownMenuItem>
                ) : (
                  (employees as any[])
                    .filter(e => e.user_id !== visit.assigned_worker_id)
                    .map((emp) => {
                      const inCrew = crewIds.has(emp.user_id);
                      return (
                        <DropdownMenuItem
                          key={emp.user_id}
                          onClick={(e) => { e.preventDefault(); handleToggleCrew(emp.user_id); }}
                          className="flex items-center gap-2 text-xs"
                        >
                          {inCrew ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="w-3.5" />}
                          <span className="truncate">{emp.full_name}</span>
                        </DropdownMenuItem>
                      );
                    })
                )}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Subcontractors</div>
                {(subcontractors as any[]).length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs">No subcontractors</DropdownMenuItem>
                ) : (
                  (subcontractors as any[]).map((sub: any) => {
                    const inAssign = subIds.has(sub.id);
                    return (
                      <DropdownMenuItem
                        key={sub.id}
                        onClick={(e) => { e.preventDefault(); handleToggleSub(sub.id); }}
                        className="flex items-center gap-2 text-xs"
                      >
                        {inAssign ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="w-3.5" />}
                        <HardHat className="h-3 w-3 text-amber-600 shrink-0" />
                        <span className="truncate">{sub.company_name || sub.contact_name}</span>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="border-t">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-9 px-4">
              Info
            </TabsTrigger>
            <TabsTrigger value="client" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-9 px-4">
              Client
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-9 px-4">
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="p-4 space-y-3 mt-0">
            {/* Instructions / service summary */}
            {(visit.service_summary || visit.crew_notes || job?.description) && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Instructions</p>
                <p className="text-xs text-foreground leading-relaxed">
                  {visit.service_summary || visit.crew_notes || job?.description || '—'}
                </p>
              </div>
            )}

            {/* Job / Team / Location grid */}
            <div className="grid grid-cols-2 gap-3">
              {job && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Job</p>
                  <Link to={`/jobs/${job.id}`} className="text-xs text-primary hover:underline">
                    {job.job_number} — {job.job_title}
                  </Link>
                </div>
              )}
              {property && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location</p>
                  <p className="text-xs">{property.property_name}</p>
                  {address && <p className="text-[10px] text-muted-foreground">{address}</p>}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="client" className="p-4 space-y-3 mt-0">
            {customer ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{customerName}</p>
                    {customer.company_name && (
                      <p className="text-xs text-muted-foreground">{customer.company_name}</p>
                    )}
                  </div>
                </div>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {customer.email}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No client information available</p>
            )}
          </TabsContent>

          <TabsContent value="notes" className="p-4 space-y-3 mt-0">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Crew Notes</p>
              <p className="text-xs">{visit.crew_notes || 'None'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer-Visible Notes</p>
              <p className="text-xs">{visit.customer_visible_notes || 'None'}</p>
            </div>
            {visit.weather_notes && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Weather</p>
                <p className="text-xs">{visit.weather_notes}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer: View Details link */}
        <div className="border-t px-5 py-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/visits/${visit.id}`} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> View Details
            </Link>
          </Button>
        </div>
      </DialogContent>
      <ReinstateVisitDialog
        visit={visit}
        open={reinstateOpen}
        onOpenChange={setReinstateOpen}
        onReinstated={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
