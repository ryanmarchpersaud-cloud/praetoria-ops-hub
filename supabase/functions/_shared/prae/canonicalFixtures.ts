/**
 * Phase 1E.2 — shared canonicalisation fixtures.
 *
 * These are the SINGLE source of truth used to prove that the TypeScript
 * canonicaliser (`canonicalizeAction` / `hashAction`) and the PostgreSQL
 * canonicaliser (`public.prae_canonical_action` / `public.prae_content_hash`)
 * produce byte-identical canonical strings and identical SHA-256 hashes.
 *
 * `canonical` and `hash` below were produced by the database functions and are
 * asserted against the TypeScript implementation in
 * `src/test/praeCanonicalParity.test.ts`. Synthetic data only — nothing here is
 * ever sent, stored as a real approval, or executed.
 */
import type { ProposedAction } from './approvalModel.ts';

export type CanonicalFixture = {
  name: string;
  action: ProposedAction;
  /** Canonical string produced by public.prae_canonical_action. */
  canonical: string;
  /** SHA-256 hex produced by public.prae_content_hash. */
  hash: string;
};

export const CANONICAL_FIXTURES: CanonicalFixture[] = [
  {
    name: 'email_basic',
    action: {
      channel: 'email',
      from: ' Ops@Praetoria.CA ',
      to: ['A@B.com', ' c@d.ca '],
      subject: 'Snow "quote" #1',
      body: 'line1\r\nline2\tend',
      attachments: [],
    },
    canonical:
      '["prae.v2","email","ops@praetoria.ca",["a@b.com","c@d.ca"],[],"Snow \\"quote\\" #1","line1\\nline2\\tend",[]]',
    hash: '6748dee87ea001e627084e261cb355ec30ccf027a865321da13ac0efd72ef699',
  },
  {
    name: 'email_attach',
    action: {
      channel: 'email',
      from: 'ops@x.ca',
      to: ['a@b.ca'],
      cc: ['Cc@X.CA'],
      subject: 'Sü€bject',
      body: 'héllo\nworld',
      attachments: [
        {
          storageObjectId: 'obj-1',
          storageObjectVersion: 'v1',
          filename: 'a b.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 84213,
          sha256: 'ab'.repeat(32),
        },
      ],
    },
    canonical:
      '["prae.v2","email","ops@x.ca",["a@b.ca"],["cc@x.ca"],"Sü€bject","héllo\\nworld",[["obj-1","v1","a b.pdf","application/pdf",84213,"abababababababababababababababababababababababababababababababab"]]]',
    hash: '1fef7783c353b613b68f9cf030ca567a3906d6bd88809c3cc77f9d655465b786',
  },
  {
    name: 'sms_basic',
    action: {
      channel: 'sms',
      fromNumber: ' +13065550000 ',
      toNumber: '+13065551111',
      body: 'Crew en route',
      media: [],
    },
    canonical: '["prae.v2","sms","+13065550000","+13065551111","Crew en route",[]]',
    hash: '8647c6af03693dc4940a6fd2776829ec8e23f00df19a746c3eed1d36ec343190',
  },
  {
    name: 'sms_media',
    action: {
      channel: 'sms',
      fromNumber: '+1306',
      toNumber: '+1307',
      body: 'a\\b/c',
      media: [
        {
          storageObjectId: 'm1',
          storageObjectVersion: '3',
          filename: 'p.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 0,
          sha256: '0f'.repeat(32),
        },
      ],
    },
    canonical:
      '["prae.v2","sms","+1306","+1307","a\\\\b/c",[["m1","3","p.jpg","image/jpeg",0,"0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f"]]]',
    hash: '7eeb44879e8d27ac5ef8b2b1f2b907317b9f65ce0b55bbef610b5ae7eae8f654',
  },
];
