import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateConversation, useMessagingPeople, type ConversationType } from '@/hooks/useMessaging';
import { Plus, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  onCreated?: (conversationId: string) => void;
  trigger?: React.ReactNode;
}

export function NewConversationDialog({ onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ConversationType>('direct_message');
  const [title, setTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const createConversation = useCreateConversation();
  const { data: people = [], isLoading: peopleLoading, isError: peopleError } = useMessagingPeople(open);

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0 && type === 'direct_message') {
      toast.error('Select at least one person');
      return;
    }
    try {
      const convo = await createConversation.mutateAsync({
        type,
        title: title || undefined,
        memberUserIds: selectedUsers,
      });
      toast.success('Conversation created');
      setOpen(false);
      setTitle('');
      setSelectedUsers([]);
      setType('direct_message');
      onCreated?.(convo.id);
    } catch (err) {
      toast.error('Failed to create conversation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Message
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col" aria-describedby="new-convo-desc">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <p id="new-convo-desc" className="text-xs text-muted-foreground">Select members and start a conversation</p>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ConversationType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="direct_message">Direct Message</SelectItem>
                <SelectItem value="team_channel">Team Channel</SelectItem>
                <SelectItem value="announcement_channel">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type !== 'direct_message' && (
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Snow Crew Alpha" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Members</Label>
            <div className="max-h-[240px] overflow-y-auto space-y-0.5 border rounded-lg p-1">
              {peopleLoading && (
                <p className="text-xs text-muted-foreground text-center py-4">Loading members…</p>
              )}
              {peopleError && !peopleLoading && (
                <p className="text-xs text-destructive text-center py-4">Couldn’t load members. Please try again.</p>
              )}
              {people.map(p => (
                <button
                  key={p.id}
                  onClick={() => toggleUser(p.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors',
                    selectedUsers.includes(p.id) ? 'bg-primary/10' : 'hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center shrink-0',
                    selectedUsers.includes(p.id) ? 'bg-primary border-primary' : 'border-input'
                  )}>
                    {selectedUsers.includes(p.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.role}</p>
                  </div>
                </button>
              ))}
              {!peopleLoading && !peopleError && people.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No available members found</p>
              )}
            </div>
          </div>
        </div>

        <Button onClick={handleCreate} disabled={createConversation.isPending || selectedUsers.length === 0} className="mt-2">
          {createConversation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Create Conversation
        </Button>
      </DialogContent>
    </Dialog>
  );
}
