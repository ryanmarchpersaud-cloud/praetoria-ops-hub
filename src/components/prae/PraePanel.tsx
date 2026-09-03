// Phase 1D — Prae command panel (interface shell only).
//
// Hard constraints enforced here:
//  * No AI gateway call, no network request of any kind.
//  * No microphone permission request and no audio capture.
//  * Synthetic demonstration content only (see praeDemoData.ts).
//  * Every control that would act on real data is labelled "Not enabled yet".
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mic, Send, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import {
  PRAE_ACTIONS,
  PRAE_DISABLED_LABEL,
  PRAE_STATUS_LABEL,
  PRAE_STATUS_TONE,
  type PraeAction,
  type PraeStatus,
} from './praeDemoData';

const STATUS_ORDER: PraeStatus[] = [
  'idle',
  'listening',
  'thinking',
  'preparing_draft',
  'waiting_for_approval',
  'complete',
];

function DisabledBadge() {
  return (
    <Badge variant="outline" className="gap-1 text-[10px] font-medium">
      <Lock className="h-3 w-3" aria-hidden="true" />
      {PRAE_DISABLED_LABEL}
    </Badge>
  );
}

export default function PraePanel({
  open,
  onOpenChange,
  context = 'Admin Portal',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context?: string;
}) {
  const [status, setStatus] = useState<PraeStatus>('idle');
  const [selected, setSelected] = useState<PraeAction | null>(null);
  const [draft, setDraft] = useState('');

  // Demonstration only: shows the status indicators without contacting anything.
  const previewAction = (action: PraeAction) => {
    setSelected(action);
    setStatus(action.demo.approvalRequired ? 'preparing_draft' : 'thinking');
    window.setTimeout(
      () => setStatus(action.demo.approvalRequired ? 'waiting_for_approval' : 'complete'),
      600,
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 space-y-1 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <img src={praetoriaLogo} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
            </span>
            Prae
            <span className="text-xs font-normal text-muted-foreground">(“Pray”)</span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Praetoria Business Brain — {context}. Interface preview using sample content. Prae is
            not connected to any AI service and sends nothing.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 py-3 border-b border-border space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5" role="status" aria-live="polite">
            {STATUS_ORDER.map((s) => (
              <span
                key={s}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[11px] transition-opacity',
                  PRAE_STATUS_TONE[s],
                  status === s ? 'opacity-100 font-semibold' : 'opacity-40',
                )}
              >
                {PRAE_STATUS_LABEL[s]}
              </span>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Preview only. No customer message, attachment or business record is sent to a model.
                Any future send or important action will show the exact proposed result and require
                explicit human approval.
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </p>
              {PRAE_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => previewAction(action)}
                  className={cn(
                    'w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40',
                    selected?.id === action.id && 'border-primary ring-1 ring-primary/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{action.title}</span>
                    <DisabledBadge />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                </button>
              ))}
            </div>

            {selected && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold">{selected.demo.heading}</p>
                <pre className="whitespace-pre-wrap break-words rounded bg-background p-2 text-[11px] leading-relaxed text-foreground border border-border">
                  {selected.demo.lines.join('\n')}
                </pre>
                <Separator />
                <p className="text-[11px] text-muted-foreground">{selected.demo.approvalNote}</p>
                <div className="flex gap-2">
                  <Button size="sm" disabled className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Approve — {PRAE_DISABLED_LABEL}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(null);
                      setStatus('idle');
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Prae… (preview only — nothing is transmitted)"
            className="min-h-[72px] text-sm"
            aria-label="Ask Prae"
          />
          <div className="flex items-center justify-between gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled
                      aria-label={`Microphone — ${PRAE_DISABLED_LABEL}`}
                    >
                      <Mic className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Voice input — {PRAE_DISABLED_LABEL}. No microphone permission is requested and no
                  audio is recorded.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center gap-2">
              <DisabledBadge />
              <Button type="button" size="sm" disabled className="gap-1">
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
