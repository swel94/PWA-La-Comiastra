import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import '../../lib/admin.css'

const menu = [
  { to: '/panel', label: 'Panel', end: true },
  { to: '/panel/citas', label: 'Citas' },
  { to: '/panel/clientes', label: 'Clientes' },
  { to: '/panel/ficha-clinica', label: 'Ficha clínica' },
  { to: '/panel/servicios', label: 'Servicios' },
  { to: '/panel/inventario', label: 'Inventario' },
  { to: '/panel/reportes', label: 'Reportes' },
  { to: '/panel/ajustes', label: 'Ajustes' }
]

export default function AdminLayout() {
  const { signOut } = useAuth()

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <Link to="/" className="admin__brand">
          <img src="/logo-mark.jpg" alt="La Cosmiatra" />
        </Link>

        <nav className="admin__nav">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              className={({ isActive }) => 'admin__link' + (isActive ? ' is-active' : '')}
            >
              {m.label}
            </NavLink>
          ))}
        </nav>

        <button className="admin__logout" onClick={() => signOut()}>
          Cerrar sesión
        </button>
      </aside>

      <main className="admin__main">
        <Outlet />
      </main>
    </div>
  )
}
