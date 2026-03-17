import { useAuth } from '@/hooks/useAuth';
import { useSubcontractorProfile, useSubcontractorAssignments, useSubcontractorInvoices } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { CalendarDays, Receipt, FileText, ChevronRight, MapPin, Clock, CheckCircle, AlertTriangle, Briefcase } from 'lucide-react';

export default function SubcontractorHome() {
  const { user } = useAuth();
  const { data: profile } = useSubcontractorProfile();
  const { data: assignments = [] } = useSubcontractorAssignments(profile?.id);
  const { data: invoices = [] } = useSubcontractorInvoices(profile?.id);

  const firstName = profile?.contact_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAssignments = assignments.filter((a: any) => a.visits?.service_date === todayStr);
  const pendingInvoices = invoices.filter((i: any) => i.status === 'submitted' || i.status === 'pending');

  // Compliance alerts
  const complianceAlerts: string[] = [];
  if (profile) {
    if (profile.insurance_status === 'expired' || profile.insurance_status === 'missing') complianceAlerts.push('Insurance');
    if (profile.wcb_status === 'expired' || profile.wcb_status === 'missing') complianceAlerts.push('WCB');
    if (profile.business_license_status === 'expired' || profile.business_license_status === 'missing') complianceAlerts.push('Business License');
    if (profile.agreement_signed_status === 'missing') complianceAlerts.push('Agreement');
  }

  return (
    <div className="space-y-3 px-4 pt-6 pb-4">
      <div>
        <p className="text-lg font-bold text-foreground">Welcome, {firstName}</p>
        <p className="text-xs text-muted-foreground">{profile?.company_name || 'Subcontractor Portal'}</p>
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

      {/* Today Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-2.5 text-center">
          <Briefcase className="h-4 w-4 text-primary mx-auto mb-0.5" />
          <p className="text-xl font-bold text-foreground">{todayAssignments.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Today</p>
        </CardContent></Card>
        <Card><CardContent className="p-2.5 text-center">
          <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-0.5" />
          <p className="text-xl font-bold text-foreground">{assignments.filter((a: any) => a.assignment_status === 'completed').length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="p-2.5 text-center">
          <Receipt className="h-4 w-4 text-amber-600 mx-auto mb-0.5" />
          <p className="text-xl font-bold text-foreground">{pendingInvoices.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pending $</p>
        </CardContent></Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/subcontractor/schedule" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border active:bg-muted transition-colors">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-medium text-foreground">Schedule</span>
        </Link>
        <Link to="/subcontractor/invoices" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border active:bg-muted transition-colors">
          <Receipt className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-medium text-foreground">Invoices</span>
        </Link>
        <Link to="/subcontractor/documents" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border active:bg-muted transition-colors">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-medium text-foreground">Documents</span>
        </Link>
      </div>

      {/* Today's Work */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Today's Assignments</h2>
        {todayAssignments.length === 0 ? (
          <Card><CardContent className="py-8 text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No assignments today</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {todayAssignments.map((a: any) => (
              <Link key={a.id} to={a.visits?.id ? `/subcontractor/visit/${a.visits.id}` : '#'}>
                <Card className="active:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.visits?.visit_number || 'Assignment'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{a.visits?.properties?.property_name || '—'}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{a.assignment_status}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Recent Invoices</h2>
            <Link to="/subcontractor/invoices" className="text-[11px] text-primary font-medium flex items-center gap-0.5">View all <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {invoices.slice(0, 3).map((inv: any) => (
            <Card key={inv.id} className="mb-1.5">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">${Number(inv.amount).toFixed(2)}</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{inv.status}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
