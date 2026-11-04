import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn, role } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Si ya hay sesión (o justo se inició), redirigir según el rol.
  useEffect(() => {
    if (role === 'admin') navigate('/panel', { replace: true })
    else if (role === 'customer') navigate('/mis-citas', { replace: true })
  }, [role, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError('Correo o contraseña incorrectos.')
  }

  return (
    <div className="app" style={{ maxWidth: 400 }}>
      <header className="app-header">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <img
            src="/logo-mark.jpg"
            alt="La Cosmiatra"
            style={{ height: 28, width: 'auto', mixBlendMode: 'multiply' }}
          />
        </Link>
      </header>

      <h2>Acceso esteticista</h2>
      <p className="muted">Ingresa con tu correo y contraseña para administrar tu negocio.</p>

      <form onSubmit={handleSubmit}>
        <label className="label" htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label className="label" htmlFor="password">Contraseña</label>
        <input
          id="password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 16 }}>
        ¿No tienes cuenta? <Link to="/reservar">Reserva una cita</Link> y crea tu perfil.
      </p>

      <p className="muted" style={{ marginTop: 8 }}>
        <Link to="/">← Volver al inicio</Link>
      </p>
    </div>
  )
}
