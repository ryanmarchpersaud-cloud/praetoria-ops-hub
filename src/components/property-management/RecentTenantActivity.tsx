import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
  Wrench, ShieldCheck, FileText, MessageSquare, AlertTriangle, ArrowRight, Inbox,
} from 'lucide-react';

type ActivityItem = {
  id: string;
  kind: 'maintenance' | 'insurance' | 'document' | 'notice';
  title: string;
  subtitle?: string | null;
  urgent?: boolean;
  createdAt: string;
  href: string;
  tenantName?: string | null;
};

function useRecentTenantActivity() {
  return useQuery({
    queryKey: ['pm', 'recent-tenant-activity'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const [reqRes, insRes, docRes, notRes] = await Promise.all([
        (supabase as any)
          .from('pm_maintenance_requests')
          .select('id, title, category, issue_label, is_urgent_safety, status, created_at, tenant:pm_tenants(display_name, first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(15),
        (supabase as any)
          .from('pm_tenant_insurance')
          .select('id, provider, policy_number, created_at, tenant:pm_tenants(display_name, first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(10),
        (supabase as any)
          .from('pm_tenant_documents')
          .select('id, title, doc_type, created_at, tenant:pm_tenants(display_name, first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(10),
        (supabase as any)
          .from('pm_tenant_notices')
          .select('id, subject, notice_type, created_at, tenant:pm_tenants(display_name, first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const tenantName = (t: any) =>
        t?.display_name || [t?.first_name, t?.last_name].filter(Boolean).join(' ') || null;

      const items: ActivityItem[] = [];

      (reqRes.data ?? []).forEach((r: any) => items.push({
        id: `mr-${r.id}`,
        kind: 'maintenance',
        title: r.issue_label || r.title || 'Maintenance request',
        subtitle: r.category ? `${r.category}${r.status ? ` · ${r.status}` : ''}` : r.status,
        urgent: !!r.is_urgent_safety,
        createdAt: r.created_at,
        href: `/property-management/maintenance/${r.id}`,
        tenantName: tenantName(r.tenant),
      }));

      (insRes.data ?? []).forEach((r: any) => items.push({
        id: `ins-${r.id}`,
        kind: 'insurance',
        title: `Insurance submitted${r.provider ? ` — ${r.provider}` : ''}`,
        subtitle: r.policy_number ? `Policy ${r.policy_number}` : null,
        createdAt: r.created_at,
        href: `/property-management/tenants`,
        tenantName: tenantName(r.tenant),
      }));

      (docRes.data ?? []).forEach((r: any) => items.push({
        id: `doc-${r.id}`,
        kind: 'document',
        title: r.title || 'Document uploaded',
        subtitle: r.doc_type,
        createdAt: r.created_at,
        href: `/property-management/tenants`,
        tenantName: tenantName(r.tenant),
      }));

      (notRes.data ?? []).forEach((r: any) => items.push({
        id: `not-${r.id}`,
        kind: 'notice',
        title: r.subject || 'Notice',
        subtitle: r.notice_type,
        createdAt: r.created_at,
        href: `/property-management/tenants`,
        tenantName: tenantName(r.tenant),
      }));

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items.slice(0, 25);
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

const KIND_META: Record<ActivityItem['kind'], { icon: any; label: string; tint: string }> = {
  maintenance: { icon: Wrench,        label: 'Maintenance', tint: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  insurance:   { icon: ShieldCheck,   label: 'Insurance',   tint: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  document:    { icon: FileText,      label: 'Document',    tint: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' },
  notice:      { icon: MessageSquare, label: 'Notice',      tint: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
};

export function RecentTenantActivity() {
  const { data = [], isLoading } = useRecentTenantActivity();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Inbox className="h-5 w-5 text-emerald-600" />
            Recent tenant activity
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Maintenance requests, insurance uploads, documents, and notices from tenants — newest first.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/property-management/maintenance">
            All requests
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No tenant activity yet.</p>
        ) : (
          <ul className="max-h-[520px] overflow-y-auto divide-y rounded-md border">
            {data.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="flex items-start gap-3 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className={`p-2 rounded-md shrink-0 ${meta.tint}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">{item.title}</span>
                        {item.urgent && (
                          <Badge variant="destructive" className="h-5 gap-1">
                            <AlertTriangle className="h-3 w-3" /> URGENT
                          </Badge>
                        )}
                        <Badge variant="outline" className="h-5 text-[10px] uppercase tracking-wide">
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.tenantName ? <span className="font-medium text-foreground/80">{item.tenantName}</span> : null}
                        {item.tenantName && item.subtitle ? ' · ' : ''}
                        {item.subtitle}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
