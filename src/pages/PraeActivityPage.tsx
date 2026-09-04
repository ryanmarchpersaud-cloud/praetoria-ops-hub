// Phase 1E — Prae activity + approval area (mobile responsive).
// Synthetic demonstration data only. No AI, no network, no sending.
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import PraeApprovalDetail from '@/components/prae/PraeApprovalDetail';
import PraeLiveActivity from '@/components/prae/PraeLiveActivity';
import {
  PRAE_ACTIVITY_DEMO,
  PRAE_ITEM_STATUS_LABEL,
  PRAE_ITEM_STATUS_TONE,
  PRAE_TABS,
  filterPraeItems,
  type PraeActivityItem,
  type PraeTabId,
} from '@/components/prae/praeActivityDemo';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActivityCard({ item, onOpen }: { item: PraeActivityItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                PRAE_ITEM_STATUS_TONE[item.status],
              )}
            >
              {PRAE_ITEM_STATUS_LABEL[item.status]}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {item.division}
            </Badge>
            {item.approvalRequired && (
              <Badge variant="outline" className="text-[10px]">
                Approval required
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium break-words">
            <span className="text-muted-foreground">Detected: </span>
            {item.detected}
          </p>
          <p className="text-sm break-words">
            <span className="text-muted-foreground">Prepared: </span>
            {item.prepared}
          </p>
          <p className="text-xs text-muted-foreground break-words">
            {formatWhen(item.occurredAt)} · {item.representative}
          </p>
          <p className="text-xs break-words">
            <span className="text-muted-foreground">Outcome: </span>
            {item.outcome}
          </p>
          {(item.decidedBy || item.approvalState) && (
            <p className="text-xs text-muted-foreground break-words">
              Approval: {item.approvalState ?? 'n/a'}
              {item.decidedBy ? ` · ${item.decidedAction ?? 'reviewed'} by ${item.decidedBy}` : ''}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
    </button>
  );
}

export default function PraeActivityPage() {
  const [tab, setTab] = useState<PraeTabId>('activity');
  const [selected, setSelected] = useState<PraeActivityItem | null>(null);

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-xl font-bold sm:text-2xl">Prae Activity</h1>
        <p className="text-sm text-muted-foreground">
          Praetoria Business Brain — sample activity, approvals and outcomes.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Live pilot activity
        </h2>
        <PraeLiveActivity />
      </section>

      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          The tabs below are demonstration data. Prae AI processing and sending remain disabled;
          nothing on this screen can execute anything.
        </span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PraeTabId)}>
        <TabsList className="grid w-full grid-cols-2 gap-1 h-auto sm:grid-cols-4">
          {PRAE_TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs whitespace-normal py-1.5">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PRAE_TABS.map((t) => {
          const items = filterPraeItems(PRAE_ACTIVITY_DEMO, t.id);
          return (
            <TabsContent key={t.id} value={t.id} className="space-y-2 mt-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nothing here.</p>
              ) : (
                items.map((item) => (
                  <ActivityCard key={item.id} item={item} onOpen={() => setSelected(item)} />
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-4 pb-3 border-b border-border">
            <SheetTitle className="text-base">Approval detail</SheetTitle>
            <SheetDescription className="text-xs">
              {selected ? `${selected.division} · ${formatWhen(selected.occurredAt)}` : ''}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-4">{selected && <PraeApprovalDetail item={selected} />}</div>
          </ScrollArea>
          <div className="border-t border-border p-3">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
