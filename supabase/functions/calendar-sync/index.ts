// Supabase Edge Function: calendar-sync
// Sincroniza citas con Google Calendar + gestiona OAuth.
// P0: esqueleto con las rutas definidas. La lógica completa se implementa en P4.

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/calendar-sync/, '')

  try {
    if (req.method === 'GET' && path === '/authorize') {
      // TODO(P4): construir la URL de consentimiento de Google OAuth y devolverla.
      return json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?…' }, cors)
    }

    if (req.method === 'GET' && path === '/callback') {
      // TODO(P4): intercambiar `code` por tokens y guardarlos en Vault.
      return json({ ok: true }, cors)
    }

    if (req.method === 'POST' && path === '/sync-event') {
      // TODO(P4): crear/actualizar/borrar el evento según el estado de la cita.
      const { appointment_id, action } = await req.json()
      return json({ appointment_id, action, status: 'pending' }, cors)
    }

    if (req.method === 'POST' && path === '/refresh') {
      // TODO(P4): refrescar el access token.
      return json({ ok: true }, cors)
    }

    return json({ error: 'not_found' }, cors, 404)
  } catch (err) {
    return json({ error: { message: String(err) } }, cors, 500)
  }
})

function json(body: unknown, headers: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  })
}
