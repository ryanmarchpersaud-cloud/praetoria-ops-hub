import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mail, Inbox, PauseCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import {
  useCommsMessages,
  useCommsMailboxes,
  useCommsSettings,
  useCommsSyncState,
  type CommsMessage,
} from '@/hooks/useCommunications';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CommunicationsHubPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CommsMessage | null>(null);
  const { data: settings } = useCommsSettings();
  const { data: mailboxes } = useCommsMailboxes();
  const { data: syncState } = useCommsSyncState();
  const { data: messages, isLoading } = useCommsMessages(search || undefined);

  if (settings && settings.hub_enabled === false) {
    return (
      <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            The Communications Hub is currently disabled.
          </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Communications Hub
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Read-only · Staging
            </Badge>
            <Badge variant={settings?.polling_enabled ? 'default' : 'secondary'} className="gap-1">
              {settings?.polling_enabled ? (
                <><PlayCircle className="h-3.5 w-3.5" /> Polling on</>
              ) : (
                <><PauseCircle className="h-3.5 w-3.5" /> Polling paused</>
              )}
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Staging mailbox status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(mailboxes ?? []).length === 0 && (
              <p className="text-muted-foreground">
                No mailbox registered yet. It is created automatically on the first poll run.
              </p>
            )}
            {(mailboxes ?? []).map((m) => {
              const s = syncState?.find((x) => x.mailbox_id === m.id);
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {m.email_address} · division: {m.division ?? '—'}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>Last run: {fmt(s?.last_run_at ?? null)} ({s?.last_run_status ?? 'never'})</div>
                    <div>Last message id: {s?.last_seen_uid ?? 0}{s?.is_running ? ' · running' : ''}</div>
                    {s?.last_error && <div className="text-destructive">{s.last_error}</div>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Imported messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Search subject, sender or preview"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-[520px] overflow-y-auto space-y-1">
                {isLoading && <p className="text-sm text-muted-foreground p-2">Loading…</p>}
                {!isLoading && (messages ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">No messages imported yet.</p>
                )}
                {(messages ?? []).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelected(m)}
                    className={`w-full text-left rounded-md border p-2.5 transition-colors hover:bg-muted ${
                      selected?.id === m.id ? 'bg-muted border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{m.subject || '(no subject)'}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{fmt(m.sent_at)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {m.from_name || m.from_address || 'Unknown sender'}
                    </div>
                    <div className="text-xs text-muted-foreground/80 truncate">{m.snippet}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Message</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-sm text-muted-foreground">Select a message to read it.</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-base font-semibold">{selected.subject || '(no subject)'}</h2>
                    <p className="text-xs text-muted-foreground">
                      From {selected.from_name ? `${selected.from_name} · ` : ''}
                      {selected.from_address} — {fmt(selected.sent_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">To {selected.to_addresses || '—'}</p>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-sm bg-muted/40 rounded-md p-3 max-h-[420px] overflow-auto font-sans">
                    {selected.body_text || selected.snippet || '(no text content imported)'}
                  </pre>
                  <p className="text-[11px] text-muted-foreground">
                    Replying is not enabled in Phase 1A. This view is read-only.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
