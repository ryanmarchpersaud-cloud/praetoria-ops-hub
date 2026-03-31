import { useState } from 'react';
import { useTrainingCourses, useCreateCourse, useAllAssignments, useAssignCourseToUsers } from '@/hooks/useTraining';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllSubcontractors } from '@/hooks/useSubcontractor';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Plus, BookOpen, Video, FileText, ClipboardCheck, ShieldCheck,
  Users, Search, ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const categoryOptions = ['general', 'onboarding', 'safety', 'compliance', 'operations', 'policy', 'equipment', 'supervisor'];
const contentTypeOptions = [
  { value: 'document', label: 'Document / PDF', icon: FileText },
  { value: 'video', label: 'Video Lesson', icon: Video },
  { value: 'quiz', label: 'Quiz / Test', icon: ClipboardCheck },
  { value: 'policy', label: 'Policy Sign-off', icon: ShieldCheck },
  { value: 'mixed', label: 'Mixed Content', icon: BookOpen },
];
const audienceOptions = ['all', 'worker', 'subcontractor'];

function ContentBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    video: 'bg-blue-500/10 text-blue-700',
    document: 'bg-amber-500/10 text-amber-700',
    quiz: 'bg-purple-500/10 text-purple-700',
    policy: 'bg-emerald-500/10 text-emerald-700',
    mixed: 'bg-muted text-muted-foreground',
  };
  return <Badge variant="outline" className={`text-[10px] capitalize ${colors[type] || ''}`}>{type}</Badge>;
}

export default function TrainingCatalogPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: courses = [], isLoading } = useTrainingCourses();
  const { data: allAssignments = [] } = useAllAssignments();
  const { data: employees = [] } = useEmployees();
  const { data: subcontractors = [] } = useAllSubcontractors();
  const createCourse = useCreateCourse();
  const assignCourse = useAssignCourseToUsers();

  // Unified person lookup
  const getPersonName = (userId: string) => {
    const emp = employees.find(e => e.user_id === userId);
    if (emp) return emp.full_name;
    const sub = subcontractors.find((s: any) => s.user_id === userId);
    if (sub) return (sub as any).contact_name || (sub as any).company_name || 'Subcontractor';
    return 'Unknown';
  };

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignDueDate, setAssignDueDate] = useState('');

  // Create form state
  const [form, setForm] = useState({
    title: '', description: '', category: 'general', target_audience: 'all',
    content_type: 'document', is_mandatory: false, video_url: '',
    estimated_duration_minutes: '', pass_mark: '', max_retakes: '3',
    renewal_period_days: '',
  });

  const filtered = courses.filter((c: any) => {
    if (!search) return true;
    return [c.title, c.category, c.description].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase());
  });

  const handleCreate = () => {
    createCourse.mutate({
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      target_audience: form.target_audience,
      content_type: form.content_type,
      is_mandatory: form.is_mandatory,
      video_url: form.video_url || undefined,
      estimated_duration_minutes: form.estimated_duration_minutes ? parseInt(form.estimated_duration_minutes) : undefined,
      pass_mark: form.pass_mark ? parseInt(form.pass_mark) : undefined,
      max_retakes: form.max_retakes ? parseInt(form.max_retakes) : undefined,
      renewal_period_days: form.renewal_period_days ? parseInt(form.renewal_period_days) : undefined,
    }, {
      onSuccess: () => {
        toast({ title: 'Course created' });
        setShowCreate(false);
        setForm({ title: '', description: '', category: 'general', target_audience: 'all', content_type: 'document', is_mandatory: false, video_url: '', estimated_duration_minutes: '', pass_mark: '', max_retakes: '3', renewal_period_days: '' });
      },
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });
  };

  const handleAssign = () => {
    if (!showAssign || selectedUsers.length === 0) return;
    assignCourse.mutate({
      course_id: showAssign,
      user_ids: selectedUsers,
      due_date: assignDueDate || undefined,
      assigned_by: user?.id,
    }, {
      onSuccess: () => {
        toast({ title: `Assigned to ${selectedUsers.length} user(s)` });
        setShowAssign(null);
        setSelectedUsers([]);
        setAssignDueDate('');
      },
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });
  };

  const getAssignmentCount = (courseId: string) =>
    allAssignments.filter((a: any) => a.course_id === courseId).length;

  const getCompletedCount = (courseId: string) =>
    allAssignments.filter((a: any) => a.course_id === courseId && a.status === 'passed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Training Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage courses, assign training, track compliance</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Course
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Course Catalog ({courses.length})</TabsTrigger>
          <TabsTrigger value="assignments">All Assignments ({allAssignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading courses...</div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No courses found. Create your first training course.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((course: any) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm leading-snug">{course.title}</CardTitle>
                      <ContentBadge type={course.content_type} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {course.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[10px] capitalize">{course.category}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{course.target_audience}</Badge>
                      {course.is_mandatory && <Badge variant="destructive" className="text-[10px]">Mandatory</Badge>}
                      {course.estimated_duration_minutes && (
                        <Badge variant="outline" className="text-[10px]">{course.estimated_duration_minutes} min</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{getAssignmentCount(course.id)} assigned · {getCompletedCount(course.id)} completed</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setShowAssign(course.id); setSelectedUsers([]); }}>
                        <Users className="h-3 w-3 mr-1" /> Assign
                      </Button>
                      <Link to={`/hr/training/${course.id}`} className="flex-1">
                        <Button size="sm" variant="ghost" className="w-full text-xs">
                          Details <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {allAssignments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No assignments yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allAssignments.slice(0, 100).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{getPersonName(a.user_id)}</TableCell>
                        <TableCell className="text-sm">{(a as any).training_courses?.title || '—'}</TableCell>
                        <TableCell><ContentBadge type={(a as any).training_courses?.content_type || 'document'} /></TableCell>
                        <TableCell>
                          <Badge variant={a.status === 'passed' ? 'default' : a.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                            {a.status?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.due_date ? format(new Date(a.due_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.score != null ? `${a.score}%` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Course Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Training Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. WHMIS 2025 Training" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categoryOptions.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={form.target_audience} onValueChange={v => setForm(f => ({ ...f, target_audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{audienceOptions.map(a => <SelectItem key={a} value={a} className="capitalize">{a === 'all' ? 'All (Worker + Sub)' : a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Content Type</Label>
              <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{contentTypeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(form.content_type === 'video' || form.content_type === 'mixed') && (
              <div><Label>Video URL</Label><Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duration (min)</Label><Input type="number" value={form.estimated_duration_minutes} onChange={e => setForm(f => ({ ...f, estimated_duration_minutes: e.target.value }))} /></div>
              <div><Label>Pass Mark (%)</Label><Input type="number" value={form.pass_mark} onChange={e => setForm(f => ({ ...f, pass_mark: e.target.value }))} placeholder="e.g. 80" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Retakes</Label><Input type="number" value={form.max_retakes} onChange={e => setForm(f => ({ ...f, max_retakes: e.target.value }))} /></div>
              <div><Label>Renewal (days)</Label><Input type="number" value={form.renewal_period_days} onChange={e => setForm(f => ({ ...f, renewal_period_days: e.target.value }))} placeholder="e.g. 365" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_mandatory} onCheckedChange={v => setForm(f => ({ ...f, is_mandatory: v }))} />
              <Label>Mandatory Training</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || createCourse.isPending}>
              {createCourse.isPending ? 'Creating...' : 'Create Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!showAssign} onOpenChange={() => setShowAssign(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Course to Workers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Due Date (optional)</Label><Input type="date" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} /></div>
            <div>
              <Label>Select Workers ({selectedUsers.length} selected)</Label>
              <div className="max-h-60 overflow-y-auto border rounded-md mt-1 divide-y">
                {employees.filter(e => e.employment_status === 'active').map(emp => (
                  <label key={emp.user_id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={selectedUsers.includes(emp.user_id)}
                      onCheckedChange={checked => {
                        setSelectedUsers(prev =>
                          checked ? [...prev, emp.user_id] : prev.filter(id => id !== emp.user_id)
                        );
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role_title || emp.primary_service_category || '—'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={selectedUsers.length === 0 || assignCourse.isPending}>
              {assignCourse.isPending ? 'Assigning...' : `Assign to ${selectedUsers.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
