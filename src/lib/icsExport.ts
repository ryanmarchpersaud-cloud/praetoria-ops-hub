/**
 * Minimal ICS (RFC 5545) generator for a single calendar event.
 * Includes only safe fields: title, times, plain description, action URL.
 * Never includes admin/tenant/owner private notes or financial data.
 */

function pad(n: number) { return n.toString().padStart(2, '0'); }

function toICSDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  if (allDay) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  }
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeICS(text: string): string {
  return (text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export type ICSEventInput = {
  uid: string;
  title: string;
  startISO: string;
  endISO?: string | null;
  allDay?: boolean;
  description?: string;
  location?: string;
  url?: string;
};

export function buildICS(evt: ICSEventInput): string {
  const allDay = !!evt.allDay;
  const dtStart = toICSDate(evt.startISO, allDay);
  const endISO =
    evt.endISO ??
    new Date(new Date(evt.startISO).getTime() + (allDay ? 24 * 3600 * 1000 : 60 * 60 * 1000)).toISOString();
  const dtEnd = toICSDate(endISO, allDay);
  const dtStamp = toICSDate(new Date().toISOString(), false);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Praetoria Group//PM Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${evt.uid}@praetoriagroup.ca`,
    `DTSTAMP:${dtStamp}`,
    allDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
    allDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(evt.title)}`,
  ];
  if (evt.description) lines.push(`DESCRIPTION:${escapeICS(evt.description)}`);
  if (evt.location) lines.push(`LOCATION:${escapeICS(evt.location)}`);
  if (evt.url) lines.push(`URL:${escapeICS(evt.url)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
