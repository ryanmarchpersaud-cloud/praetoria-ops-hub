import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Building2 } from 'lucide-react';
import { toast } from 'sonner';

type PMRole = 'none' | 'leasing_agent' | 'property_manager';

interface Props {
  userId: string;
  onChanged?: () => void;
}

/**
 * Compact admin control for assigning the Property Management portal role
 * (leasing_agent or property_manager) to an existing employee/staff user.
 *
 * - Reads current PM role from user_roles.
 * - Writes via direct upsert/delete on user_roles (admin RLS required).
 * - Does NOT touch worker/subcontractor/admin/finance/HR roles or portal flags.
 * - Assigning a PM role gives the user access to /pm-staff. Set to "None" to revoke.
 */
export function PMStaffRoleSection({ userId, onChanged }: Props) {
  const [current, setCurrent] = useState<PMRole>('none');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['leasing_agent', 'property_manager'] as any);
      if (cancelled) return;
      const roles = (data ?? []).map((r: any) => r.role);
      if (roles.includes('property_manager')) setCurrent('property_manager');
      else if (roles.includes('leasing_agent')) setCurrent('leasing_agent');
      else setCurrent('none');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleChange = async (next: PMRole) => {
    if (next === current) return;
    setSaving(true);
    try {
      // Remove any existing PM role rows first
      const { error: delErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', ['leasing_agent', 'property_manager'] as any);
      if (delErr) throw delErr;

      if (next !== 'none') {
        const { error: insErr } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: next as any });
        if (insErr) throw insErr;
      }

      setCurrent(next);
      toast.success(
        next === 'none'
          ? 'PM Staff role removed'
          : `Assigned as ${next === 'property_manager' ? 'Property Manager' : 'Leasing Agent'}`
      );
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update PM role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-emerald-700" />
        <Label className="text-xs font-semibold text-emerald-900">PM Staff Role (Property Management Portal)</Label>
        {current !== 'none' && (
          <Badge className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">
            <KeyRound className="h-3 w-3 mr-1" />
            {current === 'property_manager' ? 'Property Manager' : 'Leasing Agent'}
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-emerald-900/70 leading-relaxed">
        Grants access to <code className="bg-white/60 px-1 rounded">/pm-staff</code> (leasing dashboard, vacancies,
        prospects, showings, applications, move-ins, move-outs, tasks). PM staff self-service is own-row only —
        they cannot see other employees' pay stubs, SIN, banking, HR or payroll records. Does not grant admin,
        finance, HR, worker, or subcontractor access.
      </p>
      <Select value={current} onValueChange={(v) => handleChange(v as PMRole)} disabled={loading || saving}>
        <SelectTrigger className="h-9 bg-white">
          <SelectValue placeholder="Select PM role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None — no PM portal access</SelectItem>
          <SelectItem value="leasing_agent">Leasing Agent</SelectItem>
          <SelectItem value="property_manager">Property Manager</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
