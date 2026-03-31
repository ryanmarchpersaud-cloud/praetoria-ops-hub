import { useState } from 'react';
import { useChecklistTemplates, useChecklistAssignments, useUpsertTemplate, useAssignChecklist, useUpdateChecklistProgress } from '@/hooks/useHRModules';
import { HRFileAttachments } from '@/components/hr/HRFileAttachments';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, ClipboardList, UserPlus, UserX, Trash2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function TemplateForm({ onSave, onCancel }: { onSave: (t: any) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('onboarding');
  const [itemText, setItemText] = useState('');
  const [items, setItems] = useState<string[]>([]);

  const addItem = () => { if (itemText.trim()) { setItems([...items, itemText.trim()]); setItemText(''); } };

  return (
    <div className="space-y-3">
      <div><Label>Template Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Hire Onboarding" /></div>
      <div><Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="offboarding">Offboarding</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Checklist Items</Label>
        <div className="flex gap-2"><Input value={itemText} onChange={e => setItemText(e.target.value)} placeholder="Add a step..." onKeyDown={e => e.key === 'Enter' && addItem()} /><Button variant="outline" onClick={addItem}><Plus className="h-4 w-4" /></Button></div>
        <ul className="mt-2 space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 text-sm px-2 py-1 bg-muted rounded">
              <span className="flex-1">{it}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave({ name, checklist_type: type, items })} disabled={!name || items.length === 0}>Create Template</Button>
      </div>
    </div>
  );
}

export default function HRChecklistsPage() {
  const { data: templates = [], isLoading: loadT } = useChecklistTemplates();
  const { data: assignments = [], isLoading: loadA } = useChecklistAssignments();
  const { data: employees = [] } = useEmployees();
  const upsertTmpl = useUpsertTemplate();
  const assignMut = useAssignChecklist();
  const updateProgress = useUpdateChecklistProgress();
  const [tmplDialogOpen, setTmplDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const getEmpName = (uid: string) => employees.find(e => e.user_id === uid)?.full_name ?? 'Unknown';

  const handleCreateTemplate = async (t: any) => {
    try { await upsertTmpl.mutateAsync(t); toast.success('Template created'); setTmplDialogOpen(false); } catch { toast.error('Failed'); }
  };

  const handleAssign = async () => {
    if (!selectedTemplate || !selectedEmployee) return;
    const tmpl = templates.find((t: any) => t.id === selectedTemplate);
    try {
      await assignMut.mutateAsync({ template_id: selectedTemplate, user_id: selectedEmployee, checklist_type: tmpl?.checklist_type || 'onboarding' });
      toast.success('Checklist assigned');
      setAssignDialogOpen(false);
    } catch { toast.error('Failed'); }
  };

  const toggleItem = async (assignment: any, itemLabel: string) => {
    const completed: string[] = Array.isArray(assignment.completed_items) ? assignment.completed_items : [];
    const templateItems: string[] = (assignment.hr_checklist_templates as any)?.items ?? [];
    const newCompleted = completed.includes(itemLabel) ? completed.filter((c: string) => c !== itemLabel) : [...completed, itemLabel];
    const status = newCompleted.length >= templateItems.length ? 'completed' : 'in_progress';
    try { await updateProgress.mutateAsync({ id: assignment.id, completed_items: newCompleted, status }); } catch { toast.error('Failed to update'); }
  };

  if (loadT || loadA) return <div className="space-y-3 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Lifecycle Checklists</h1>
          <p className="text-sm text-muted-foreground">Onboarding & offboarding step-by-step tracking</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild><Button variant="outline"><ClipboardList className="h-4 w-4 mr-1" /> Assign Checklist</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Checklist</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                    <SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.checklist_type})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                    <SelectContent>{employees.filter(e => e.employment_status === 'active' || e.employment_status === 'onboarding').map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAssign} disabled={!selectedTemplate || !selectedEmployee}>Assign</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={tmplDialogOpen} onOpenChange={setTmplDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Template</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Checklist Template</DialogTitle></DialogHeader>
              <TemplateForm onSave={handleCreateTemplate} onCancel={() => setTmplDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList><TabsTrigger value="active">Active Checklists</TabsTrigger><TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger></TabsList>
        <TabsContent value="active" className="space-y-4 mt-4">
          {assignments.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No checklists assigned yet</CardContent></Card>
          ) : assignments.map((a: any) => {
            const tmplItems: string[] = (a.hr_checklist_templates as any)?.items ?? [];
            const completed: string[] = Array.isArray(a.completed_items) ? a.completed_items : [];
            const pct = tmplItems.length > 0 ? Math.round((completed.length / tmplItems.length) * 100) : 0;
            const isOnboarding = a.checklist_type === 'onboarding';
            return (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {isOnboarding ? <UserPlus className="h-4 w-4 text-blue-600" /> : <UserX className="h-4 w-4 text-muted-foreground" />}
                      <Link to={`/employees/${a.user_id}`} className="hover:underline font-medium">{getEmpName(a.user_id)}</Link>
                      <span className="text-muted-foreground">— {(a.hr_checklist_templates as any)?.name}</span>
                    </CardTitle>
                    <Badge variant={a.status === 'completed' ? 'default' : 'secondary'} className="capitalize text-xs">{a.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <Progress value={pct} className="flex-1" />
                    <span className="text-sm font-bold text-foreground">{pct}%</span>
                  </div>
                  <div className="space-y-1.5">
                    {tmplItems.map((item: string, i: number) => (
                      <label key={i} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                        <Checkbox checked={completed.includes(item)} onCheckedChange={() => toggleItem(a, item)} />
                        <span className={completed.includes(item) ? 'line-through text-muted-foreground' : 'text-foreground'}>{item}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        <TabsContent value="templates" className="space-y-3 mt-4">
          {templates.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No templates yet. Create one to get started.</CardContent></Card>
          ) : templates.map((t: any) => {
            const items: string[] = Array.isArray(t.items) ? t.items : [];
            return (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{t.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize text-xs">{t.checklist_type}</Badge>
                        <span className="text-xs text-muted-foreground">{items.length} steps</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
