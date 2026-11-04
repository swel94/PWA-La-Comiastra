export default function Dashboard() {
  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Panel</h1>
          <p className="admin__subtitle">Resumen del día</p>
        </div>
      </div>

      <div className="admin__cards">
        <div className="admin__stat">
          <b>3</b>
          <span>Citas hoy</span>
        </div>
        <div className="admin__stat">
          <b>45</b>
          <span>Clientes</span>
        </div>
        <div className="admin__stat">
          <b>RD$</b>
          <span>Ingresos mes</span>
        </div>
        <div className="admin__stat">
          <b>2</b>
          <span>Stock bajo</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Citas de hoy</h3>
        <div className="row">
          <strong>9:00</strong>
          <span>María G. — Limpieza facial</span>
        </div>
        <div className="row">
          <strong>10:30</strong>
          <span>Ana R. — Facial anti-acné</span>
        </div>
        <div className="row">
          <strong>14:00</strong>
          <span>—</span>
        </div>
      </div>
    </div>
  )
}
