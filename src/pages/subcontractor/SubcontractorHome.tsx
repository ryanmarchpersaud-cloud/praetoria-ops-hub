import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubcontractorProfile, useSubcontractorAssignments, useSubcontractorInvoices } from '@/hooks/useSubcontractor';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Link, useNavigate } from 'react-router-dom';
import { DailyRouteMap, type RouteStop } from '@/components/DailyRouteMap';
import {
  CalendarDays, Receipt, FileText, ChevronRight, MapPin, CheckCircle,
  AlertTriangle, Briefcase, ShieldCheck, Clock, Truck, DollarSign,
  Navigation, Phone, Plus, UserPlus, ClipboardList, Home, Send,
  CalendarPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateRequestDialog } from '@/components/CreateRequestDialog';
import CreateVisitDialog from '@/components/CreateVisitDialog';

type QuickBookAction = 'visit' | 'job' | 'customer' | 'property' | 'lead' | 'quote' | 'invoice' | 'request' | 'incident';

const QUICK_BOOK_ITEMS: { label: string; icon: any; action: QuickBookAction; color: string }[] = [
  { label: 'New Visit', icon: ClipboardList, action: 'visit', color: 'text-blue-600' },
  { label: 'New Job', icon: Briefcase, action: 'job', color: 'text-indigo-600' },
  { label: 'New Customer', icon: UserPlus, action: 'customer', color: 'text-emerald-600' },
  { label: 'New Property', icon: Home, action: 'property', color: 'text-amber-600' },
  { label: 'New Lead', icon: Send, action: 'lead', color: 'text-violet-600' },
  { label: 'New Quote', icon: FileText, action: 'quote', color: 'text-cyan-600' },
  { label: 'New Invoice', icon: Receipt, action: 'invoice', color: 'text-rose-600' },
  { label: 'New Request', icon: CalendarPlus, action: 'request', color: 'text-orange-600' },
  { label: 'New Incident', icon: AlertTriangle, action: 'incident', color: 'text-red-600' },
];
import { TodayWorkOverviewDialog } from '@/components/TodayWorkOverviewDialog';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday() {
  return new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function SubcontractorHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useSubcontractorProfile();
  const { data: assignments = [] } = useSubcontractorAssignments(profile?.id);
  const { data: invoices = [] } = useSubcontractorInvoices(profile?.id);

  const [visitOpen, setVisitOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const handleQuickBookAction = (action: QuickBookAction) => {
    switch (action) {
      case 'visit': setVisitOpen(true); break;
      case 'job': navigate('/subcontractor/schedule'); break;
      case 'customer': navigate('/subcontractor/company'); break;
      case 'property': navigate('/subcontractor/company'); break;
      case 'lead': navigate('/subcontractor/company'); break;
      case 'quote': navigate('/subcontractor/invoices'); break;
      case 'invoice': navigate('/subcontractor/invoices/new'); break;
      case 'request': setRequestOpen(true); break;
      case 'incident': navigate('/subcontractor/incidents/new'); break;
    }
  };

  const firstName = profile?.contact_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAssignments = assignments.filter((a: any) => a.visits?.service_date === todayStr);
  const pendingInvoices = invoices.filter((i: any) => i.status === 'submitted' || i.status === 'pending');
  const completedAssignments = assignments.filter((a: any) => a.assignment_status === 'completed');

  // Compliance alerts
  const complianceAlerts: string[] = [];
  if (profile) {
    if (profile.insurance_status === 'expired' || profile.insurance_status === 'missing') complianceAlerts.push('Insurance');
    if (profile.wcb_status === 'expired' || profile.wcb_status === 'missing') complianceAlerts.push('WCB');
    if (profile.business_license_status === 'expired' || profile.business_license_status === 'missing') complianceAlerts.push('Business License');
    if (profile.agreement_signed_status === 'missing') complianceAlerts.push('Agreement');
  }

  // Earnings
  const totalEarnings = invoices
    .filter((i: any) => i.status === 'paid')
    .reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'border-l-blue-500';
      case 'en_route': return 'border-l-amber-500';
      case 'in_progress': return 'border-l-violet-500';
      case 'completed': return 'border-l-emerald-500';
      default: return 'border-l-muted-foreground';
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'en_route': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'in_progress': return 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
      case 'completed': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3 px-4 pt-6 pb-4">
      <TodayWorkOverviewDialog visitCount={todayAssignments.length} scheduleRoute="/subcontractor/schedule" storageKey="sub_work_overview" />
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <div className="flex items-center gap-3 mb-1">
          <AvatarUpload
            currentUrl={(profile as any)?.profile_photo_url}
            initials={firstName.charAt(0).toUpperCase()}
            onUploaded={async (url) => {
              if (!profile) return;
              await supabase.from('subcontractors').update({ profile_photo_url: url }).eq('id', profile.id);
              queryClient.invalidateQueries({ queryKey: ['subcontractor_profile'] });
            }}
            size="sm"
          />
          <div>
            <p className="text-lg font-bold">{getGreeting()}, {firstName}</p>
            <p className="text-xs opacity-80">{profile?.company_name || 'Subcontractor Portal'}</p>
          </div>
        </div>
        <p className="text-[11px] opacity-70 mt-1 flex items-center gap-1">
          <CalendarDays className="h-3 w-3" /> {formatToday()}
        </p>
      </div>

      {/* Compliance Alert */}
      {complianceAlerts.length > 0 && (
        <Link to="/subcontractor/compliance">
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <CardContent className="p-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Compliance Action Required</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70">{complianceAlerts.join(' · ')}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-600 shrink-0 mt-1" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Today Summary — tinted stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40">
          <CardContent className="p-2.5 text-center">
            <Briefcase className="h-4 w-4 text-blue-600 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-foreground">{todayAssignments.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Today</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40">
          <CardContent className="p-2.5 text-center">
            <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-foreground">{completedAssignments.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40">
          <CardContent className="p-2.5 text-center">
            <Receipt className="h-4 w-4 text-amber-600 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-foreground">{pendingInvoices.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pending $</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions — action tile system */}
      <div className="grid grid-cols-4 gap-2">
        <Link to="/subcontractor/schedule" className="action-tile action-tile-blue">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <span className="text-[10px] font-medium text-foreground">Schedule</span>
        </Link>
        <Link to="/subcontractor/invoices" className="action-tile action-tile-emerald">
          <Receipt className="h-5 w-5 text-emerald-600" />
          <span className="text-[10px] font-medium text-foreground">Invoices</span>
        </Link>
        <Link to="/subcontractor/emergency-safety" className="action-tile action-tile-rose">
          <ShieldCheck className="h-5 w-5 text-rose-600" />
          <span className="text-[10px] font-medium text-foreground">Emergency</span>
        </Link>
        <Link to="/subcontractor/compliance" className="action-tile action-tile-amber">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <span className="text-[10px] font-medium text-foreground">Compliance</span>
        </Link>
      </div>

      {/* Earnings Card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border-emerald-100 dark:from-emerald-950/20 dark:to-emerald-950/10 dark:border-emerald-900/30">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Paid</p>
              <p className="text-lg font-bold text-foreground">${totalEarnings.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <Link to="/subcontractor/payments" className="text-[11px] text-primary font-medium flex items-center gap-0.5">
            Details <ChevronRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* Today's Work */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Today's Assignments</h2>
        {todayAssignments.length === 0 ? (
          <Card><CardContent className="py-8 text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No assignments today</p>
            <Link to="/subcontractor/schedule" className="text-xs text-primary mt-1 inline-block">View schedule →</Link>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {todayAssignments.map((a: any) => (
              <Link key={a.id} to={a.visits?.id ? `/subcontractor/visit/${a.visits.id}` : '#'}>
                <Card className={cn(
                  'active:shadow-sm transition-shadow border-l-4',
                  statusColor(a.assignment_status)
                )}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-foreground">{a.visits?.visit_number || 'Assignment'}</p>
                        <span className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
                          statusBg(a.assignment_status)
                        )}>
                          {a.assignment_status?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />{a.visits?.properties?.property_name || '—'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Book */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-primary" />
          Quick Book
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_BOOK_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => handleQuickBookAction(item.action)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition-all"
            >
              <item.icon className={cn('h-5 w-5', item.color)} />
              <span className="text-[10px] font-medium text-foreground text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <CreateVisitDialog open={visitOpen} onOpenChange={setVisitOpen} />
      <CreateRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />

      {todayAssignments.length > 0 && (
        <DailyRouteMap
          stops={todayAssignments.map((a: any): RouteStop => ({
            id: a.id,
            label: `${a.visits?.visit_number || 'Assignment'} — ${a.visits?.properties?.property_name || 'Site'}`,
            address: a.visits?.properties?.address_line_1 || '',
            city: a.visits?.properties?.city,
            status: a.assignment_status,
          }))}
        />
      )}


      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Recent Invoices</h2>
            <Link to="/subcontractor/invoices" className="text-[11px] text-primary font-medium flex items-center gap-0.5">View all <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {invoices.slice(0, 3).map((inv: any) => {
            const invStatusBg = inv.status === 'paid'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : inv.status === 'approved'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : inv.status === 'rejected'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            return (
              <Card key={inv.id} className="mb-1.5">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">${Number(inv.amount).toFixed(2)}</p>
                  </div>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full capitalize', invStatusBg)}>
                    {inv.status}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
