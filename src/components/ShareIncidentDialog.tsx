import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Building2, ShieldAlert, Flame, Cross, Landmark, UserCog, Mail, Paperclip, X, FileText } from 'lucide-react';

interface Recipient {
  type: string;
  label: string;
  icon: React.ReactNode;
  defaultEmail: string;
}

const PRESET_RECIPIENTS: Recipient[] = [
  { type: 'hr', label: 'Human Resources', icon: <UserCog className="h-4 w-4" />, defaultEmail: '' },
  { type: 'ohs', label: 'OHS / Health & Safety', icon: <ShieldAlert className="h-4 w-4" />, defaultEmail: '' },
  { type: 'police', label: 'Police', icon: <Building2 className="h-4 w-4" />, defaultEmail: '' },
  { type: 'fire', label: 'Fire Department', icon: <Flame className="h-4 w-4" />, defaultEmail: '' },
  { type: 'ems', label: 'EMS / Ambulance', icon: <Cross className="h-4 w-4" />, defaultEmail: '' },
  { type: 'government', label: 'Government / WCB', icon: <Landmark className="h-4 w-4" />, defaultEmail: '' },
];

interface ShareIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: any;
}

export function ShareIncidentDialog({ open, onOpenChange, report }: ShareIncidentDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [includePhotos, setIncludePhotos] = useState(false);
  const [customEmail, setCustomEmail] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSelectRecipient = (r: Recipient) => {
    setSelectedType(r.type);
    setRecipientName(r.label);
    setRecipientEmail(r.defaultEmail);
    setCustomEmail(false);
  };

  const handleSelectCustom = () => {
    setSelectedType('custom');
    setRecipientName('');
    setRecipientEmail('');
    setCustomEmail(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }
    setAttachedFile(file);
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAttachment = async (): Promise<string | null> => {
    if (!attachedFile) return null;
    setUploading(true);
    try {
      const ext = attachedFile.name.split('.').pop() || 'pdf';
      const path = `incident-shares/${report.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, attachedFile);
      if (error) throw error;
      // Use a 30-day signed URL so external recipients can view the file
      // without exposing the bucket publicly.
      const { data: signed, error: signErr } = await supabase
        .storage.from('attachments')
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      if (signErr) throw signErr;
      return signed?.signedUrl ?? null;
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!recipientEmail.trim()) {
      toast({ title: 'Please enter recipient email', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload attachment if present
      const attachmentUrl = await uploadAttachment();

      // Record the share
      const { error: shareError } = await supabase.from('incident_shares' as any).insert({
        incident_id: report.id,
        shared_by: user?.id || null,
        recipient_type: selectedType || 'custom',
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName.trim() || null,
        cover_note: coverNote.trim() || null,
        include_photos: includePhotos,
        attachment_url: attachmentUrl,
        attachment_name: attachedFile?.name || null,
      });
      if (shareError) throw shareError;

      // Send email via edge function with correct action format
      const r = report;
      await supabase.functions.invoke('send-email', {
        body: {
          action: 'incident_share',
          to: recipientEmail.trim(),
          subject: `Incident Report ${r.report_number || r.id.slice(0, 8).toUpperCase()} — ${r.incident_type}`,
          html: buildIncidentEmailHtml(r, coverNote, recipientName, attachmentUrl, attachedFile?.name),
        },
      });

      // Log to activity
      await supabase.from('activities').insert({
        action_name: `Incident ${r.report_number || r.id.slice(0, 8)} shared with ${recipientName || recipientEmail}`,
        record_type: 'incident_report',
        record_id: report.id,
        status: 'completed',
        user_id: user?.id || null,
      });

      toast({ title: 'Report shared successfully', description: `Sent to ${recipientEmail}` });
      qc.invalidateQueries({ queryKey: ['incident_shares', report.id] });
      onOpenChange(false);
      resetForm();
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSelectedType('');
    setRecipientEmail('');
    setRecipientName('');
    setCoverNote('');
    setIncludePhotos(false);
    setCustomEmail(false);
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Share Incident Report
          </DialogTitle>
          <DialogDescription>
            Forward {report?.report_number || 'this report'} to an external party via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Recipient selection */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Select Recipient
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_RECIPIENTS.map(r => (
                <Button
                  key={r.type}
                  type="button"
                  variant={selectedType === r.type ? 'default' : 'outline'}
                  size="sm"
                  className="justify-start gap-2 h-auto py-2.5 text-xs"
                  onClick={() => handleSelectRecipient(r)}
                >
                  {r.icon}
                  {r.label}
                </Button>
              ))}
              <Button
                type="button"
                variant={selectedType === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="justify-start gap-2 h-auto py-2.5 text-xs col-span-2"
                onClick={handleSelectCustom}
              >
                <Mail className="h-4 w-4" />
                Other / Custom Email
              </Button>
            </div>
          </div>

          {/* Email fields — shown after selecting a recipient */}
          {selectedType && (
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              {customEmail && (
                <div>
                  <Label className="text-xs">Recipient Name</Label>
                  <Input
                    placeholder="e.g. Officer Johnson, Dr. Smith"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Email Address *</Label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Cover Note</Label>
                <Textarea
                  placeholder="Add context, instructions, or follow-up actions for the recipient…"
                  value={coverNote}
                  onChange={e => setCoverNote(e.target.value)}
                  rows={3}
                />
              </div>

              {/* File attachment */}
              <div>
                <Label className="text-xs">Attach Document (optional)</Label>
                {attachedFile ? (
                  <div className="flex items-center gap-2 mt-1.5 rounded-lg border bg-muted/40 p-2.5">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">{attachedFile.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(attachedFile.size / 1024).toFixed(0)} KB
                    </span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRemoveFile}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-1.5 gap-2 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach PDF or Document
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                />
              </div>

              {report?.photos?.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-photos"
                    checked={includePhotos}
                    onCheckedChange={(v) => setIncludePhotos(!!v)}
                  />
                  <Label htmlFor="include-photos" className="text-sm cursor-pointer">
                    Mention photo links in the report ({report.photos.length} photo{report.photos.length > 1 ? 's' : ''})
                  </Label>
                </div>
              )}

              {/* Summary preview */}
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Email will include:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>• Report number, type & severity</li>
                  <li>• Date, time, and location</li>
                  <li>• Full description & people involved</li>
                  <li>• Medical attention status</li>
                  <li>• Corrective actions (if documented)</li>
                  <li>• Current investigation status</li>
                  {includePhotos && <li>• Photo links</li>}
                  {coverNote && <li>• Your cover note</li>}
                  {attachedFile && <li>• Attached document: {attachedFile.name}</li>}
                </ul>
              </div>

              <Button onClick={handleSend} disabled={sending || uploading} className="w-full gap-2">
                <Send className="h-4 w-4" />
                {uploading ? 'Uploading…' : sending ? 'Sending…' : `Send to ${recipientName || recipientEmail || 'recipient'}`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildIncidentEmailHtml(r: any, coverNote: string, recipientName: string, attachmentUrl?: string | null, attachmentName?: string | null): string {
  const reportNum = r.report_number || r.id.slice(0, 8).toUpperCase();
  const dateStr = new Date(r.date_time).toLocaleString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
      <div style="background: #1e3a5f; color: #ffffff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Incident Report — ${reportNum}</h1>
        <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.85;">Praetoria Group Inc.</p>
      </div>
      
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        ${coverNote ? `
          <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #1e40af;">Cover Note</p>
            <p style="margin: 0; font-size: 14px; color: #1e3a5f;">${coverNote.replace(/\n/g, '<br/>')}</p>
          </div>
        ` : ''}

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;">Incident Type</td>
            <td style="padding: 8px 0; font-weight: 600;">${r.incident_type}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Severity</td>
            <td style="padding: 8px 0;">
              <span style="background: ${r.severity === 'critical' || r.severity === 'high' ? '#fee2e2' : '#fef3c7'}; color: ${r.severity === 'critical' || r.severity === 'high' ? '#991b1b' : '#92400e'}; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${(r.severity || 'medium').toUpperCase()}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Date & Time</td>
            <td style="padding: 8px 0;">${dateStr}</td>
          </tr>
          ${r.location ? `<tr><td style="padding: 8px 0; color: #6b7280;">Location</td><td style="padding: 8px 0;">${r.location}</td></tr>` : ''}
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Status</td>
            <td style="padding: 8px 0;">${r.follow_up_status.charAt(0).toUpperCase() + r.follow_up_status.slice(1)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Medical Attention</td>
            <td style="padding: 8px 0; font-weight: 600; color: ${r.medical_attention ? '#991b1b' : '#166534'};">${r.medical_attention ? 'Yes — Required' : 'No'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Reporter Type</td>
            <td style="padding: 8px 0;">${r.reporter_type === 'worker' ? 'Employee / Worker' : 'Subcontractor'}</td>
          </tr>
        </table>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />

        <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">Description</h3>
        <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563; line-height: 1.6;">${(r.description || 'No description provided.').replace(/\n/g, '<br/>')}</p>

        ${r.people_involved ? `
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">People Involved</h3>
          <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">${r.people_involved}</p>
        ` : ''}

        ${r.witnesses ? `
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">Witnesses</h3>
          <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">${r.witnesses}</p>
        ` : ''}

        ${r.corrective_action_notes ? `
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">Corrective Actions</h3>
          <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">${r.corrective_action_notes.replace(/\n/g, '<br/>')}</p>
        ` : ''}

        ${r.admin_notes ? `
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">Investigation Notes</h3>
          <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">${r.admin_notes.replace(/\n/g, '<br/>')}</p>
        ` : ''}

        ${r.photos?.length > 0 ? `
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">Attached Photos</h3>
          <div style="margin-bottom: 16px;">
            ${r.photos.map((url: string, i: number) => `<a href="${url}" style="display: inline-block; margin: 4px 8px 4px 0; color: #2563eb; font-size: 13px;">📷 Photo ${i + 1}</a>`).join('')}
          </div>
        ` : ''}

        ${attachmentUrl ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #166534;">📎 Attached Document</p>
            <a href="${attachmentUrl}" style="color: #2563eb; font-size: 14px; font-weight: 500;">${attachmentName || 'Download Document'}</a>
          </div>
        ` : ''}

        <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin-top: 8px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            This incident report was shared from the Praetoria OPS Hub. For questions, contact <a href="mailto:ops@praetoriagroup.ca" style="color: #2563eb;">ops@praetoriagroup.ca</a>
          </p>
        </div>
      </div>
    </div>
  `;
}
