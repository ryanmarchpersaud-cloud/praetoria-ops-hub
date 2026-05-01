import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WARNING_TYPES } from '@/components/CustomerWarningsEditor';
import { useState } from 'react';

interface Props {
  email?: string | null;
  phone?: string | null;
  /** If true, blocks rendering of children until acknowledged */
  blockChildren?: boolean;
  children?: React.ReactNode;
  /** Optional inline mode (compact) */
  compact?: boolean;
}

/**
 * Detects if an incoming person (by email/phone) matches any flagged
 * customer on the Watchlist. Shows a big red banner with override.
 */
export function FlaggedPersonAlert({ email, phone, blockChildren, children, compact }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);

  const enabled = !!(email?.trim() || phone?.trim());
  const { data: matches = [] } = useQuery({
    queryKey: ['flagged_match', email?.trim().toLowerCase() || '', phone?.trim() || ''],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('match_flagged_customers', {
        _email: email || '',
        _phone: phone || '',
      });
      if (error) throw error;
      const ids = Array.from(new Set((data || []).map((r: any) => r.customer_id)));
      if (ids.length === 0) return [];
      const { data: warns } = await supabase
        .from('customer_warnings')
        .select('id, customer_id, warning_type, severity, description, customers:customer_id(id, first_name, last_name, company_name)')
        .in('customer_id', ids)
        .eq('is_active', true);
      return (warns || []) as any[];
    },
  });

  if (matches.length === 0) {
    return <>{children}</>;
  }

  const byCustomer = new Map<string, any[]>();
  for (const w of matches) {
    const arr = byCustomer.get(w.customer_id) || [];
    arr.push(w);
    byCustomer.set(w.customer_id, arr);
  }

  const banner = (
    <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 space-y-3 shadow-lg animate-fade-in">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold text-destructive uppercase tracking-wide">
            ⚠️ Flagged Customer Detected
          </h3>
          <p className="text-sm text-foreground mt-1">
            This contact info matches a customer on your <strong>Watchlist</strong>. Review their history before proceeding.
          </p>
        </div>
      </div>

      <div className="space-y-2 pl-9">
        {Array.from(byCustomer.entries()).map(([cid, warns]) => {
          const c = warns[0]?.customers;
          const name = c?.company_name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || 'Unknown';
          return (
            <div key={cid} className="bg-background rounded-md border border-destructive/30 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-sm">{name}</p>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <Link to={`/customers/${cid}`} target="_blank">
                    Open file <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {warns.map((w: any) => {
                  const t = WARNING_TYPES.find(x => x.value === w.warning_type);
                  return (
                    <Badge
                      key={w.id}
                      variant={w.severity === 'high' ? 'destructive' : 'secondary'}
                      className={`text-[10px] ${w.severity !== 'high' ? t?.color || '' : ''}`}
                    >
                      {t?.label || w.warning_type}
                    </Badge>
                  );
                })}
              </div>
              {warns.filter((w: any) => w.description).map((w: any) => (
                <p key={w.id} className="text-[11px] text-muted-foreground mt-1">• {w.description}</p>
              ))}
            </div>
          );
        })}
      </div>

      {blockChildren && !acknowledged && (
        <div className="pl-9 pt-2 border-t border-destructive/30">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setAcknowledged(true)}
            className="font-bold"
          >
            I Acknowledge — Proceed Anyway
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1">
            Your acknowledgement will be logged.
          </p>
        </div>
      )}
    </div>
  );

  if (compact) return banner;

  if (blockChildren && !acknowledged) {
    return banner;
  }

  return (
    <div className="space-y-3">
      {banner}
      {children}
    </div>
  );
}
