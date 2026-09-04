import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Inbox, PauseCircle, PlayCircle, ShieldCheck, Reply, AlertTriangle } from 'lucide-react';
import ReplyComposerDialog from '@/components/communications/ReplyComposerDialog';
import PraeLauncher from '@/components/prae/PraeLauncher';
import {
  useCommsMessages,
  useCommsMailboxes,
  useCommsSettings,
  useCommsSyncState,
  useCommsOutbound,
  type CommsMessage,
} from '@/hooks/useCommunications';

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  sent: 'default',
  draft: 'secondary',
  sending: 'outline',
  failed: 'destructive',
};

export default function CommunicationsHubPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CommsMessage | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const { data: settings } = useCommsSettings();
  const { data: mailboxes } = useCommsMailboxes();
  const { data: syncState } = useCommsSyncState();
  const { data: messages, isLoading } = useCommsMessages(search || undefined);
  const { data: outbound, refetch: refetchOutbound } = useCommsOutbound();
  const stagingMailbox = (mailboxes ?? []).find((m) => m.environment === 'staging' && m.is_active);
  const outboundEnabled = !!(settings as { outbound_enabled?: boolean } | null)?.outbound_enabled;


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
            <PraeLauncher context="Communications Hub" variant="outline" />
            {settings?.production_pilot_enabled ? (
              <Badge variant="default" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Production Pilot
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Staging Mode
              </Badge>
            )}

            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Manual approval required
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mailbox configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Production mailboxes are created inactive and always start in <strong>future only</strong> mode.
              Historical import requires a separate owner approval with an explicit date or message range, and the
              proposed baseline and estimated message count are shown before anything is imported. Passwords are never
              stored here — only the secret name reference.
            </p>
            {(mailboxes ?? []).map((m) => (
              <div key={m.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m.display_name || m.label}</span>
                  <Badge variant={m.environment === 'production' ? 'destructive' : 'secondary'}>{m.environment}</Badge>
                  <Badge variant="outline">{m.sync_start_mode === 'future_only' ? 'Future only' : 'Approved backfill'}</Badge>
                  {m.emergency_paused && <Badge variant="destructive">Emergency paused</Badge>}
                </div>
                <div className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>Address: {m.email_address}</div>
                  <div>Division: {m.division ?? '—'}</div>
                  <div>Assigned rep: {m.assigned_rep_user_id ?? 'Unassigned'}</div>
                  <div>Secret reference: {m.credential_secret_prefix ?? '—'}</div>
                  <div>Inbound: {m.inbound_enabled ? 'enabled' : 'disabled'}</div>
                  <div>Outbound: {m.outbound_enabled ? 'enabled' : 'disabled'}</div>
                  <div>IMAP: {m.imap_host}:{m.imap_port}</div>
                  <div>SMTP: {m.smtp_host}:{m.smtp_port}</div>
                  <div>
                    Sent folder:{' '}
                    {m.sent_folder
                      ? `${m.sent_folder} (verified via \\Sent)`
                      : m.sent_folder_selection_required
                        ? 'not verified — owner selection required'
                        : 'not discovered'}
                  </div>
                  <div>Baseline message id: {m.baseline_uid ?? 'not established'}</div>
                  <div>
                    Approved backfill range:{' '}
                    {m.backfill_from_uid !== null && m.backfill_to_uid !== null
                      ? `messages ${m.backfill_from_uid}–${m.backfill_to_uid}`
                      : m.backfill_from_date && m.backfill_to_date
                        ? `${fmt(m.backfill_from_date)} → ${fmt(m.backfill_to_date)}`
                        : 'none'}
                  </div>
                  <div>
                    Owner approval: {m.backfill_approved_at ? fmt(m.backfill_approved_at) : 'not approved'}
                    {m.backfill_estimated_count !== null ? ` · est. ${m.backfill_estimated_count} messages` : ''}
                  </div>
                </div>
              </div>
            ))}
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
              <CardTitle className="text-sm">Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-sm text-muted-foreground">Select a message to read it.</p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const parent = (outbound ?? []).find((o) => o.id === selected.reply_to_outbound_id);
                    if (!parent) return null;
                    return (
                      <div className="rounded-md border border-dashed p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Sent by us</Badge>
                          <span className="text-xs text-muted-foreground">{fmt(parent.sent_at ?? parent.created_at)}</span>
                        </div>
                        <div className="text-sm font-medium">{parent.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {parent.from_address} → {parent.to_address}
                        </div>
                        {parent.body_text && (
                          <pre className="whitespace-pre-wrap break-words text-xs bg-muted/40 rounded-md p-2 max-h-40 overflow-auto font-sans">
                            {parent.body_text}
                          </pre>
                        )}
                        <div className="text-[11px] text-muted-foreground break-all">
                          Message-ID {parent.message_id_header || '—'}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">{selected.subject || '(no subject)'}</h2>
                      <p className="text-xs text-muted-foreground">
                        From {selected.from_name ? `${selected.from_name} · ` : ''}
                        {selected.from_address} — {fmt(selected.sent_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">To {selected.to_addresses || '—'}</p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 shrink-0"
                      disabled={!outboundEnabled || !stagingMailbox}
                      onClick={() => setReplyOpen(true)}
                    >
                      <Reply className="h-4 w-4" /> Reply
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-sm bg-muted/40 rounded-md p-3 max-h-[420px] overflow-auto font-sans">
                    {selected.body_text || selected.snippet || '(no text content imported)'}
                  </pre>
                  {(selected.message_id_header || selected.in_reply_to_header) && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5 break-all">
                      <div>Message-ID {selected.message_id_header || '—'}</div>
                      <div>In-Reply-To {selected.in_reply_to_header || '—'}</div>
                      <div>References {selected.references_header || '—'}</div>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    {outboundEnabled
                      ? 'Replies are plain text, staging-only and require your explicit confirmation before sending.'
                      : 'Outbound sending is currently disabled.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Outbound staging log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(outbound ?? []).length === 0 && (
              <p className="text-muted-foreground">No outbound messages yet.</p>
            )}
            {(outbound ?? []).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{o.subject}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {o.from_address} → {o.to_address}
                  </div>
                  {o.error_text && <div className="text-xs text-destructive">{o.error_text}</div>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{fmt(o.sent_at ?? o.failed_at ?? o.created_at)}</span>
                  <Badge variant="outline">Sent copy: {o.sent_copy_status?.replace(/_/g, ' ') ?? 'not attempted'}</Badge>
                  <Badge variant={statusVariant[o.status] ?? 'secondary'}>{o.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <ReplyComposerDialog
          open={replyOpen}
          onOpenChange={setReplyOpen}
          fromAddress={stagingMailbox?.email_address ?? '—'}
          replyTo={selected}
          onSent={() => void refetchOutbound()}
        />
      </div>
  );

}
