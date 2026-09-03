// Phase 1E — synthetic demonstration data for the Prae activity + approval UI.
//
// NOTHING HERE IS REAL. No database read, no customer record, no mailbox, no
// AI output. All addresses use example.com and all numbers are reserved
// test numbers (+1 555 01xx).

export type PraeItemStatus =
  | 'needs_approval'
  | 'completed'
  | 'failed'
  | 'needs_attention'
  | 'reviewed';

export const PRAE_ITEM_STATUS_LABEL: Record<PraeItemStatus, string> = {
  needs_approval: 'Needs Approval',
  completed: 'Completed',
  failed: 'Failed',
  needs_attention: 'Needs Attention',
  reviewed: 'Reviewed',
};

export const PRAE_ITEM_STATUS_TONE: Record<PraeItemStatus, string> = {
  needs_approval: 'bg-destructive/10 text-destructive border-destructive/30',
  completed: 'bg-primary/10 text-primary border-primary/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  needs_attention: 'bg-accent text-accent-foreground border-border',
  reviewed: 'bg-muted text-muted-foreground border-border',
};

export type PraeApprovalUiState = 'pending' | 'approved' | 'rejected' | 'expired' | 'invalidated';

export type PraeEmailProposal = {
  channel: 'email';
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachments: { filename: string; sizeBytes: number }[];
};

export type PraeSmsProposal = {
  channel: 'sms';
  fromNumber: string;
  toNumber: string;
  body: string;
  media: { filename: string }[];
};

export type PraeActivityItem = {
  id: string;
  detected: string;
  prepared: string;
  status: PraeItemStatus;
  occurredAt: string;
  division: string;
  representative: string;
  approvalRequired: boolean;
  approvalState?: PraeApprovalUiState;
  decidedBy?: string;
  decidedAction?: 'approved' | 'rejected' | 'edited';
  outcome: string;
  relatedRecords: { label: string; value: string }[];
  risks: string[];
  proposal?: PraeEmailProposal | PraeSmsProposal;
};

export const PRAE_ACTIVITY_DEMO: PraeActivityItem[] = [
  {
    id: 'demo-1',
    detected: 'Inbound sample email asking when the next plow pass happens.',
    prepared: 'Drafted a reply confirming the next scheduled route pass.',
    status: 'needs_approval',
    occurredAt: '2026-09-03T14:12:00.000Z',
    division: 'Snow & Ice',
    representative: 'Dispatch (sample)',
    approvalRequired: true,
    approvalState: 'pending',
    outcome: 'Held for human approval — nothing sent.',
    relatedRecords: [
      { label: 'Customer', value: 'Sample Account (demo)' },
      { label: 'Property', value: '000 Demo Street (demo)' },
      { label: 'Job', value: 'JOB-DEMO-001' },
    ],
    risks: ['Reply mentions a schedule commitment — confirm the route before approving.'],
    proposal: {
      channel: 'email',
      from: 'staging@example.com',
      to: ['sample.customer@example.com'],
      cc: ['dispatch@example.com'],
      subject: 'Re: Next plow pass for 000 Demo Street',
      body:
        'Hello,\n\nThanks for checking in. Our crew is scheduled for the next route pass and ' +
        'will clear the windrow at the end of the driveway while they are on site.\n\n' +
        'Please confirm the gate code so we can access the rear lane.\n\nPraetoria Group',
      attachments: [{ filename: 'demo-route-notice.pdf', sizeBytes: 84_213 }],
    },
  },
  {
    id: 'demo-2',
    detected: 'Sample crew running behind on a demo route.',
    prepared: 'Drafted a short SMS advising of a delay.',
    status: 'needs_approval',
    occurredAt: '2026-09-03T15:02:00.000Z',
    division: 'Landscaping & Grounds',
    representative: 'Ops Coordinator (sample)',
    approvalRequired: true,
    approvalState: 'pending',
    outcome: 'Held for human approval — nothing sent.',
    relatedRecords: [
      { label: 'Customer', value: 'Sample Strata (demo)' },
      { label: 'Visit', value: 'VISIT-DEMO-014' },
    ],
    risks: [
      'Outbound SMS to a customer is disabled for launch.',
      'Message must carry an opt-out line before any real send.',
    ],
    proposal: {
      channel: 'sms',
      fromNumber: '+15550100',
      toNumber: '+15550142',
      body:
        'Praetoria Group: our crew is running about 40 minutes behind on today\u2019s visit. ' +
        'No action needed. Reply STOP to opt out.',
      media: [],
    },
  },
  {
    id: 'demo-3',
    detected: 'Sample thread with six messages and conflicting dates.',
    prepared: 'Produced a read-only summary of decisions and open items.',
    status: 'completed',
    occurredAt: '2026-09-02T19:40:00.000Z',
    division: 'Property Care & Maintenance',
    representative: 'Service Manager (sample)',
    approvalRequired: false,
    outcome: 'Summary shown in the hub. Read-only, nothing sent.',
    relatedRecords: [{ label: 'Quote', value: 'QUO-DEMO-221' }],
    risks: [],
  },
  {
    id: 'demo-4',
    detected: 'Sample follow-up reminder proposed for an unanswered quote.',
    prepared: 'Prepared a follow-up task for Dispatch.',
    status: 'completed',
    occurredAt: '2026-09-02T13:05:00.000Z',
    division: 'Snow & Ice',
    representative: 'Dispatch (sample)',
    approvalRequired: true,
    approvalState: 'approved',
    decidedBy: 'Owner (sample)',
    decidedAction: 'approved',
    outcome: 'Approved in the Ops Hub. Execution remains disabled in this phase.',
    relatedRecords: [{ label: 'Quote', value: 'QUO-DEMO-198' }],
    risks: [],
  },
  {
    id: 'demo-5',
    detected: 'Sample message mentioning a possible property damage claim.',
    prepared: 'Escalated for human review instead of drafting a reply.',
    status: 'needs_attention',
    occurredAt: '2026-09-03T09:18:00.000Z',
    division: 'Property Care & Maintenance',
    representative: 'Operations (sample)',
    approvalRequired: true,
    approvalState: 'pending',
    outcome: 'Awaiting a human decision. Prae will not reply to items like this.',
    relatedRecords: [{ label: 'Incident', value: 'INC-DEMO-007' }],
    risks: ['Potential liability language detected — legal/insurance sensitivity.'],
  },
  {
    id: 'demo-6',
    detected: 'Sample draft whose content changed after approval was requested.',
    prepared: 'Re-drafted the reply; the prior approval was invalidated.',
    status: 'failed',
    occurredAt: '2026-09-01T22:31:00.000Z',
    division: 'Junk Removal',
    representative: 'Dispatch (sample)',
    approvalRequired: true,
    approvalState: 'invalidated',
    decidedBy: 'Ops Manager (sample)',
    decidedAction: 'edited',
    outcome: 'Approval invalidated by the edit. A fresh approval would be required.',
    relatedRecords: [{ label: 'Invoice', value: 'INV-DEMO-3312' }],
    risks: ['Content changed after approval — replay of the old approval is rejected.'],
  },
];

export const PRAE_TABS = [
  { id: 'activity', label: 'Activity' },
  { id: 'needs_approval', label: 'Needs Approval' },
  { id: 'completed', label: 'Completed' },
  { id: 'attention', label: 'Failed / Needs Attention' },
] as const;

export type PraeTabId = (typeof PRAE_TABS)[number]['id'];

export function filterPraeItems(items: PraeActivityItem[], tab: PraeTabId): PraeActivityItem[] {
  switch (tab) {
    case 'needs_approval':
      return items.filter((i) => i.status === 'needs_approval');
    case 'completed':
      return items.filter((i) => i.status === 'completed');
    case 'attention':
      return items.filter((i) => i.status === 'failed' || i.status === 'needs_attention');
    default:
      return items;
  }
}
