import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Building2,
  Wrench,
  User,
  FileText,
  Receipt,
  FileSpreadsheet,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOwnerUnreadMessagesCount } from '@/hooks/pm/useOwnerMessages';

const tabs = [
  { to: '/owner', icon: Home, label: 'Home', end: true },
  { to: '/owner/properties', icon: Building2, label: 'Properties', end: false },
  { to: '/owner/maintenance', icon: Wrench, label: 'Maint', end: false },
  { to: '/owner/messages', icon: MessageSquare, label: 'Messages', end: false, badgeKey: 'messages' as const },
  { to: '/owner/approvals', icon: ShieldCheck, label: 'Approvals', end: false },
  { to: '/owner/statements', icon: FileSpreadsheet, label: 'Stmts', end: false },
  { to: '/owner/expenses', icon: Receipt, label: 'Exp', end: false },
  { to: '/owner/documents', icon: FileText, label: 'Docs', end: false },
  { to: '/owner/account', icon: User, label: 'Account', end: false },
];

function playChime() {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [880, 1175]; // A5, D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* ignore */
  }
}

export function OwnerBottomNav() {
  const location = useLocation();
  const { data: unread = 0 } = useOwnerUnreadMessagesCount();
  const prevUnread = useRef<number | null>(null);

  useEffect(() => {
    if (prevUnread.current !== null && unread > prevUnread.current) {
      playChime();
    }
    prevUnread.current = unread;
  }, [unread]);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div className="max-w-lg mx-auto flex items-stretch">
        {tabs.map(tab => {
          const isActive = tab.end
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);
          const showBadge = tab.badgeKey === 'messages' && unread > 0;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px] relative',
                isActive ? 'text-emerald-700' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div className="relative">
                <tab.icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-card">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-b bg-emerald-600" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
