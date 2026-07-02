import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, ClipboardList } from 'lucide-react';
import { useMoveInChecklists, useProspects, useCreateRecord, useUpdateRecord } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function MoveIns() {
  const { user } = useAuth();
  const { data = [] } = useMoveInChecklists();
  const { data: prospects = [] } = useProspects();
  const createMut = useCreateRecord('pm_move_in_checklists', ['pm_move_in_checklists']);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ prospect_id: '' });

  const submit = async () => {
    try {
      await createMut.mutateAsync({
        prospect_id: form.prospect_id || null,
        created_by: user?.id,
        assigned_to: user?.id,
      });
      toast.success('Move-in checklist created');
      setOpen(false);
      setForm({ prospect_id: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Move-In Checklists</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>
      {data.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No move-in checklists yet.</CardContent></Card>}
      <div className="space-y-2">
        {data.map(c => (
          <Card key={c.id}>
            <CardContent className="p-3">
              <button className="w-full flex items-center gap-3 text-left" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-5 w-5 text-indigo-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.property?.property_name ?? 'Move-in'}</p>
                  <p className="text-xs text-muted-foreground">Created {new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{formatStatusLabel(c.status)}</Badge>
              </button>
              {expandedId === c.id && <ChecklistItems checklistId={c.id} />}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New move-in checklist</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Prospect (optional)</Label>
              <Select value={form.prospect_id} onValueChange={v => setForm({ ...form, prospect_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select prospect" /></SelectTrigger>
                <SelectContent>{prospects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">The default checklist items will be added automatically.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={submit} disabled={createMut.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistItems({ checklistId }: { checklistId: string }) {
  const { user } = useAuth();
  const updateMut = useUpdateRecord('pm_move_in_checklist_items', ['pm_move_in_checklist_items', checklistId]);
  const { data = [] } = useQuery({
    queryKey: ['pm_move_in_checklist_items', checklistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_move_in_checklist_items' as any)
        .select('*')
        .eq('checklist_id', checklistId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="mt-3 space-y-1 border-t pt-3">
      {data.map(item => (
        <label key={item.id} className="flex items-center gap-2 py-1 cursor-pointer">
          <Checkbox
            checked={item.completed}
            onCheckedChange={(checked) => updateMut.mutate({
              id: item.id,
              patch: {
                completed: !!checked,
                completed_by: checked ? user?.id : null,
                completed_at: checked ? new Date().toISOString() : null,
              },
            })}
          />
          <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
        </label>
      ))}
    </div>
  );
}
