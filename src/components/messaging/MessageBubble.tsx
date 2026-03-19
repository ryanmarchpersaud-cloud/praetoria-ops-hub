import { useAuth } from '@/hooks/useAuth';
import type { Message } from '@/hooks/useMessaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FileText, Image as ImageIcon, Download } from 'lucide-react';

interface Props {
  message: Message;
  showSender?: boolean;
}

export function MessageBubble({ message, showSender = true }: Props) {
  const { user } = useAuth();
  const isOwn = message.sender_user_id === user?.id;
  const profile = message.sender_profile;
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  const isImage = (type: string | null) => type?.startsWith('image/');

  return (
    <div className={cn('flex gap-2 max-w-[85%]', isOwn ? 'ml-auto flex-row-reverse' : '')}>
      {showSender && !isOwn && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
      )}
      {!showSender && !isOwn && <div className="w-8 shrink-0" />}

      <div className={cn('space-y-1', isOwn ? 'items-end' : 'items-start')}>
        {showSender && !isOwn && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-medium text-foreground">{profile?.full_name}</span>
            {profile?.role_label && (
              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{profile.role_label}</span>
            )}
          </div>
        )}

        <div className={cn(
          'rounded-2xl px-3.5 py-2 text-sm break-words',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}>
          {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-1.5 space-y-1.5">
              {message.attachments.map(att => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-2 rounded-lg p-2 transition-colors',
                    isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background hover:bg-accent'
                  )}
                >
                  {isImage(att.file_type) ? (
                    <ImageIcon className="h-4 w-4 shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0" />
                  )}
                  <span className="text-xs truncate flex-1">{att.file_name}</span>
                  <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </a>
              ))}
            </div>
          )}
        </div>

        <span className={cn('text-[10px] text-muted-foreground px-1', isOwn ? 'text-right block' : '')}>
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
      </div>
    </div>
  );
}
