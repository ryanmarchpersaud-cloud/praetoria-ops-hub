/**
 * Fillable field system for Praetoria agreements.
 *
 * An agreement body is plain HTML that may contain field placeholders:
 *   <span data-agreement-field="snowfall_trigger"></span>
 *
 * `field_schema` (jsonb on the agreement) describes each field, and
 * `field_values` stores what the signer entered.
 */

export type AgreementFieldType = 'text' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'initials' | 'signature';
export type AgreementFieldRole = 'customer' | 'praetoria';

/** Conditional visibility: the field only shows when another field matches. */
export interface AgreementFieldCondition {
  key: string;
  equalsAny?: string[];
  startsWith?: string;
}

export interface AgreementField {
  key: string;
  label: string;
  type: AgreementFieldType;
  role: AgreementFieldRole;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  /** Text shown next to a checkbox / acknowledgement field. */
  checkboxText?: string;
  /** Only render / require this field when the condition is satisfied. */
  visibleWhen?: AgreementFieldCondition;
}

export type AgreementFieldValues = Record<string, string | boolean | null | undefined>;

/** Multi-select values are stored as a comma-separated string. */
export function parseMulti(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeMulti(list: string[]): string {
  return list.join(', ');
}

export function isFieldVisible(field: AgreementField, values: AgreementFieldValues): boolean {
  const cond = field.visibleWhen;
  if (!cond) return true;
  const raw = String(values?.[cond.key] ?? '');
  if (cond.startsWith) return raw.startsWith(cond.startsWith);
  if (cond.equalsAny) return cond.equalsAny.includes(raw);
  return Boolean(raw);
}


export const FIELD_PLACEHOLDER_RE = /<span[^>]*data-agreement-field="([a-z0-9_]+)"[^>]*>\s*<\/span>/gi;

export interface DocSegment {
  type: 'html' | 'field';
  content: string;
}

/** Split a body HTML string into HTML chunks and field placeholders, in order. */
export function splitDocument(html: string): DocSegment[] {
  const segments: DocSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(FIELD_PLACEHOLDER_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m.index > lastIndex) segments.push({ type: 'html', content: html.slice(lastIndex, m.index) });
    segments.push({ type: 'field', content: m[1] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < html.length) segments.push({ type: 'html', content: html.slice(lastIndex) });
  return segments;
}

export function fieldPlaceholder(key: string) {
  return `<span data-agreement-field="${key}"></span>`;
}

export function isFieldComplete(field: AgreementField, values: AgreementFieldValues): boolean {
  const v = values?.[field.key];
  if (field.type === 'checkbox') return v === true;
  if (field.type === 'multiselect') return parseMulti(v).length > 0;
  return typeof v === 'string' ? v.trim().length > 0 : Boolean(v);
}

export function requiredFieldsFor(
  schema: AgreementField[],
  role: AgreementFieldRole,
  values?: AgreementFieldValues,
): AgreementField[] {
  return (schema || []).filter(
    (f) => f.role === role && f.required !== false && (!values || isFieldVisible(f, values)),
  );
}

export function completionState(schema: AgreementField[], values: AgreementFieldValues, role: AgreementFieldRole) {
  const required = requiredFieldsFor(schema, role, values);
  const completed = required.filter((f) => isFieldComplete(f, values));

  return {
    required,
    completedCount: completed.length,
    total: required.length,
    firstIncomplete: required.find((f) => !isFieldComplete(f, values)) || null,
    allComplete: completed.length === required.length,
  };
}

/** Replace {{token}} merge fields in a template body. Unknown tokens are left blank. */
export function applyMergeData(html: string, data: Record<string, string | number | null | undefined>): string {
  return html.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_full, key: string) => {
    const v = data?.[key];
    return v === null || v === undefined || v === '' ? '—' : String(v);
  });
}
