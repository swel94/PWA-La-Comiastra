/** Normaliza un teléfono a formato internacional (solo dígitos). */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '')
  // República Dominicana: 10 dígitos que empiezan con 809/829/849
  if (digits.length === 10 && /^(809|829|849)/.test(digits)) return `1${digits}`
  return digits
}

/** Enlace de WhatsApp click-to-chat con mensaje prellenado. */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  message: string
): string | null {
  const digits = normalizePhone(phone)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function buildReminderMessage(args: {
  customerName: string
  service: string
  dateLabel: string
  timeLabel: string
  business?: string
}): string {
  const business = args.business ?? 'La Cosmiatra'
  return `Hola ${args.customerName}, te recuerdo tu cita de ${args.service} el ${args.dateLabel} a las ${args.timeLabel} en ${business}. ¿Nos confirmas? ¡Gracias!`
}
