import { supabase } from '@/integrations/supabase/client';

export interface LogQuoteFollowUpChangeArgs {
  quoteId: string;
  quoteNumber?: string | null;
  previousDueAt: string | null;
  nextDueAt: string | null;
  source: 'follow_ups_view' | 'quote_detail';
}

/**
 * Records a follow-up due-date change to the `activities` table so admins can
 * see who moved or cleared a quote's follow-up date and when. Fire-and-forget;
 * failures are swallowed so logging never blocks the UI flow.
 */
export async function logQuoteFollowUpChange({
  quoteId,
  quoteNumber,
  previousDueAt,
  nextDueAt,
  source,
}: LogQuoteFollowUpChangeArgs): Promise<void> {
  try {
    // No-op if nothing actually changed.
    if ((previousDueAt || null) === (nextDueAt || null)) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || null;
    const editorEmail = sessionData.session?.user?.email || null;

    let actionName: string;
    if (!previousDueAt && nextDueAt) actionName = 'quote.follow_up.set';
    else if (previousDueAt && !nextDueAt) actionName = 'quote.follow_up.cleared';
    else actionName = 'quote.follow_up.updated';

    await supabase.from('activities').insert({
      action_name: actionName,
      record_type: 'quote',
      record_id: quoteId,
      status: 'success',
      user_id: userId,
      workflow_name: 'quote_follow_up_tracking',
      payload_summary: {
        quote_id: quoteId,
        quote_number: quoteNumber || null,
        previous_due_at: previousDueAt,
        next_due_at: nextDueAt,
        editor_user_id: userId,
        editor_email: editorEmail,
        source,
        changed_at: new Date().toISOString(),
      },
    });
  } catch {
    // Logging is best-effort — never throw.
  }
}
