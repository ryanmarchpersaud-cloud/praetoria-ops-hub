import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMeetingNotes, useSaveMeetingNote, useGenerateAIMeetingMinutes } from '@/hooks/useVideoCall';
import { Send, Sparkles, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  videoCallId: string;
  conversationId: string;
}

export function MeetingNotesPanel({ videoCallId, conversationId }: Props) {
  const { data: notes, isLoading } = useMeetingNotes(videoCallId);
  const saveNote = useSaveMeetingNote();
  const generateMinutes = useGenerateAIMeetingMinutes();
  const [noteText, setNoteText] = useState('');

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    saveNote.mutate(
      { videoCallId, conversationId, content: noteText.trim() },
      {
        onSuccess: () => {
          setNoteText('');
          toast.success('Note saved');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to save note'),
      }
    );
  };

  const handleGenerateMinutes = () => {
    const manualNotes = (notes || [])
      .filter(n => n.note_type === 'manual')
      .map(n => n.content);

    if (manualNotes.length === 0) {
      toast.error('Add some notes first before generating minutes');
      return;
    }

    generateMinutes.mutate(
      { videoCallId, conversationId, manualNotes },
      {
        onSuccess: () => toast.success('AI meeting minutes generated!'),
        onError: (err: any) => toast.error(err.message || 'Failed to generate minutes'),
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">Meeting Notes</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1"
          onClick={handleGenerateMinutes}
          disabled={generateMinutes.isPending || !notes?.length}
        >
          {generateMinutes.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          AI Minutes
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1 px-3 py-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !notes?.length ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No notes yet. Add notes during the meeting.
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <div
                key={note.id}
                className={`p-2 rounded-lg text-xs ${
                  note.note_type === 'ai_generated'
                    ? 'bg-primary/5 border border-primary/20'
                    : 'bg-muted/50'
                }`}
              >
                {note.title && (
                  <p className="font-semibold text-[11px] mb-1">{note.title}</p>
                )}
                <p className="whitespace-pre-wrap">{note.content}</p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  {format(new Date(note.created_at), 'h:mm a')}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-2 border-t shrink-0">
        <div className="flex gap-1.5">
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="text-xs min-h-[36px] max-h-[80px] resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveNote();
              }
            }}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSaveNote}
            disabled={!noteText.trim() || saveNote.isPending}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
