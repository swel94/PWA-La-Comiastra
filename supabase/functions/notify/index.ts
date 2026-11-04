// Supabase Edge Function: notify
// Envía correos de confirmación, cancelación y recordatorio (español).
// P0: esqueleto. La integración con Resend se implementa en P8.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...cors }
    })
  }

  try {
    const { type, appointment_id } = await req.json()

    // TODO(P8): cargar cliente + cita (service_role) y enviar el correo con Resend.
    // Tipos: 'confirmation' | 'cancellation' | 'reminder'

    return new Response(
      JSON.stringify({ type, appointment_id, status: 'pending' }),
      { headers: { 'Content-Type': 'application/json', ...cors } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: String(err) } }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
    )
  }
})
