import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import Landing from './pages/Landing'
import Booking from './pages/Booking'
import MyAppointments from './pages/MyAppointments'
import Login from './pages/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import CitasAdmin from './pages/admin/CitasAdmin'
import AppointmentDetail from './pages/admin/AppointmentDetail'
import InventoryAdmin from './pages/admin/InventoryAdmin'
import ServicesAdmin from './pages/admin/ServicesAdmin'
import SettingsAdmin from './pages/admin/SettingsAdmin'
import ClientsAdmin from './pages/admin/ClientsAdmin'
import ClientDetail from './pages/admin/ClientDetail'
import ClinicalFieldsAdmin from './pages/admin/ClinicalFieldsAdmin'
import ReportesAdmin from './pages/admin/ReportesAdmin'

function Loading() {
  return (
    <div className="app">
      <p className="muted">Cargando…</p>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading, role } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  if (role !== 'admin') {
    return (
      <div className="app">
        <h2>No autorizado</h2>
        <p className="muted">Solo el administrador puede ver esta página.</p>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reservar" element={<Booking />} />
        <Route
          path="/mis-citas"
          element={
            <RequireAuth>
              <MyAppointments />
            </RequireAuth>
          }
        />

        <Route
          path="/panel"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="citas" element={<CitasAdmin />} />
          <Route path="citas/:id" element={<AppointmentDetail />} />
          <Route path="clientes" element={<ClientsAdmin />} />
          <Route path="clientes/:id" element={<ClientDetail />} />
          <Route path="ficha-clinica" element={<ClinicalFieldsAdmin />} />
          <Route path="servicios" element={<ServicesAdmin />} />
          <Route path="inventario" element={<InventoryAdmin />} />
          <Route path="reportes" element={<ReportesAdmin />} />
          <Route path="ajustes" element={<SettingsAdmin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
