import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const EMOJI_LIST = ['👍', '👋', '✅', '❌', '🔥', '⚠️', '❤️', '😊', '🎉', '💪', '👀', '🙏', '📸', '🛠️', '⏰', '🏠'];

interface Props {
  conversationId: string;
  onSend: (body: string, attachments?: { file_url: string; file_name: string; file_type: string }[]) => void;
  disabled?: boolean;
  isAnnouncementOnly?: boolean;
}

export function MessageInput({ conversationId, onSend, disabled, isAnnouncementOnly }: Props) {
  const [body, setBody] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file_url: string; file_name: string; file_type: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  if (isAnnouncementOnly) {
    return (
      <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 border-t">
        📢 This is an announcement-only channel
      </div>
    );
  }

  const handleSend = () => {
    if (!body.trim() && pendingFiles.length === 0) return;
    onSend(body.trim(), pendingFiles.length > 0 ? pendingFiles : undefined);
    setBody('');
    setPendingFiles([]);
    setShowEmoji(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setUploading(true);
    
    const newFiles: typeof pendingFiles = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `messaging/${conversationId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, file);
      if (error) {
        console.error('Upload error:', error);
        continue;
      }
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      newFiles.push({
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
      });
    }
    setPendingFiles(prev => [...prev, ...newFiles]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="border-t bg-card p-2 space-y-2">
      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {pendingFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
              <span className="truncate max-w-[120px]">{f.file_name}</span>
              <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="flex flex-wrap gap-1 px-1">
          {EMOJI_LIST.map(emoji => (
            <button
              key={emoji}
              onClick={() => { setBody(prev => prev + emoji); setShowEmoji(false); }}
              className="text-lg hover:bg-muted rounded p-1 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || disabled}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        <Button
          variant="ghost"
          size="icon"
          className={cn('h-9 w-9 shrink-0', showEmoji && 'bg-muted')}
          onClick={() => setShowEmoji(!showEmoji)}
          disabled={disabled}
        >
          <Smile className="h-4 w-4" />
        </Button>

        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          disabled={disabled}
          className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl"
          rows={1}
        />

        <Button
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={handleSend}
          disabled={disabled || (!body.trim() && pendingFiles.length === 0)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
