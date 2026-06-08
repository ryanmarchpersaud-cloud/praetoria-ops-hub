import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

interface IncidentPrintButtonProps {
  report: any;
}

export function IncidentPrintButton({ report }: IncidentPrintButtonProps) {
  const r = report;

  const handlePrint = () => {
    const reportNum = r.report_number || r.id.slice(0, 8).toUpperCase();
    const dateStr = format(new Date(r.date_time), 'EEEE, MMMM d, yyyy · h:mm a');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Incident Report ${reportNum}</title>
  <style>
    @media print { @page { margin: 0.75in; } }
    body { font-family: Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 24px; }
    .header { background: #1e3a5f; color: #fff; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 6px; }
    .badge-severity { background: ${r.severity === 'critical' || r.severity === 'high' ? '#fee2e2' : '#fef3c7'}; color: ${r.severity === 'critical' || r.severity === 'high' ? '#991b1b' : '#92400e'}; }
    .badge-status { background: #e0f2fe; color: #0369a1; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    td { padding: 6px 0; vertical-align: top; }
    td:first-child { color: #6b7280; width: 160px; }
    .description { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    .medical-yes { color: #991b1b; font-weight: 600; }
    .medical-no { color: #166534; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Incident Report — ${reportNum}</h1>
    <p>Praetoria Group Inc. &bull; Confidential</p>
  </div>

  <div style="margin-bottom: 16px;">
    <span class="badge badge-severity">${(r.severity || 'medium').toUpperCase()}</span>
    <span class="badge badge-status">${r.follow_up_status.toUpperCase()}</span>
    <span class="badge" style="background:#f3f4f6;color:#374151;">${r.reporter_type === 'worker' ? 'Employee' : 'Subcontractor'}</span>
  </div>

  <div class="section">
    <h2>Incident Details</h2>
    <table>
      <tr><td>Type</td><td><strong>${esc(r.incident_type)}</strong></td></tr>
      <tr><td>Date & Time</td><td>${esc(dateStr)}</td></tr>
      ${r.location ? `<tr><td>Location</td><td>${esc(r.location)}</td></tr>` : ''}
      <tr><td>Medical Attention</td><td class="${r.medical_attention ? 'medical-yes' : 'medical-no'}">${r.medical_attention ? 'Yes — Required' : 'No'}</td></tr>
      ${r.reported_to ? `<tr><td>Reported To</td><td>${esc(r.reported_to)}</td></tr>` : ''}
      ${r.root_cause_category ? `<tr><td>Root Cause</td><td>${esc(r.root_cause_category)}</td></tr>` : ''}
    </table>
  </div>

  <div class="section">
    <h2>Description</h2>
    <p class="description">${esc(r.description || 'No description provided.')}</p>
  </div>

  ${r.people_involved ? `
  <div class="section">
    <h2>People Involved</h2>
    <p>${esc(r.people_involved)}</p>
  </div>` : ''}

  ${r.witnesses ? `
  <div class="section">
    <h2>Witnesses</h2>
    <p>${esc(r.witnesses)}</p>
  </div>` : ''}

  ${r.root_cause_description ? `
  <div class="section">
    <h2>Root Cause Analysis</h2>
    <p class="description">${esc(r.root_cause_description)}</p>
  </div>` : ''}

  ${r.corrective_action_notes ? `
  <div class="section">
    <h2>Corrective Actions</h2>
    <p class="description">${esc(r.corrective_action_notes)}</p>
  </div>` : ''}

  ${r.admin_notes ? `
  <div class="section">
    <h2>Investigation Notes</h2>
    <p class="description">${esc(r.admin_notes)}</p>
  </div>` : ''}

  <div class="footer">
    <p>Generated from Praetoria OPS Hub &bull; ${format(new Date(), 'MMM d, yyyy h:mm a')} &bull; ops@praetoriagroup.ca</p>
    <p>This document is confidential. Distribution without authorization is prohibited.</p>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 300);
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
      <Printer className="h-4 w-4" />
      Print Report
    </Button>
  );
}
