import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Plus, Trash2, Loader2 } from 'lucide-react';

export const WARNING_TYPES = [
  { value: 'payment_issue', label: '💳 Payment Issue', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'complaint', label: '📢 Complaint', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'aggressive', label: '⚠️ Aggressive Behavior', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'access_issue', label: '🔒 Access Issue', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'scheduling', label: '🕐 Scheduling Restriction', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'dogs_pets', label: '🐕 Dogs / Pets on Site', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'safety_risk', label: '🔫 Safety Risk', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'children', label: '👶 Children on Property', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  { value: 'elderly_vulnerable', label: '🧓 Elderly / Vulnerable', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'language_barrier', label: '🌐 Language Barrier', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { value: 'parking_restriction', label: '🚗 Parking Restriction', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'surveillance', label: '📷 Surveillance / Cameras', color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' },
  { value: 'vip', label: '⭐ VIP / Priority Client', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'general', label: '📝 General Note', color: 'bg-muted text-muted-foreground' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'border-muted-foreground/30' },
  { value: 'medium', label: 'Medium', color: 'border-amber-400' },
  { value: 'high', label: 'High', color: 'border-destructive' },
];

interface Warning {
  id: string;
  customer_id: string;
  warning_type: string;
  severity: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface CustomerWarningsEditorProps {
  customerId: string;
}

export function CustomerWarningsEditor({ customerId }: CustomerWarningsEditorProps) {
  const { toast } = useToast();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newWarning, setNewWarning] = useState({
    warning_type: 'general',
    severity: 'medium',
    description: '',
  });

  const loadWarnings = async () => {
    const { data } = await supabase
      .from('customer_warnings')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setWarnings((data as Warning[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadWarnings(); }, [customerId]);

  const handleAdd = async () => {
    if (!newWarning.description?.trim()) {
      toast({ title: 'Description is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('customer_warnings').insert({
        customer_id: customerId,
        warning_type: newWarning.warning_type,
        severity: newWarning.severity,
        description: newWarning.description,
        is_active: true,
      } as any);
      if (error) throw error;
      toast({ title: 'Warning added' });
      setShowAdd(false);
      setNewWarning({ warning_type: 'general', severity: 'medium', description: '' });
      loadWarnings();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    const { error } = await supabase.from('customer_warnings').update({ is_active: !currentlyActive } as any).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    loadWarnings();
  };

  const deleteWarning = async (id: string) => {
    const { error } = await supabase.from('customer_warnings').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Warning removed' });
    loadWarnings();
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading warnings...</p>;

  const activeWarnings = warnings.filter(w => w.is_active);
  const inactiveWarnings = warnings.filter(w => !w.is_active);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Customer Warnings ({activeWarnings.length})
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3" /> Add Warning
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No warnings on file. Click "Add Warning" to flag issues.</p>
        ) : (
          <>
            {activeWarnings.map(w => {
              const typeInfo = WARNING_TYPES.find(t => t.value === w.warning_type) || WARNING_TYPES[5];
              const sevInfo = SEVERITY_LEVELS.find(s => s.value === w.severity) || SEVERITY_LEVELS[0];
              return (
                <div key={w.id} className={`p-2.5 rounded-md border-l-[3px] ${sevInfo.color} bg-card border border-border`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${typeInfo.color}`}>
                          {typeInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {sevInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground">{w.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Added {new Date(w.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => toggleActive(w.id, w.is_active)}>
                        <span className="text-[10px]">{w.is_active ? 'Resolve' : 'Reopen'}</span>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteWarning(w.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {inactiveWarnings.length > 0 && (
              <details className="mt-2">
                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                  {inactiveWarnings.length} resolved warning{inactiveWarnings.length > 1 ? 's' : ''}
                </summary>
                <div className="space-y-1.5 mt-1.5 opacity-60">
                  {inactiveWarnings.map(w => {
                    const typeInfo = WARNING_TYPES.find(t => t.value === w.warning_type) || WARNING_TYPES[5];
                    return (
                      <div key={w.id} className="p-2 rounded-md border bg-muted/30 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${typeInfo.color}`}>{typeInfo.label}</Badge>
                          <p className="text-xs text-muted-foreground line-through mt-0.5">{w.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" onClick={() => toggleActive(w.id, w.is_active)}>Reopen</Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteWarning(w.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>

      {/* Add Warning Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Add Customer Warning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Warning Type</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {WARNING_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setNewWarning(prev => ({ ...prev, warning_type: t.value }))}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      newWarning.warning_type === t.value
                        ? `${t.color} border-current font-medium`
                        : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <div className="flex gap-2 mt-1">
                {SEVERITY_LEVELS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setNewWarning(prev => ({ ...prev, severity: s.value }))}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      newWarning.severity === s.value
                        ? 'bg-primary/10 border-primary text-primary font-medium'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Description *</Label>
              <Textarea
                value={newWarning.description}
                onChange={e => setNewWarning(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Describe the issue..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !newWarning.description.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
