// Phase 1D — Prae interface shell.
//
// SYNTHETIC DEMONSTRATION CONTENT ONLY.
// Nothing here comes from the database, a mailbox, a customer record, or an AI
// model. The Prae panel is interface-only: it is not connected to the AI
// gateway and transmits nothing anywhere.

export type PraeStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'preparing_draft'
  | 'waiting_for_approval'
  | 'complete';

export const PRAE_STATUS_LABEL: Record<PraeStatus, string> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking',
  preparing_draft: 'Preparing Draft',
  waiting_for_approval: 'Waiting for Approval',
  complete: 'Complete',
};

/** Tailwind classes per status — semantic tokens only. */
export const PRAE_STATUS_TONE: Record<PraeStatus, string> = {
  idle: 'bg-muted text-muted-foreground border-border',
  listening: 'bg-primary/10 text-primary border-primary/30',
  thinking: 'bg-secondary text-secondary-foreground border-border',
  preparing_draft: 'bg-accent text-accent-foreground border-border',
  waiting_for_approval: 'bg-destructive/10 text-destructive border-destructive/30',
  complete: 'bg-primary/10 text-primary border-primary/30',
};

export type PraeActionId =
  | 'summarize_thread'
  | 'draft_reply'
  | 'find_customer'
  | 'prepare_follow_up'
  | 'review_required';

export type PraeAction = {
  id: PraeActionId;
  title: string;
  description: string;
  /** Every action in this phase is a demonstration only. */
  enabled: false;
  /** The exact proposed result a human would have to approve. */
  demo: {
    heading: string;
    lines: string[];
    approvalRequired: boolean;
    approvalNote: string;
  };
};

export const PRAE_ACTIONS: PraeAction[] = [
  {
    id: 'summarize_thread',
    title: 'Summarize Thread',
    description: 'Condense a long email thread into decisions, dates and owners.',
    enabled: false,
    demo: {
      heading: 'Proposed summary (sample data)',
      lines: [
        'Thread: "Driveway windrow after Tuesday plow" — 6 messages, sample account.',
        'Decision: crew returns on the next scheduled route pass.',
        'Open item: confirm the gate code before arrival.',
        'No pricing was discussed in this sample thread.',
      ],
      approvalRequired: false,
      approvalNote: 'Summaries are read-only and would never be sent anywhere.',
    },
  },
  {
    id: 'draft_reply',
    title: 'Draft Reply',
    description: 'Prepare a reply for a human to read, edit and approve before sending.',
    enabled: false,
    demo: {
      heading: 'Exact proposed message (sample data — nothing will be sent)',
      lines: [
        'To: sample.customer@example.com',
        'Subject: Re: Driveway windrow after Tuesday plow',
        '',
        'Hello,',
        '',
        'Thanks for letting us know. Our crew will clear the windrow on the next',
        'scheduled pass. Please confirm the gate code so we can access the drive.',
        '',
        'Praetoria Group',
      ],
      approvalRequired: true,
      approvalNote:
        'Sending is not enabled yet. When it is, the exact message above must be approved by a person before any send.',
    },
  },
  {
    id: 'find_customer',
    title: 'Find Customer',
    description: 'Locate an account, property or contact from a plain-language description.',
    enabled: false,
    demo: {
      heading: 'Proposed match (sample data)',
      lines: [
        'Sample Account — 3 properties, 1 active service plan.',
        'Primary contact: sample.customer@example.com',
        'Confidence: high. A person confirms the match before anything opens.',
      ],
      approvalRequired: false,
      approvalNote: 'Lookups are read-only and are not connected in this phase.',
    },
  },
  {
    id: 'prepare_follow_up',
    title: 'Prepare Follow-Up',
    description: 'Stage a follow-up task or reminder for review — never scheduled automatically.',
    enabled: false,
    demo: {
      heading: 'Proposed follow-up (sample data)',
      lines: [
        'Task: Confirm gate code before next route pass.',
        'Assign to: Dispatch',
        'Due: next business day',
        'Nothing is created until a person approves it.',
      ],
      approvalRequired: true,
      approvalNote: 'Task creation is not enabled yet.',
    },
  },
  {
    id: 'review_required',
    title: 'Review Required',
    description: 'Flag anything ambiguous, sensitive or high-risk for a human decision.',
    enabled: false,
    demo: {
      heading: 'Proposed escalation (sample data)',
      lines: [
        'Reason: message mentions a possible property damage claim.',
        'Recommended: route to Operations, do not auto-reply.',
        'Prae will always stop and ask on items like this.',
      ],
      approvalRequired: true,
      approvalNote: 'Escalation routing is not enabled yet.',
    },
  },
];

export const PRAE_DISABLED_LABEL = 'Not enabled yet';
