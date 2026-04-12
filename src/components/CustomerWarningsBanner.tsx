import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WARNING_TYPES } from '@/components/CustomerWarningsEditor';

interface CustomerWarningsBannerProps {
  customerId: string | undefined | null;
}

export function CustomerWarningsBanner({ customerId }: CustomerWarningsBannerProps) {
  const { data: warnings = [] } = useQuery({
    queryKey: ['customer_warnings_active', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data } = await supabase
        .from('customer_warnings')
        .select('id, warning_type, severity, description')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('severity', { ascending: true });
      return data || [];
    },
    enabled: !!customerId,
  });

  if (warnings.length === 0) return null;

  const hasHigh = warnings.some(w => w.severity === 'high');

  return (
    <div className={`rounded-lg border p-3 space-y-1.5 ${
      hasHigh
        ? 'border-destructive/50 bg-destructive/5'
        : 'border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10'
    }`}>
      <div className="flex items-center gap-1.5">
        <AlertTriangle className={`h-3.5 w-3.5 ${hasHigh ? 'text-destructive' : 'text-amber-600'}`} />
        <span className={`text-xs font-semibold ${hasHigh ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}`}>
          Customer Alerts ({warnings.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {warnings.map(w => {
          const typeInfo = WARNING_TYPES.find(t => t.value === w.warning_type);
          return (
            <Badge key={w.id} variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${typeInfo?.color || ''}`}>
              {typeInfo?.label || w.warning_type}
            </Badge>
          );
        })}
      </div>
      {warnings.some(w => w.description) && (
        <div className="space-y-0.5">
          {warnings.filter(w => w.description).map(w => (
            <p key={w.id} className="text-[11px] text-muted-foreground">• {w.description}</p>
          ))}
        </div>
      )}
    </div>
  );
}
