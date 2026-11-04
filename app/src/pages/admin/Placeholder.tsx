export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">{title}</h1>
          <p className="admin__subtitle">Esta sección estará disponible próximamente.</p>
        </div>
      </div>
    </div>
  )
}
