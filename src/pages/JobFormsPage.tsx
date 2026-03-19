import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Plus, Pencil, Trash2, Copy, GripVertical, Search } from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_CATEGORIES = ['Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance', 'Cleaning Services', 'Power Washing', 'Property Management', 'Other'];
const FORM_TYPES = ['checklist', 'inspection', 'safety', 'completion', 'custom'];
const TIMING_OPTIONS = ['before_work', 'during_work', 'after_work'];
const FIELD_TYPES = ['text', 'textarea', 'number', 'checkbox', 'yes_no', 'select', 'date', 'photo'];

type FormTemplate = {
  id: string;
  name: string;
  description: string;
  service_category: string;
  form_type: string;
  completion_timing: string;
  is_required: boolean;
  is_active: boolean;
  worker_visible: boolean;
  admin_visible: boolean;
  customer_visible: boolean;
  version: number;
  sort_order: number;
};

type FormField = {
  id: string;
  template_id: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  placeholder: string;
  options: string[];
  default_value: string;
  sort_order: number;
};

const EMPTY_TEMPLATE = {
  name: '', description: '', service_category: 'Other', form_type: 'checklist',
  completion_timing: 'after_work', is_required: false, is_active: true,
  worker_visible: true, admin_visible: true, customer_visible: false, version: 1, sort_order: 0,
};

const EMPTY_FIELD = {
  field_label: '', field_type: 'text', is_required: false, placeholder: '', options: [] as string[], default_value: '', sort_order: 0,
};

export default function JobFormsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<typeof EMPTY_TEMPLATE & { id?: string }>(EMPTY_TEMPLATE);
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [editField, setEditField] = useState<typeof EMPTY_FIELD & { id?: string }>(EMPTY_FIELD);

  const { data: templates = [] } = useQuery({
    queryKey: ['form_templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('form_templates').select('*').order('sort_order');
      if (error) throw error;
      return data as FormTemplate[];
    },
  });

  const { data: fields = [] } = useQuery({
    queryKey: ['form_template_fields', activeTemplateId],
    queryFn: async () => {
      if (!activeTemplateId) return [];
      const { data, error } = await supabase.from('form_template_fields').select('*').eq('template_id', activeTemplateId).order('sort_order');
      if (error) throw error;
      return data.map((f: any) => ({ ...f, options: Array.isArray(f.options) ? f.options : [] })) as FormField[];
    },
    enabled: !!activeTemplateId,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = editTemplate;
      if (id) {
        const { error } = await supabase.from('form_templates').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('form_templates').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editTemplate.id ? 'Form updated' : 'Form created');
      setTemplateOpen(false);
      setEditTemplate(EMPTY_TEMPLATE);
      queryClient.invalidateQueries({ queryKey: ['form_templates'] });
    },
    onError: () => toast.error('Failed to save form'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('form_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Form deleted'); queryClient.invalidateQueries({ queryKey: ['form_templates'] }); if (activeTemplateId) setActiveTemplateId(null); },
  });

  const duplicateTemplate = async (t: FormTemplate) => {
    const { id, ...rest } = t;
    const { error } = await supabase.from('form_templates').insert({ ...rest, name: `${rest.name} (Copy)` });
    if (error) { toast.error('Failed to duplicate'); return; }
    toast.success('Form duplicated');
    queryClient.invalidateQueries({ queryKey: ['form_templates'] });
  };

  const saveFieldMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = editField;
      const fullPayload = { ...payload, template_id: activeTemplateId! };
      if (id) {
        const { error } = await supabase.from('form_template_fields').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('form_template_fields').insert(fullPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Field saved');
      setFieldEditorOpen(false);
      setEditField(EMPTY_FIELD);
      queryClient.invalidateQueries({ queryKey: ['form_template_fields', activeTemplateId] });
    },
    onError: () => toast.error('Failed to save field'),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('form_template_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Field deleted'); queryClient.invalidateQueries({ queryKey: ['form_template_fields', activeTemplateId] }); },
  });

  const filtered = templates.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.service_category.toLowerCase().includes(search.toLowerCase()));
  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  const timingLabel = (t: string) => ({ before_work: 'Before work', during_work: 'During work', after_work: 'After work' }[t] || t);

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Job Forms</h1>
            <p className="text-sm text-muted-foreground">Create checklists, inspection forms, and completion templates for field work.</p>
          </div>
          <Dialog open={templateOpen} onOpenChange={v => { setTemplateOpen(v); if (!v) setEditTemplate(EMPTY_TEMPLATE); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Form</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editTemplate.id ? 'Edit Form Template' : 'New Form Template'}</DialogTitle></DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-4 pr-2">
                  <div><Label>Form name</Label><Input value={editTemplate.name} onChange={e => setEditTemplate(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Snow Removal Checklist" /></div>
                  <div><Label>Description</Label><Textarea value={editTemplate.description} onChange={e => setEditTemplate(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <Label>Service category</Label>
                      <Select value={editTemplate.service_category} onValueChange={v => setEditTemplate(p => ({ ...p, service_category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Form type</Label>
                      <Select value={editTemplate.form_type} onValueChange={v => setEditTemplate(p => ({ ...p, form_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FORM_TYPES.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Completion timing</Label>
                      <Select value={editTemplate.completion_timing} onValueChange={v => setEditTemplate(p => ({ ...p, completion_timing: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TIMING_OPTIONS.map(t => <SelectItem key={t} value={t}>{timingLabel(t)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sort order</Label>
                      <Input type="number" value={editTemplate.sort_order} onChange={e => setEditTemplate(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {[
                      { key: 'is_required' as const, label: 'Required', desc: 'Must be completed on every applicable job' },
                      { key: 'is_active' as const, label: 'Active', desc: 'Available for use' },
                      { key: 'worker_visible' as const, label: 'Worker visible', desc: 'Workers can see and fill this form' },
                      { key: 'admin_visible' as const, label: 'Admin visible', desc: 'Admins can view submissions' },
                      { key: 'customer_visible' as const, label: 'Customer visible', desc: 'Customers can view completed forms' },
                    ].map(s => (
                      <div key={s.key} className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">{s.label}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
                        <Switch checked={editTemplate[s.key]} onCheckedChange={v => setEditTemplate(p => ({ ...p, [s.key]: v }))} />
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" disabled={!editTemplate.name || saveTemplateMutation.isPending} onClick={() => saveTemplateMutation.mutate()}>
                    {saveTemplateMutation.isPending ? 'Saving…' : editTemplate.id ? 'Update Form' : 'Create Form'}
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Template list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Form Templates</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search forms…" className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No form templates yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map(t => (
                    <button key={t.id} onClick={() => setActiveTemplateId(t.id)} className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${activeTemplateId === t.id ? 'bg-muted' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{t.service_category}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{t.form_type}</Badge>
                            <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-xs">{t.is_active ? 'Active' : 'Inactive'}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditTemplate({ ...t }); setTemplateOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); duplicateTemplate(t); }}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); deleteTemplateMutation.mutate(t.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field editor */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{activeTemplate ? `Fields: ${activeTemplate.name}` : 'Form Fields'}</CardTitle>
                {activeTemplateId && (
                  <Dialog open={fieldEditorOpen} onOpenChange={v => { setFieldEditorOpen(v); if (!v) setEditField(EMPTY_FIELD); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Field</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editField.id ? 'Edit Field' : 'New Field'}</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Field label</Label><Input value={editField.field_label} onChange={e => setEditField(p => ({ ...p, field_label: e.target.value }))} placeholder="e.g. Sidewalk cleared?" /></div>
                        <div className="grid gap-4 grid-cols-2">
                          <div>
                            <Label>Field type</Label>
                            <Select value={editField.field_type} onValueChange={v => setEditField(p => ({ ...p, field_type: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{FIELD_TYPES.map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace('_', '/')}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Sort order</Label>
                            <Input type="number" value={editField.sort_order} onChange={e => setEditField(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
                          </div>
                        </div>
                        {(editField.field_type === 'select') && (
                          <div><Label>Options (comma-separated)</Label><Input value={editField.options.join(', ')} onChange={e => setEditField(p => ({ ...p, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Option 1, Option 2" /></div>
                        )}
                        <div><Label>Placeholder text</Label><Input value={editField.placeholder} onChange={e => setEditField(p => ({ ...p, placeholder: e.target.value }))} /></div>
                        <div><Label>Default value</Label><Input value={editField.default_value} onChange={e => setEditField(p => ({ ...p, default_value: e.target.value }))} /></div>
                        <div className="flex items-center justify-between">
                          <Label>Required</Label>
                          <Switch checked={editField.is_required} onCheckedChange={v => setEditField(p => ({ ...p, is_required: v }))} />
                        </div>
                        <Button className="w-full" disabled={!editField.field_label || saveFieldMutation.isPending} onClick={() => saveFieldMutation.mutate()}>
                          {saveFieldMutation.isPending ? 'Saving…' : editField.id ? 'Update Field' : 'Add Field'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <CardDescription>{activeTemplate ? `${timingLabel(activeTemplate.completion_timing)} • v${activeTemplate.version}` : 'Select a form template to manage its fields'}</CardDescription>
            </CardHeader>
            <CardContent>
              {!activeTemplateId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select a form to view and edit fields</p>
                </div>
              ) : fields.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No fields yet. Add your first field.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2 border rounded-lg p-3 bg-muted/20">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{f.field_label}</p>
                          {f.is_required && <Badge variant="destructive" className="text-[10px] px-1">Required</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{f.field_type.replace('_', '/')}{f.options.length > 0 ? ` • ${f.options.length} options` : ''}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditField({ ...f }); setFieldEditorOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteFieldMutation.mutate(f.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SettingsLayout>
  );
}
