import { useWorkerEquipment } from '@/hooks/useWorkerTaxDocs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HardHat, Wrench, Smartphone, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const conditionColors: Record<string, string> = {
  good: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  fair: 'bg-amber-500/10 text-amber-700 border-amber-200',
  damaged: 'bg-destructive/10 text-destructive border-destructive/20',
  returned: 'bg-muted text-muted-foreground',
};

const typeIcons: Record<string, React.ElementType> = {
  ppe: HardHat,
  tool: Wrench,
  device: Smartphone,
};

export default function WorkerPPEPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useWorkerEquipment();

  // Workers can only request replacement for their own items — no issue/assign/edit actions
  const handleReplacementRequest = async (id: string) => {
    const { error } = await supabase
      .from('worker_equipment_items')
      .update({ replacement_requested: true })
      .eq('id', id)
      .eq('user_id', user?.id ?? '');
    if (error) {
      toast({ title: 'Failed to request replacement', variant: 'destructive' });
    } else {
      toast({ title: 'Replacement requested' });
      qc.invalidateQueries({ queryKey: ['worker_equipment'] });
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  const activeItems = items.filter((i: any) => i.condition !== 'returned');
  const returnedItems = items.filter((i: any) => i.condition === 'returned');

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">PPE & Equipment</h1>
      <p className="text-xs text-muted-foreground">Equipment issued to you by your manager. Contact your supervisor to request new items.</p>

      {/* Active Items — view only + request replacement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardHat className="h-4 w-4" /> Issued Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No equipment currently issued.</p>
          ) : (
            <div className="space-y-2.5">
              {activeItems.map((item: any) => {
                const Icon = typeIcons[item.item_type] || HardHat;
                return (
                  <div key={item.id} className="py-2 border-b last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.item_type}
                            {item.serial_number && ` · S/N: ${item.serial_number}`}
                          </p>
                          {item.issued_date && (
                            <p className="text-xs text-muted-foreground">
                              Issued: {format(new Date(item.issued_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${conditionColors[item.condition] ?? ''}`}>
                        {item.condition}
                      </Badge>
                    </div>
                    {/* Worker action: request replacement for damaged/fair items */}
                    {!item.replacement_requested && item.condition !== 'good' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-7 text-xs"
                        onClick={() => handleReplacementRequest(item.id)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Request Replacement
                      </Button>
                    )}
                    {item.replacement_requested && (
                      <p className="text-xs text-amber-600 mt-1">⏳ Replacement requested</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Returned Items — view only */}
      {returnedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Returned Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {returnedItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <p className="text-sm text-muted-foreground">{item.item_name}</p>
                  {item.return_date && (
                    <p className="text-xs text-muted-foreground">{format(new Date(item.return_date), 'MMM d, yyyy')}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
