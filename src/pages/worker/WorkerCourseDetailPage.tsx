import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMyAssignments, useTrainingQuizQuestions, useSubmitQuiz, useUpdateAssignmentStatus, useMyQuizAttempts } from '@/hooks/useTraining';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, BookOpen, Video, FileText, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function WorkerCourseDetailPage({ backTo }: { backTo?: string }) {
  const { id: assignmentId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const backLink = backTo || '/worker/courses';
  const { toast } = useToast();
  const { data: assignments = [] } = useMyAssignments();
  const submitQuiz = useSubmitQuiz();
  const updateStatus = useUpdateAssignmentStatus();

  const assignment = assignments.find((a: any) => a.id === assignmentId);
  const course = (assignment as any)?.training_courses;
  const courseId = course?.id;

  const { data: questions = [] } = useTrainingQuizQuestions(courseId);
  const { data: attempts = [] } = useMyQuizAttempts(assignmentId);

  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!assignment) return <div className="px-4 pt-6 text-center text-muted-foreground">Assignment not found.</div>;

  const canTakeQuiz = (course?.content_type === 'quiz' || course?.content_type === 'mixed') &&
    questions.length > 0 &&
    assignment.status !== 'passed' &&
    (course?.max_retakes == null || assignment.attempts < course.max_retakes);

  const handleStartCourse = () => {
    if (assignment.status === 'not_started') {
      updateStatus.mutate({ id: assignment.id, status: 'in_progress' });
    }
  };

  const handleAcknowledge = () => {
    updateStatus.mutate({
      id: assignment.id,
      status: 'passed',
      acknowledged_at: new Date().toISOString(),
    }, {
      onSuccess: () => toast({ title: 'Policy acknowledged ✓' }),
    });
  };

  const handleSubmitQuiz = () => {
    if (!user) return;
    // Grade the quiz
    let correct = 0;
    questions.forEach((q: any) => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = course?.pass_mark ? score >= course.pass_mark : score >= 70;

    submitQuiz.mutate({
      assignment_id: assignment.id,
      user_id: user.id,
      answers,
      score,
      passed,
    }, {
      onSuccess: () => {
        toast({ title: passed ? `Passed! Score: ${score}%` : `Failed. Score: ${score}%`, variant: passed ? 'default' : 'destructive' });
        setShowQuiz(false);
        setAnswers({});
      },
    });
  };

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to={backLink} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{course?.title || 'Course'}</h1>
          <p className="text-xs text-muted-foreground capitalize">{course?.category} · {course?.content_type}</p>
        </div>
      </div>

      {/* Status card */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={assignment.status === 'passed' ? 'default' : assignment.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
              {assignment.status?.replace('_', ' ')}
            </Badge>
          </div>
          {assignment.due_date && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Due Date</span>
              <span className="text-sm font-medium">{format(new Date(assignment.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {assignment.score != null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Score</span>
              <span className="text-sm font-medium">{assignment.score}%</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Attempts</span>
            <span className="text-sm font-medium">{assignment.attempts}{course?.max_retakes != null ? ` / ${course.max_retakes}` : ''}</span>
          </div>
          {course?.estimated_duration_minutes && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="text-sm font-medium flex items-center gap-1"><Clock className="h-3 w-3" />{course.estimated_duration_minutes} min</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course description */}
      {course?.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{course.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Video content */}
      {course?.video_url && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Video className="h-4 w-4" /> Video Lesson</CardTitle></CardHeader>
          <CardContent>
            {course.video_url.includes('youtube') || course.video_url.includes('youtu.be') ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={course.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  title={course.title}
                />
              </div>
            ) : (
              <a href={course.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline flex items-center gap-2">
                <Play className="h-4 w-4" /> Watch Video
              </a>
            )}
            {assignment.status === 'not_started' && (
              <Button onClick={handleStartCourse} className="mt-3 w-full" size="sm">
                Mark as Started
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document links */}
      {course?.document_urls && course.document_urls.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {course.document_urls.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary underline">
                <FileText className="h-3 w-3" /> Document {i + 1}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Policy sign-off */}
      {course?.content_type === 'policy' && assignment.status !== 'passed' && (
        <Button onClick={handleAcknowledge} className="w-full gap-2" disabled={updateStatus.isPending}>
          <CheckCircle2 className="h-4 w-4" /> I Acknowledge & Accept This Policy
        </Button>
      )}

      {/* Quiz section */}
      {canTakeQuiz && !showQuiz && (
        <Button onClick={() => { setShowQuiz(true); handleStartCourse(); }} className="w-full gap-2">
          <BookOpen className="h-4 w-4" /> Take Quiz ({questions.length} questions)
        </Button>
      )}

      {showQuiz && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Quiz</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q: any, i: number) => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                <RadioGroup value={answers[q.id] || ''} onValueChange={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}>
                  {(q.options as string[])?.map((opt: string, j: number) => (
                    <div key={j} className="flex items-center space-x-2">
                      <RadioGroupItem value={String.fromCharCode(65 + j)} id={`${q.id}-${j}`} />
                      <Label htmlFor={`${q.id}-${j}`} className="text-sm">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
            <Button onClick={handleSubmitQuiz} className="w-full" disabled={Object.keys(answers).length < questions.length || submitQuiz.isPending}>
              {submitQuiz.isPending ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Past attempts */}
      {attempts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Past Attempts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {attempts.map((att: any, i: number) => (
              <div key={att.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  {att.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-sm">{att.score}%</span>
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(att.attempted_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
