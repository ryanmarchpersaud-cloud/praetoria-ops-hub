import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTrainingCourse, useTrainingQuizQuestions, useAllAssignments, useCreateQuizQuestion } from '@/hooks/useTraining';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, BookOpen, Video, FileText, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function TrainingCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: course, isLoading } = useTrainingCourse(id);
  const { data: questions = [] } = useTrainingQuizQuestions(id);
  const { data: allAssignments = [] } = useAllAssignments();
  const createQuestion = useCreateQuizQuestion();

  const [showAddQ, setShowAddQ] = useState(false);
  const [qForm, setQForm] = useState({ question_text: '', options: ['', '', '', ''], correct_answer: '' });

  const courseAssignments = allAssignments.filter((a: any) => a.course_id === id);

  const handleAddQuestion = () => {
    if (!id || !qForm.question_text || !qForm.correct_answer) return;
    createQuestion.mutate({
      course_id: id,
      question_text: qForm.question_text,
      question_type: 'multiple_choice',
      options: qForm.options.filter(Boolean),
      correct_answer: qForm.correct_answer,
      sort_order: questions.length,
    }, {
      onSuccess: () => {
        toast({ title: 'Question added' });
        setShowAddQ(false);
        setQForm({ question_text: '', options: ['', '', '', ''], correct_answer: '' });
      },
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!course) return <div className="p-8 text-center text-muted-foreground">Course not found.</div>;

  const iconMap: Record<string, any> = { video: Video, document: FileText, quiz: ClipboardCheck, policy: ShieldCheck, mixed: BookOpen };
  const Icon = iconMap[course.content_type] || BookOpen;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hr/training" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{course.title}</h1>
          <p className="text-sm text-muted-foreground capitalize">{course.category} · {course.content_type}</p>
        </div>
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* Course details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Course Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {course.description && <p className="text-muted-foreground">{course.description}</p>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="secondary" className="capitalize text-xs">{course.target_audience}</Badge>
              {course.is_mandatory && <Badge variant="destructive" className="text-xs">Mandatory</Badge>}
              {course.estimated_duration_minutes && <Badge variant="outline" className="text-xs">{course.estimated_duration_minutes} min</Badge>}
              {course.pass_mark && <Badge variant="outline" className="text-xs">Pass: {course.pass_mark}%</Badge>}
              {course.max_retakes != null && <Badge variant="outline" className="text-xs">Retakes: {course.max_retakes}</Badge>}
              {course.renewal_period_days && <Badge variant="outline" className="text-xs">Renew: {course.renewal_period_days}d</Badge>}
            </div>
            {course.video_url && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Video</p>
                <a href={course.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">{course.video_url}</a>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Assignment Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Assigned</span><span className="font-medium">{courseAssignments.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Passed</span><span className="font-medium text-emerald-600">{courseAssignments.filter((a: any) => a.status === 'passed').length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Failed</span><span className="font-medium text-destructive">{courseAssignments.filter((a: any) => a.status === 'failed').length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Not Started</span><span className="font-medium">{courseAssignments.filter((a: any) => a.status === 'not_started').length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">In Progress</span><span className="font-medium">{courseAssignments.filter((a: any) => a.status === 'in_progress').length}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Questions */}
      {(course.content_type === 'quiz' || course.content_type === 'mixed') && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Quiz Questions ({questions.length})</CardTitle>
            <Button size="sm" onClick={() => setShowAddQ(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Question
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {questions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No questions yet. Add questions to enable quizzes.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Question</TableHead><TableHead>Type</TableHead><TableHead>Answer</TableHead></TableRow></TableHeader>
                <TableBody>
                  {questions.map((q: any, i: number) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-sm font-medium">{i + 1}</TableCell>
                      <TableCell className="text-sm">{q.question_text}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{q.question_type?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{q.correct_answer}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignments list */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Assigned Workers ({courseAssignments.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {courseAssignments.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No workers assigned yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Score</TableHead><TableHead>Attempts</TableHead><TableHead>Due</TableHead><TableHead>Completed</TableHead></TableRow></TableHeader>
              <TableBody>
                {courseAssignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant={a.status === 'passed' ? 'default' : a.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                        {a.status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.score != null ? `${a.score}%` : '—'}</TableCell>
                    <TableCell className="text-sm">{a.attempts}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.due_date ? format(new Date(a.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.completed_at ? format(new Date(a.completed_at), 'MMM d, yyyy') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Question Dialog */}
      <Dialog open={showAddQ} onOpenChange={setShowAddQ}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Quiz Question</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Question *</Label><Textarea value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} rows={2} /></div>
            {qForm.options.map((opt, i) => (
              <div key={i}><Label>Option {String.fromCharCode(65 + i)}</Label><Input value={opt} onChange={e => { const o = [...qForm.options]; o[i] = e.target.value; setQForm(f => ({ ...f, options: o })); }} /></div>
            ))}
            <div><Label>Correct Answer *</Label><Input value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))} placeholder="e.g. A" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddQ(false)}>Cancel</Button>
            <Button onClick={handleAddQuestion} disabled={!qForm.question_text || !qForm.correct_answer}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
