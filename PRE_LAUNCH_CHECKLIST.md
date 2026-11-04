# Pre-launch checklist — La Cosmiatra

> Recordatorio a revisar **antes de publicar** la app. Varias cosas del landing/footer son placeholders por ahora.

## Contenido del sitio (landing / footer)

- [ ] **Nombre y bio reales** de la esteticista (sección "Sobre mí").
- [ ] **Email de contacto real** — hoy: `hola@lacosmiatra.com` (placeholder).
- [ ] **Teléfono / WhatsApp** de contacto.
- [ ] **Dirección exacta** — hoy: "Santo Domingo, República Dominicana" (placeholder).
- [ ] **Horario real** — hoy: "Lun–Sáb · 9:00–18:00" (placeholder).
- [ ] **Redes sociales** (Instagram, TikTok, etc.) con enlaces reales.
- [ ] **Fotos finales** del estudio / logo en alta resolución (si cambian).
- [ ] Revisar los textos legales: aviso de privacidad, consentimiento informado, política de cancelación.

## Servicios (Admin → Servicios)

- [ ] Servicios reales del negocio (hoy hay 4 de ejemplo: Limpieza facial, Facial anti-acné, Dermaplaning, Tratamiento de manchas).
- [ ] Descripciones finales.
- [ ] **Precios internos reales** (hoy todos en RD$ 0).
- [ ] **Imagen de cada servicio** (subir desde Admin → Servicios).
- [ ] Activar/desactivar según corresponda.

## Configuración técnica

- [ ] Revisar usuarios y roles (admin real).
- [ ] Verificar RLS y permisos de Storage.
- [ ] **Autenticación:** hoy `mailer_autoconfirm = true` (registro sin confirmar email) para pruebas. Antes de lanzar: reactivar la confirmación de email o cambiar a enlaces mágicos/OTP.
- [ ] **Site URL de Auth:** hoy `http://localhost:3000`; cambiarlo al dominio real y configurar Redirect URLs.
- [ ] **Google Calendar (opcional/diferido):** la agenda vive en la app (Admin → Citas). Si se desea, agregar feed ICS o sincronización OAuth.
- [ ] Configurar correos (Resend) para confirmaciones (P8).
- [ ] Dominio, despliegue y backups.
- [ ] Configurar `smtp_*` propio para que los correos de Auth salgan del dominio.

## Notas

- El precio de los servicios es **interno**: nunca se muestra en la página pública.
- Al lanzar, se debe vaciar/ajustar la semilla de servicios de ejemplo si no coinciden con los reales.
