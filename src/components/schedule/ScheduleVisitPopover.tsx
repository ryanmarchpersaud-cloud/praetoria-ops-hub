import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateVisit } from '@/hooks/useVisits';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays, Phone, MapPin, CheckSquare, MoreHorizontal,
  Pencil, Trash2, Mail, MessageSquare, ExternalLink, Navigation, Briefcase, User, UserPlus, Check
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ScheduleVisitPopoverProps {
  visit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleVisitPopover({ visit, open, onOpenChange }: ScheduleVisitPopoverProps) {
  const updateVisit = useUpdateVisit();
  const { data: employees = [] } = useEmployees();
  const { toast } = useToast();
  const [tab, setTab] = useState('info');

  if (!visit) return null;

  const assignedWorker = (employees as any[]).find(e => e.user_id === visit.assigned_worker_id);
  const assignedName = assignedWorker?.full_name || visit.worker_profiles?.full_name || null;

  const handleAssign = async (workerId: string | null) => {
    try {
      await updateVisit.mutateAsync({ id: visit.id, assigned_worker_id: workerId });
      toast({
        title: workerId ? 'Worker assigned' : 'Worker unassigned',
        description: workerId
          ? `${(employees as any[]).find(e => e.user_id === workerId)?.full_name || 'Worker'} is now on this visit.`
          : undefined,
      });
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
          {visit.visit_status !== 'Completed' && visit.visit_status !== 'Cancelled' && (
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
              <DropdownMenuItem
                onClick={handleDelete}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Cancel Visit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
    </Dialog>
  );
}
