import { Fragment, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { Check, AlertCircle, PenLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AgreementField,
  AgreementFieldRole,
  AgreementFieldValues,
  isFieldComplete,
  isFieldVisible,
  parseMulti,
  serializeMulti,
  splitDocument,
} from '@/lib/agreementFields';
import { SignaturePreview, parseSignature } from './SignatureModal';


interface Props {
  bodyHtml: string;
  schema: AgreementField[];
  values: AgreementFieldValues;
  /** Which role may currently fill fields. Omit for read-only preview. */
  interactiveRole?: AgreementFieldRole;
  activeFieldKey?: string | null;
  showRequiredHints?: boolean;
  signedDates?: Partial<Record<AgreementFieldRole, string | null>>;
  onChange?: (key: string, value: string | boolean) => void;
  onSignatureRequest?: (field: AgreementField) => void;
  registerFieldRef?: (key: string, el: HTMLDivElement | null) => void;
}

export function AgreementDocument({
  bodyHtml,
  schema,
  values,
  interactiveRole,
  activeFieldKey,
  showRequiredHints = true,
  signedDates,
  onChange,
  onSignatureRequest,
  registerFieldRef,
}: Props) {
  const segments = useMemo(() => splitDocument(bodyHtml || ''), [bodyHtml]);
  const schemaMap = useMemo(() => {
    const m: Record<string, AgreementField> = {};
    (schema || []).forEach((f) => { m[f.key] = f; });
    return m;
  }, [schema]);

  return (
    <div className="agreement-doc-body prose prose-sm max-w-none">
      {segments.map((seg, i) => {
        if (seg.type === 'html') {
          return <div key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(seg.content) }} />;
        }
        const field = schemaMap[seg.content];
        if (!field) return null;
        if (!isFieldVisible(field, values || {})) return null;

        return (
          <FieldControl
            key={`${seg.content}-${i}`}
            field={field}
            value={values?.[field.key]}
            editable={interactiveRole === field.role}
            active={activeFieldKey === field.key}
            showRequiredHints={showRequiredHints}
            signedDate={signedDates?.[field.role] || null}
            onChange={onChange}
            onSignatureRequest={onSignatureRequest}
            registerFieldRef={registerFieldRef}
          />
        );
      })}
    </div>
  );
}

function FieldControl({
  field, value, editable, active, showRequiredHints, signedDate, onChange, onSignatureRequest, registerFieldRef,
}: {
  field: AgreementField;
  value: string | boolean | null | undefined;
  editable: boolean;
  active: boolean;
  showRequiredHints: boolean;
  signedDate: string | null;
  onChange?: (key: string, value: string | boolean) => void;
  onSignatureRequest?: (field: AgreementField) => void;
  registerFieldRef?: (key: string, el: HTMLDivElement | null) => void;
}) {
  const complete = isFieldComplete(field, { [field.key]: value } as AgreementFieldValues);
  const required = field.required !== false;
  const needsAttention = editable && required && !complete;

  const wrapperClass = [
    'agreement-field not-prose my-3 rounded-lg border-2 p-3 transition-colors',
    needsAttention ? 'border-amber-400 bg-amber-50/70' : complete ? 'border-emerald-300 bg-emerald-50/50' : 'border-border bg-muted/30',
    active ? 'ring-2 ring-primary ring-offset-2' : '',
  ].join(' ');

  const label = (
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field.label}</span>
      {showRequiredHints && required && (
        complete
          ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><Check className="h-3 w-3" /> Completed</span>
          : editable
            ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700"><AlertCircle className="h-3 w-3" /> Required</span>
            : null
      )}
    </div>
  );

  return (
    <div ref={(el) => registerFieldRef?.(field.key, el)} className={wrapperClass} id={`agreement-field-${field.key}`}>
      {label}

      {field.type === 'select' && (
        editable ? (
          <Select value={(value as string) || ''} onValueChange={(v) => onChange?.(field.key, v)}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Select an option…" /></SelectTrigger>
            <SelectContent>
              {(field.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : <p className="font-semibold m-0">{(value as string) || '—'}</p>
      )}

      {field.type === 'multiselect' && (
        editable ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((o) => {
              const list = parseMulti(value);
              const checked = list.includes(o);
              return (
                <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) =>
                      onChange?.(
                        field.key,
                        serializeMulti(
                          c === true ? [...list, o] : list.filter((x) => x !== o),
                        ),
                      )
                    }
                  />
                  <span>{o}</span>
                </label>
              );
            })}
          </div>
        ) : <p className="font-semibold m-0">{serializeMulti(parseMulti(value)) || '—'}</p>
      )}


      {(field.type === 'text' || field.type === 'initials') && (
        editable ? (
          <Input
            className="bg-background"
            value={(value as string) || ''}
            placeholder={field.placeholder}
            maxLength={field.type === 'initials' ? 6 : undefined}
            onChange={(e) => onChange?.(field.key, e.target.value)}
          />
        ) : <p className="font-semibold m-0">{(value as string) || '—'}</p>
      )}

      {field.type === 'date' && (
        editable ? (
          <Input type="date" className="bg-background" value={(value as string) || ''} onChange={(e) => onChange?.(field.key, e.target.value)} />
        ) : <p className="font-semibold m-0">{(value as string) || '—'}</p>
      )}

      {field.type === 'checkbox' && (
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={value === true}
            disabled={!editable}
            onCheckedChange={(c) => onChange?.(field.key, c === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-snug">{field.checkboxText || field.label}</span>
        </label>
      )}

      {field.type === 'signature' && (
        <div className="space-y-2">
          <div className="min-h-[72px] rounded-md border bg-background flex items-center justify-center px-4 py-2">
            {value ? (
              <SignaturePreview sig={parseSignature(value as string)} />
            ) : editable ? (
              <Button type="button" variant="secondary" onClick={() => onSignatureRequest?.(field)}>
                <PenLine className="h-4 w-4 mr-2" /> Click to Sign
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Awaiting signature</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Signed Date: {signedDate ? format(new Date(signedDate), 'MMMM d, yyyy h:mm a') : value ? format(new Date(), 'MMMM d, yyyy') : '—'}</span>
            {value && editable && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onSignatureRequest?.(field)}>Change</Button>
            )}
          </div>
        </div>
      )}

      {field.helpText && <p className="text-xs text-muted-foreground mt-2 mb-0">{field.helpText}</p>}
    </div>
  );
}

export default AgreementDocument;
