import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Check, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PortalQuotes() {
  const { user } = useAuth();
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revisionDialog, setRevisionDialog] = useState<{ open: boolean; quoteId: string; quoteNumber: string }>({ open: false, quoteId: '', quoteNumber: '' });
  const [revisionNote, setRevisionNote] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; quoteId: string; quoteNumber: string; action: 'approve' | 'decline' }>({ open: false, quoteId: '', quoteNumber: '', action: 'approve' });

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['portal_quotes', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, service_category, approval_status, total, subtotal, tax, created_at, scope_of_work, quote_line_items(id, item_name, description, quantity, unit_price, line_total, sort_order)')
        .eq('customer_id', customer.id)
        .in('approval_status', ['Sent', 'Needs review', 'Approved', 'Declined'] as any)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const updateQuote = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('quotes')
        .update({ approval_status: status as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_quotes'] });
      qc.invalidateQueries({ queryKey: ['portal_dash_quotes'] });
    },
  });

  const handleApproveDecline = async () => {
    const status = confirmDialog.action === 'approve' ? 'Approved' : 'Declined';
    try {
      await updateQuote.mutateAsync({ id: confirmDialog.quoteId, status });
      // Log activity
      await supabase.from('activities').insert({
        action_name: `Customer ${confirmDialog.action}d quote`,
        user_id: user?.id,
        record_type: 'quote',
        record_id: confirmDialog.quoteId,
        workflow_name: 'customer_portal',
        payload_summary: { quote_number: confirmDialog.quoteNumber, action: confirmDialog.action },
        status: 'completed',
      } as any);
      toast({ title: `Quote ${status.toLowerCase()}`, description: `${confirmDialog.quoteNumber} has been ${status.toLowerCase()}.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setConfirmDialog({ open: false, quoteId: '', quoteNumber: '', action: 'approve' });
  };

  const handleRevisionRequest = async () => {
    if (!revisionNote.trim()) return;
    try {
      // Log as activity (admin will see this)
      await supabase.from('activities').insert({
        action_name: 'Customer requested quote revision',
        user_id: user?.id,
        record_type: 'quote',
        record_id: revisionDialog.quoteId,
        workflow_name: 'customer_portal',
        payload_summary: { quote_number: revisionDialog.quoteNumber, revision_note: revisionNote.trim() },
        status: 'completed',
      } as any);
      toast({ title: 'Revision requested', description: 'Your feedback has been sent to our team.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setRevisionNote('');
    setRevisionDialog({ open: false, quoteId: '', quoteNumber: '' });
  };

  const actionable = (status: string) => ['Sent', 'Needs review'].includes(status);

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold">My Quotes</h1>
      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : quotes.length === 0 ? (
        <Card><CardContent className="py-10 text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No quotes found.</p>
          <p className="text-xs text-muted-foreground">When we prepare a quote for you, it will appear here.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q: any) => {
            const isExpanded = expandedId === q.id;
            const lineItems = (q.quote_line_items || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
            const canAct = actionable(q.approval_status);

            return (
              <Card key={q.id} className={cn('transition-shadow', canAct && 'border-amber-300/50 dark:border-amber-700/30')}>
                <CardContent className="pt-4 space-y-3">
                  {/* Header */}
                  <button onClick={() => setExpandedId(isExpanded ? null : q.id)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm font-mono">{q.quote_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={q.approval_status} />
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{q.service_category}</span>
                      <span className="font-semibold text-foreground text-sm">${Number(q.total || 0).toFixed(2)}</span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="space-y-3 border-t border-border pt-3">
                      {q.scope_of_work && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Scope of Work</p>
                          <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">{q.scope_of_work}</p>
                        </div>
                      )}

                      {/* Line items */}
                      {lineItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Line Items</p>
                          <div className="border border-border rounded-md overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left px-3 py-1.5 font-medium">Item</th>
                                  <th className="text-right px-3 py-1.5 font-medium w-16">Qty</th>
                                  <th className="text-right px-3 py-1.5 font-medium w-20">Price</th>
                                  <th className="text-right px-3 py-1.5 font-medium w-20">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lineItems.map((li: any) => (
                                  <tr key={li.id} className="border-t border-border">
                                    <td className="px-3 py-2">
                                      <p className="font-medium">{li.item_name}</p>
                                      {li.description && <p className="text-muted-foreground mt-0.5">{li.description}</p>}
                                    </td>
                                    <td className="text-right px-3 py-2">{li.quantity}</td>
                                    <td className="text-right px-3 py-2">${Number(li.unit_price || 0).toFixed(2)}</td>
                                    <td className="text-right px-3 py-2 font-medium">${Number(li.line_total || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 mt-2 text-xs">
                            <span className="text-muted-foreground">Subtotal: ${Number(q.subtotal || 0).toFixed(2)}</span>
                            <span className="text-muted-foreground">Tax: ${Number(q.tax || 0).toFixed(2)}</span>
                            <span className="font-semibold text-sm">Total: ${Number(q.total || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground">
                        Received {format(new Date(q.created_at), 'MMMM d, yyyy')}
                      </p>

                      {/* Action buttons */}
                      {canAct && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 min-w-[100px]"
                            onClick={() => setConfirmDialog({ open: true, quoteId: q.id, quoteNumber: q.quote_number, action: 'approve' })}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 min-w-[100px]"
                            onClick={() => setConfirmDialog({ open: true, quoteId: q.id, quoteNumber: q.quote_number, action: 'decline' })}
                          >
                            <X className="h-4 w-4 mr-1" /> Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 min-w-[100px]"
                            onClick={() => setRevisionDialog({ open: true, quoteId: q.id, quoteNumber: q.quote_number })}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" /> Request Revision
                          </Button>
                        </div>
                      )}

                      {q.approval_status === 'Approved' && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> You approved this quote
                        </p>
                      )}
                      {q.approval_status === 'Declined' && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <X className="h-3.5 w-3.5" /> You declined this quote
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm approve/decline dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(o) => !o && setConfirmDialog({ open: false, quoteId: '', quoteNumber: '', action: 'approve' })}>
        <DialogContent className="max-w-sm mx-3">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'approve' ? 'Approve Quote' : 'Decline Quote'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'approve'
                ? `Are you sure you want to approve ${confirmDialog.quoteNumber}? This confirms you'd like to proceed with the quoted work.`
                : `Are you sure you want to decline ${confirmDialog.quoteNumber}? You can always request a new quote later.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDialog({ open: false, quoteId: '', quoteNumber: '', action: 'approve' })}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              variant={confirmDialog.action === 'decline' ? 'destructive' : 'default'}
              disabled={updateQuote.isPending}
              onClick={handleApproveDecline}
            >
              {updateQuote.isPending ? 'Processing...' : confirmDialog.action === 'approve' ? 'Approve' : 'Decline'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revision request dialog */}
      <Dialog open={revisionDialog.open} onOpenChange={(o) => { if (!o) { setRevisionDialog({ open: false, quoteId: '', quoteNumber: '' }); setRevisionNote(''); } }}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Let us know what changes you'd like for {revisionDialog.quoteNumber}. Our team will review and update the quote.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="e.g. Can you adjust the pricing for bi-weekly service? I'd also like to add gutter cleaning..."
            rows={4}
          />
          <Button
            className="w-full"
            disabled={!revisionNote.trim()}
            onClick={handleRevisionRequest}
          >
            Send Revision Request
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
