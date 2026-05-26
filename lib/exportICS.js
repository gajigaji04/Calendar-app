function escapeICS(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function fold(line) {
  if (line.length <= 75) return line;
  const out = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) { out.push(' ' + line.slice(i, i + 74)); i += 74; }
  return out.join('\r\n');
}

function toICSDate(dateStr, timeStr) {
  const d = dateStr.replace(/-/g, '');
  if (!timeStr) return { prop: `DTSTART;VALUE=DATE:${d}`, end: `DTEND;VALUE=DATE:${d}` };
  const t = timeStr.replace(':', '') + '00';
  return { prop: `DTSTART:${d}T${t}`, end: `DTEND:${d}T${t}` };
}

export function generateICS(tasks, calName = 'TeamCalendar') {
  const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//TeamCalendar//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${escapeICS(calName)}`),
  ];

  for (const t of tasks) {
    const { prop, end } = toICSDate(t.date, t.due_time);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${t.id}@teamcalendar`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(prop);
    lines.push(end);
    if (t.deadline) lines.push(`DUE;VALUE=DATE:${t.deadline.replace(/-/g, '')}`);
    lines.push(fold(`SUMMARY:${escapeICS(t.title)}`));
    if (t.description) lines.push(fold(`DESCRIPTION:${escapeICS(t.description)}`));
    lines.push(`PRIORITY:${t.priority === 'high' ? 1 : t.priority === 'medium' ? 5 : 9}`);
    if (t.completed) lines.push('STATUS:COMPLETED');
    if (t.recurrence && t.recurrence !== 'none') {
      const freq = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }[t.recurrence];
      const until = t.recurrence_end ? `;UNTIL=${t.recurrence_end.replace(/-/g, '')}` : '';
      lines.push(`RRULE:FREQ=${freq}${until}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(tasks, filename = 'tasks.ics', calName) {
  const content = generateICS(tasks, calName);
  const blob = new Blob(['﻿' + content], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
