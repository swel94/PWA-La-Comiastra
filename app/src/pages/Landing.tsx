import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { fetchActiveServices, type Service } from '../lib/services'
import '../lib/landing.css'

const trust = [
  'Atención personalizada',
  'Productos profesionales',
  'Ambiente privado',
  'Reservas en línea'
]

const steps = [
  {
    num: '01',
    title: 'Elige tu servicio',
    text: 'Selecciona el tratamiento que necesitas o el que más te llame la atención.'
  },
  {
    num: '02',
    title: 'Escoge fecha y hora',
    text: 'Consulta los horarios disponibles y reserva el que mejor te quede.'
  },
  {
    num: '03',
    title: 'Confirma y listo',
    text: 'Recibirás tu confirmación por correo y te esperamos en la cabina estética.'
  }
]

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Landing() {
  const { session, role, signOut } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchActiveServices()
      .then((data) => {
        if (!cancelled) setServices(data)
      })
      .catch(() => {
        if (!cancelled) setServices([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="site">
      <header className="l-nav">
        <div className="l-nav__inner">
          <Link to="/" className="l-nav__brand">
            <img src="/logo-mark.jpg" alt="La Cosmiatra" />
          </Link>

          <nav className="l-nav__links">
            <a className="l-nav__link" href="#inicio">Inicio</a>
            <a className="l-nav__link" href="#servicios">Servicios</a>
            <a className="l-nav__link" href="#sobre-mi">Sobre mí</a>
            <a className="l-nav__link" href="#contacto">Contacto</a>
          </nav>

          <div className="l-nav__actions">
            {session && (
              <>
                {role === 'admin' ? (
                  <Link className="l-nav__link" to="/panel">Panel</Link>
                ) : (
                  <Link className="l-nav__link" to="/mis-citas">Mis citas</Link>
                )}
                <button className="l-nav__auth" onClick={() => signOut()}>
                  Salir
                </button>
              </>
            )}
            <Link to="/reservar" className="l-btn l-btn--primary l-btn--sm">
              Reservar cita
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="l-hero" id="inicio">
          <div className="l-hero__grid">
            <div className="l-hero__copy">
              <span className="l-eyebrow">Estética facial · Cuidado personalizado</span>
              <h1 className="l-hero__title">
                Cuidado de la piel que se siente <em>como un ritual</em>.
              </h1>
              <p className="l-lead">
                Limpiezas faciales, tratamientos anti-acné y cuidado de manchas, con un plan
                personalizado para tu piel. Reserva en línea y déjanos el resto a nosotros.
              </p>
              <div className="l-hero__actions">
                <Link to="/reservar" className="l-btn l-btn--primary">
                  Reservar cita
                </Link>
                <a href="#servicios" className="l-btn l-btn--ghost">
                  Ver servicios
                </a>
              </div>
            </div>

            <div className="l-hero__media">
              <div className="l-hero__ring" aria-hidden="true" />
              <div className="l-hero__arch-wrap">
                <div className="l-arch l-hero__arch">
                  <img src="/photo-1.jpg" alt="Esteticista de La Cosmiatra" />
                </div>
                <div className="l-hero__badge">
                  <span className="l-hero__badge-dot" />
                  Atención personalizada
                </div>
              </div>
            </div>
          </div>

          <div className="l-trust">
            {trust.map((item) => (
              <div className="l-trust__item" key={item}>
                <CheckIcon />
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* Sobre mí */}
        <section className="l-section" id="sobre-mi">
          <div className="l-section__inner l-about__grid">
            <div className="l-about__media">
              <div className="l-arch l-about__arch">
                <img src="/photo-2.jpg" alt="La Cosmiatra en su cabina estética" />
              </div>
            </div>

            <div className="l-about__body">
              <span className="l-eyebrow">Sobre mí</span>
              <h2 className="l-heading">Detrás de La Cosmiatra</h2>
              <p className="l-quote">Soy cosmiatra y esteticista certificada.</p>
              <p>
                Me especializo en el manejo del acné de forma integral y en la hiperpigmentación en
                sus diversas presentaciones. Protocolos personalizados con técnicas de microneedling
                para mejorar afecciones.
              </p>
              <div className="l-signature">
                La Cosmiatra
                <small>Belleza y bienestar</small>
              </div>
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section className="l-section l-section--sand" id="servicios">
          <div className="l-section__inner">
            <span className="l-eyebrow">Servicios</span>
            <h2 className="l-heading">Tratamientos pensados para tu piel</h2>
            <p className="l-section__intro">
              Cada servicio se adapta a las necesidades de tu piel.
            </p>

            {loading && services.length === 0 && (
              <p className="l-section__intro" style={{ marginTop: 24 }}>Cargando servicios…</p>
            )}

            {!loading && services.length === 0 && (
              <p className="l-section__intro" style={{ marginTop: 24 }}>
                Pronto publicaremos los servicios disponibles.
              </p>
            )}

            {services.length > 0 && (
              <div className="l-services__grid">
                {services.map((s, i) => (
                  <Link to="/reservar" className="l-service" key={s.id}>
                    <div className="l-service__media">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name} loading="lazy" />
                      ) : (
                        <div className="l-service__ph" aria-hidden="true">
                          {s.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="l-service__body">
                      <span className="l-service__num">{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="l-service__name">{s.name}</h3>
                      {s.description && <p className="l-service__desc">{s.description}</p>}
                      <div className="l-service__foot">
                        <span className="l-service__duration">{s.duration_minutes} min</span>
                        <span className="l-service__link">
                          Reservar
                          <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="l-section" id="como-funciona">
          <div className="l-section__inner">
            <span className="l-eyebrow">Cómo funciona</span>
            <h2 className="l-heading">Reservar es muy sencillo</h2>

            <div className="l-steps">
              {steps.map((step) => (
                <div className="l-step" key={step.num}>
                  <div className="l-step__num">{step.num}</div>
                  <h3 className="l-step__title">{step.title}</h3>
                  <p className="l-step__text">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="l-cta" id="contacto">
          <div className="l-cta__inner">
            <span className="l-eyebrow">Reserva hoy</span>
            <h2>¿Lista para consentir tu piel?</h2>
            <p>
              Reserva tu cita y empieza tu camino hacia una piel más sana y luminosa.
            </p>
            <Link to="/reservar" className="l-btn l-btn--light">
              Reservar cita
            </Link>
          </div>
        </section>
      </main>

      <footer className="l-footer">
        <div className="l-footer__grid">
          <div>
            <div className="l-footer__brand-name">La Cosmiatra</div>
            <div className="l-footer__tagline">Belleza y bienestar</div>
            <p className="l-footer__desc">
              Cuidado facial personalizado en un espacio pensado para ti.
            </p>
          </div>

          <div>
            <h3 className="l-footer__title">Navegación</h3>
            <ul className="l-footer__list">
              <li><a href="#inicio">Inicio</a></li>
              <li><a href="#servicios">Servicios</a></li>
              <li><a href="#sobre-mi">Sobre mí</a></li>
              <li><a href="#contacto">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h3 className="l-footer__title">Contacto</h3>
            <ul className="l-footer__list">
              <li>Santiago de los Caballeros, República Dominicana</li>
              <li><a href="tel:+18493844095">849-384-4095</a></li>
              <li>Lun–Sáb · 9:00–18:00</li>
              <li><a href="mailto:leonelanunez@lacosmiatra.com">leonelanunez@lacosmiatra.com</a></li>
              <li><a href="/reservar">Reservar cita</a></li>
            </ul>
          </div>
        </div>

        <div className="l-footer__bottom">
          <span>© {new Date().getFullYear()} La Cosmiatra</span>
          {!session && (
            <Link to="/login" className="l-footer__admin">
              Acceso esteticista
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}
