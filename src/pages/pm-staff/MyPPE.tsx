import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardHat } from 'lucide-react';
import { format } from 'date-fns';

function usePMStaffEquipment() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_staff_equipment', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_equipment_items')
        .select('id, item_type, item_name, serial_number, issued_date, return_date, condition, replacement_requested, notes')
        .eq('user_id', user.id)
        .order('issued_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export default function PMStaffMyPPEPage() {
  const { data = [], isLoading } = usePMStaffEquipment();
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <HardHat className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">My PPE / Equipment</h2>
      </div>
      <p className="text-xs text-muted-foreground">Items assigned to you (phone, laptop, keys, ID, PPE, etc.). Contact admin to request replacements.</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No equipment assigned to you yet.</CardContent></Card>
      ) : (
        data.map((e: any) => (
          <Card key={e.id}>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.item_name || e.item_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.item_type}
                    {e.serial_number && ` · SN ${e.serial_number}`}
                  </p>
                  {e.issued_date && (
                    <p className="text-xs text-muted-foreground">Issued {format(new Date(e.issued_date), 'MMM d, yyyy')}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {e.return_date ? (
                    <Badge variant="secondary" className="text-[10px]">Returned</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-emerald-600">Active</Badge>
                  )}
                  {e.replacement_requested && (
                    <Badge variant="destructive" className="text-[10px]">Replacement requested</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
