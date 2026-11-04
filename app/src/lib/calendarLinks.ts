export interface CalendarEvent {
  id: string
  title: string
  startISO: string
  endISO: string
  description?: string
  location?: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toUtcCompact(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${toUtcCompact(ev.startISO)}/${toUtcCompact(ev.endISO)}`,
    details: ev.description ?? '',
    location: ev.location ?? ''
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function icsContent(ev: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//La Cosmiatra//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@lacosmiatra`,
    `DTSTAMP:${toUtcCompact(new Date().toISOString())}`,
    `DTSTART:${toUtcCompact(ev.startISO)}`,
    `DTEND:${toUtcCompact(ev.endISO)}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
    `DESCRIPTION:${escapeIcs(ev.description ?? '')}`,
    `LOCATION:${escapeIcs(ev.location ?? '')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ]
  return lines.join('\r\n')
}

export function downloadIcs(ev: CalendarEvent) {
  const blob = new Blob([icsContent(ev)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cita-${ev.id.slice(0, 8)}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
