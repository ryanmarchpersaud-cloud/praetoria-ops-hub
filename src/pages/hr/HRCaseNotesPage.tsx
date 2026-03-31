import { useState } from 'react';
import { useCaseNotes, useCreateCaseNote } from '@/hooks/useHRModules';
import { HRFileAttachments } from '@/components/hr/HRFileAttachments';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, FileText, Lock, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const noteTypes = [
  { value: 'general', label: 'General' },
  { value: 'performance', label: 'Performance' },
  { value: 'disciplinary', label: 'Disciplinary' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'return_to_work', label: 'Return to Work' },
  { value: 'recognition', label: 'Recognition' },
];

const noteTypeColors: Record<string, string> = {
  general: 'bg-muted text-muted-foreground',
  performance: 'bg-blue-500/10 text-blue-600 border-blue-200',
  disciplinary: 'bg-destructive/10 text-destructive border-destructive/20',
  accommodation: 'bg-purple-500/10 text-purple-600 border-purple-200',
  return_to_work: 'bg-amber-500/10 text-amber-600 border-amber-200',
  recognition: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
};

export default function HRCaseNotesPage() {
  const { data: notes = [], isLoading } = useCaseNotes();
  const { data: employees = [] } = useEmployees();
  const createNote = useCreateCaseNote();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [form, setForm] = useState({ employee_user_id: '', note_type: 'general', subject: '', body: '', is_confidential: false });

  const getEmpName = (uid: string) => employees.find(e => e.user_id === uid)?.full_name ?? 'Unknown';

  const handleCreate = async () => {
    if (!form.employee_user_id || !form.subject) return;
    try {
      await createNote.mutateAsync(form);
      toast.success('Note added');
      setDialogOpen(false);
      setForm({ employee_user_id: '', note_type: 'general', subject: '', body: '', is_confidential: false });
    } catch { toast.error('Failed'); }
  };

  const filtered = notes.filter((n: any) => {
    if (filterType !== 'all' && n.note_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return n.subject?.toLowerCase().includes(s) || n.body?.toLowerCase().includes(s) || getEmpName(n.employee_user_id).toLowerCase().includes(s);
    }
    return true;
  });

  if (isLoading) return <div className="space-y-3 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HR Notes & Case Log</h1>
          <p className="text-sm text-muted-foreground">Private per-employee notes — performance, disciplinary, accommodations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Note</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Case Note</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Employee</Label>
                <Select value={form.employee_user_id} onValueChange={v => setForm({ ...form, employee_user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.employment_status === 'active').map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Note Type</Label>
                <Select value={form.note_type} onValueChange={v => setForm({ ...form, note_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{noteTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Brief subject line" /></div>
              <div><Label>Details</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={4} placeholder="Detailed notes..." /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_confidential} onCheckedChange={v => setForm({ ...form, is_confidential: v })} />
                <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Mark as Confidential</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!form.employee_user_id || !form.subject}>Save Note</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {noteTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No case notes found</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((n: any) => (
            <Card key={n.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/employees/${n.employee_user_id}`} className="font-medium text-foreground hover:underline">{getEmpName(n.employee_user_id)}</Link>
                      <Badge variant="outline" className={`text-[10px] capitalize ${noteTypeColors[n.note_type] || ''}`}>{n.note_type?.replace('_', ' ')}</Badge>
                      {n.is_confidential && <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive"><Lock className="h-2.5 w-2.5 mr-0.5" /> Confidential</Badge>}
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1">{n.subject}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{n.body}</p>}
                    <div className="mt-2 pt-2 border-t border-border">
                      <HRFileAttachments recordType="hr_case_note" recordId={n.id} label="Attachments" compact />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{format(new Date(n.created_at), 'MMM d, yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
