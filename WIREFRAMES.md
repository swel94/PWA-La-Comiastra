# Wireframes — La Cosmiatra (UI en español)

> **Status:** Draft v0.1 — Step 3 of the roadmap. Companion to `PROJECT_ROADMAP.md` and `SCHEMA_SPEC.md`.
> **Idioma:** Todo el contenido visible está en **español** por defecto (`es`). This document uses Spanish for all UI copy; structural notes are in English for clarity.
> **Marca:** "La Cosmiatra" — paleta: Camel `#bb9457`, Light Apricot `#ffe6a7`, Chocolate Brown `#99582a`, Dark Coffee `#432818`.

These are low-fidelity wireframes: layout + every element + its Spanish label. They define *what* appears on each screen, not final visual design.

**Leyenda (notation):**
- `[Botón]` = primary button · `[Enlace]` = secondary/text action · `▢` = checkbox · `○` = radio · `‹`/`›` = navigation.
- Screens are mobile-first; desktop expands the same layouts.

---

## 1. Landing — "Inicio"

```
┌────────────────────────────────────────────┐
│ 🌸 La Cosmiatra   Inicio  Servicios  [Reservar cita] │  ← barra superior (sticky)
├────────────────────────────────────────────┤
│  (imagen hero)                              │
│  Cuidá tu piel con un tratamiento           │
│  personalizado y profesional                │
│  [ Reservar cita ]                          │
│                                             │
│  ── Sobre mí ──                             │
│  [foto]  Hola, soy [nombre].                │
│          Esteticista especializada en …     │
│                                             │
│  ── Servicios ──   (sin precios)            │
│  ┌─────────────┐ ┌─────────────┐            │
│  │ Limpieza    │ │ Facial      │            │
│  │ facial      │ │ anti-acné   │            │
│  │ 60 min      │ │ 45 min      │            │
│  └─────────────┘ └─────────────┘            │
│  [ Ver todos los servicios ]                │
│                                             │
│  ── Contacto / Ubicación / Horario ──       │
│  📍 Dirección   🕒 Lun–Sáb 9:00–18:00      │
│  📞 Teléfono    ✉ correo                    │
│                                             │
│  © La Cosmiatra · Instagram · WhatsApp      │
└────────────────────────────────────────────┘
```

**Elementos y copy (es):**
- Barra: `Inicio`, `Servicios`, botón `Reservar cita`, `Iniciar sesión` (opcional).
- Hero: título + subtítulo + `Reservar cita`.
- `Sobre mí` (bio). `Servicios` (nombre + descripción + duración; **nunca precio**). `Contacto`, `Ubicación`, `Horario`.
- Footer: `© La Cosmiatra` + redes.

**Notas:** Los precios no se muestran. El CTA lleva al flujo de reserva (§2).

---

## 2. Flujo de reserva — "Reservar cita" (multi-paso)

### Paso 1 — Elegir servicio
```
┌────────────────────────────────────────┐
│ ‹ Reservar cita            Paso 1 de 4 │
│  ¿Qué servicio deseas?                │
│  ○ Limpieza facial — 60 min           │
│  ○ Facial anti-acné — 45 min          │
│  ○ Dermaplaning — 30 min              │
│  ○ Tratamiento de manchas — 60 min    │
│                                        │
│  [ Continuar ]                         │
└────────────────────────────────────────┘
```

### Paso 2 — Elegir fecha y hora
```
┌────────────────────────────────────────┐
│ ‹ Reservar cita            Paso 2 de 4 │
│  Elige la fecha y la hora             │
│  ┌ calendario (mes) ┐                  │
│  │  L  M  M  J  V  S │                 │
│  │  1  2  3  4  5  6 │                 │
│  └───────────────────┘                 │
│  Horarios disponibles:                 │
│  [9:00] [10:00] [11:30] [14:00] [16:00]│
│  (los ocupados aparecen deshabilitados)│
│  [ Continuar ]                         │
└────────────────────────────────────────┘
```

### Paso 3 — Identificación
```
┌────────────────────────────────────────┐
│ ‹ Reservar cita            Paso 3 de 4 │
│  ¿Cuál es tu correo electrónico?       │
│  [ ______________________ ]            │
│  Te enviaremos un código de acceso.    │
│  [ Continuar ]                         │
├────────────────────────────────────────┤
│  Verifica tu correo                    │
│  Introduce el código de 6 dígitos      │
│  [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]        │
│  [ Verificar ]   Reenviar código       │
└────────────────────────────────────────┘
```

**Nota (nuevo vs. recurrente):** si el correo ya existe → inicia sesión y salta al Paso 5. Si no existe → crea la cuenta y va al Paso 4 (Ficha Clínica).

### Paso 4 — Ficha Clínica (solo clientes nuevos)
```
┌────────────────────────────────────────┐
│ ‹ Reservar cita            Paso 4 de 4 │
│  Cuéntanos de ti                        │
│  Correo electrónico*  [            ]    │
│  Nombre completo      [            ]    │
│  Edad                 [  ]              │
│  Sexo                 ○ Hombre ○ Mujer  │
│  Ocupación            [            ]    │
│  Teléfono celular     [            ]    │
│                                         │
│  Motivo de visita (marca los que apliquen)│
│  ▢ Acné  ▢ Rosácea  ▢ Manchas           │
│  ▢ Arrugas  ▢ Blanqueamiento corporal   │
│  ▢ Mantenimiento  ▢ Otros               │
│                                         │
│  Datos clínicos                         │
│  ¿Ha estado en algún tratamiento        │
│  dermatológico anteriormente?           │
│  ○ No  ○ Otros: [explica…]              │
│  … (resto del cuestionario)             │
│  ▢ Acepto el consentimiento informado   │
│  [ Continuar ]                          │
└────────────────────────────────────────┘
```

### Paso 5 — Confirmación
```
┌────────────────────────────────────────┐
│ ‹ Reservar cita          Confirmación  │
│  Revisa tu cita                        │
│  Servicio:  Limpieza facial            │
│  Fecha:     martes 10 nov 2026          │
│  Hora:      9:00 – 10:00 (60 min)      │
│  Cliente:   [nombre] · [correo]        │
│  [ Confirmar cita ]  [ Cancelar ]       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  ✓ ¡Cita confirmada!                   │
│  Limpieza facial — martes 10 nov, 9:00 │
│  Te enviamos la confirmación a tu correo│
│  [ Volver al inicio ]  [ Ver mis citas ]│
└────────────────────────────────────────┘
```

---

## 3. Cuenta del cliente — "Mis citas"

```
┌────────────────────────────────────────┐
│ ‹ Mis citas             [Mi perfil]    │
│  Próximas                               │
│  ┌─────────────────────────────────┐    │
│  │ Limpieza facial                 │    │
│  │ mar 10 nov · 9:00 (60 min)      │    │
│  │ [Reprogramar] [Cancelar]        │    │
│  └─────────────────────────────────┘    │
│  Pasadas                                │
│  ┌─────────────────────────────────┐    │
│  │ Facial anti-acné · 20 oct       │    │
│  │ [Reservar de nuevo]             │    │
│  └─────────────────────────────────┘    │
└────────────────────────────────────────┘
```

**Mi perfil:** permite editar datos de contacto y la Ficha Clínica.

---

## 4. Panel de administración — "Panel"

```
┌──────────────────────────────────────────────────────────┐
│ 🌸 La Cosmiatra · Panel            [esteticista]  [Salir] │
├────────────┬─────────────────────────────────────────────┤
│ Panel      │  Citas de hoy                               │
│ Citas      │  ┌──────────────────────────────────────┐    │
│ Clientes   │  │ 9:00  María G. — Limpieza facial     │    │
│ Servicios  │  │ 10:30 Ana R. — Facial anti-acné      │    │
│ Inventario │  │ 14:00 — —                            │    │
│ Reportes   │  └──────────────────────────────────────┘    │
│ Ajustes    │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│            │  │ Citas  │ │Clientes│ │Ingresos│ │Stock   │ │
│            │  │  hoy:3 │ │   45   │ │  mes   │ │ bajo:2 │ │
│            │  └────────┘ └────────┘ └────────┘ └────────┘ │
│            │  Próximas citas (lista)                       │
└────────────┴─────────────────────────────────────────────┘
```

**Elementos (es):** menú lateral `Panel`, `Citas`, `Clientes`, `Servicios`, `Inventario`, `Reportes`, `Ajustes`. Tarjetas: `Citas hoy`, `Clientes`, `Ingresos del mes`, `Stock bajo`.

---

## 5. Detalle de cita (admin) — "Detalle de cita"

```
┌──────────────────────────────────────────────────────────┐
│ ‹ Volver a Citas          Detalle de cita    [···]        │
│                                                          │
│ Cliente:  María García · +1 809 … · maria@mail.com        │
│ Servicio: Limpieza facial (60 min)                        │
│ Fecha:    mar 10 nov · 9:00 – 10:00                       │
│ Estado:   ● Confirmada                                    │
│                                                          │
│ Notas de tratamiento                                     │
│ [ Agregar nota ]                                         │
│  ───────────────────────────────────────────              │
│  10:05 · esteticista · Se aplicó limpieza profunda…      │
│  09:55 · esteticista · Piel sensible en mejillas…        │
│                                                          │
│ Productos vendidos                                       │
│ [ Agregar producto ]                                     │
│  ───────────────────────────────────────────              │
│  Sérum hidratante × 1 — RD$ 1,500                        │
│  Protector solar  × 2 — RD$ 1,800                        │
│                                                          │
│ [ Marcar como completada ]  [ Cancelar cita ]  [No se presentó] │
└──────────────────────────────────────────────────────────┘
```

**Modal "Agregar producto vendido":** selector de producto + cantidad + precio; al guardar, descuenta inventario.

---

## 6. Inventario — "Inventario"

```
┌──────────────────────────────────────────────────────────┐
│ Inventario                [Buscar…]  [ Agregar producto ] │
│ ┌──────────────┬────────┬───────┬────────┬────────┬──────┐│
│ │ Producto     │ Catego │ Costo │ Venta  │ Ganan. │ Cant ││
│ ├──────────────┼────────┼───────┼────────┼────────┼──────┤│
│ │ Sérum hidra. │ Cuidado│  800  │ 1,500  │  700   │  12 ││
│ │ Protector SPF│ Solar  │  500  │   900  │  400   │ ⚠ 2 ││
│ │ Crema anti…  │ Facial │  600  │ 1,200  │  600   │  8  ││
│ └──────────────┴────────┴───────┴────────┴────────┴──────┘│
│  ⚠ = stock bajo                                          │
└──────────────────────────────────────────────────────────┘
```

**Ficha del producto (modal):**
```
┌───────────────────────────────┐
│ Editar producto               │
│ Nombre       [            ]   │
│ Categoría    [            ]   │
│ Costo        [ 800 ]          │
│ Precio venta [ 1,500 ]        │
│ Ganancia     RD$ 700 (auto)   │
│ Cantidad     [ 12 ]           │
│ ── Movimientos ──             │
│ +10  entrada  · 05 nov        │
│ −2   venta    · 09 nov        │
│ −1   ajuste   · 10 nov        │
│ [ Guardar ]                   │
└───────────────────────────────┘
```

**Acciones:** `Agregar producto`, `Agregar/Quitar stock` (con motivo), `Editar`, `Desactivar`. Movimientos de stock siempre trazables.

---

## 7. Servicios — "Servicios"

```
┌──────────────────────────────────────────────────────────┐
│ Servicios                [ Agregar servicio ]             │
│ ┌───────────────┬────────┬───────────┬───────────────────┐│
│ │ Servicio      │ Duración│ Precio    │ Estado            ││
│ ├───────────────┼────────┼───────────┼───────────────────┤│
│ │ Limpieza fac. │ 60 min │ RD$ 2,000 │ ● Activo          ││
│ │ Facial anti…  │ 45 min │ RD$ 2,500 │ ● Activo          ││
│ │ Dermaplaning  │ 30 min │ RD$ 1,800 │ ○ Inactivo        ││
│ └───────────────┴────────┴───────────┴───────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**Formulario (modal):** `Nombre`, `Descripción`, `Duración (min)`, `Precio interno (RD$)`, `Categoría`, `Activo`.

> Recordatorio: este precio es **interno**; no aparece en la landing.

---

## 8. Clientes — "Clientes"

```
┌──────────────────────────────────────────────────────────┐
│ Clientes                 [Buscar…]                        │
│ ┌───────────────┬──────────────┬─────────────┐            │
│ │ Nombre        │ Teléfono     │ Última cita │            │
│ ├───────────────┼──────────────┼─────────────┤            │
│ │ María García  │ +1 809 …     │ 10 nov      │            │
│ │ Ana Rodríguez │ +1 809 …     │ 20 oct      │            │
│ └───────────────┴──────────────┴─────────────┘            │
└──────────────────────────────────────────────────────────┘
```

**Detalle del cliente:** datos de contacto + Ficha Clínica completa (editable) + historial de citas y notas.

---

## 9. Reportes — "Ingresos"

```
┌──────────────────────────────────────────────────────────┐
│ Reportes                Del: [01 nov]  Al: [30 nov]       │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│ │ Ingresos por  │ │ Ganancia por  │ │ Total         │     │
│ │ servicios     │ │ productos     │ │               │     │
│ │ RD$ 12,500    │ │ RD$ 4,800     │ │ RD$ 17,300    │     │
│ └───────────────┘ └───────────────┘ └───────────────┘     │
│  (gráfico simple de ingresos por mes/semana)              │
│  ────────────────────────────────────────                 │
│  Ventas por cita (tabla detallada)                        │
└──────────────────────────────────────────────────────────┘
```

**Definiciones:** `Ingresos por servicios` = suma de servicios de citas `completadas`; `Ganancia por productos` = (precio venta − costo) de productos vendidos.

---

## 10. Ajustes — "Ajustes"

```
┌──────────────────────────────────────────────────────────┐
│ Ajustes                                                   │
│  ── Horario ──                                            │
│  Lun ▢ 9:00–18:00   Mar ▢ 9:00–18:00   Mie ▢ 9:00–18:00  │
│  Jue ▢ 9:00–18:00   Vie ▢ 9:00–18:00   Sab ▢ 9:00–14:00  │
│  Dom ▢ Cerrado        Búfer entre citas: [10] min         │
│  [ Guardar horario ]                                      │
│                                                           │
│  ── Google Calendar ──                                    │
│  ● Conectado: esteticista@gmail.com   [ Reconectar ]      │
│                                                           │
│  ── Negocio ──                                            │
│  Nombre: [La Cosmiatra]    Moneda: DOP                    │
│  Ventana de cancelación: [24] horas                       │
│  ── Notificaciones ──                                     │
│  ▢ Confirmación por correo  ▢ Recordatorio 24h            │
└──────────────────────────────────────────────────────────┘
```

---

## Resumen de pantallas

| # | Pantalla | Audiencia | Idioma de copy |
|---|----------|-----------|----------------|
| 1 | Inicio (landing) | Público | ES |
| 2 | Reservar cita (5 pasos) | Público/Cliente | ES |
| 3 | Mis citas / Mi perfil | Cliente | ES |
| 4 | Panel | Admin | ES |
| 5 | Detalle de cita | Admin | ES |
| 6 | Inventario | Admin | ES |
| 7 | Servicios | Admin | ES |
| 8 | Clientes | Admin | ES |
| 9 | Ingresos (reportes) | Admin | ES |
| 10 | Ajustes | Admin | ES |

---

*Wireframes de baja fidelidad. Próximo paso: especificación de API/Edge Functions (§15 del roadmap).*
