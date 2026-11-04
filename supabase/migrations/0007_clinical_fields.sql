-- 0007_clinical_fields.sql
-- Ficha Clínica configurable por la esteticista (agregar/editar/quitar preguntas).

create table if not exists public.clinical_fields (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  type        text not null check (type in ('select', 'select_text', 'multi')),
  options     jsonb not null default '[]'::jsonb,
  detail_when text[] not null default '{}',
  placeholder text,
  required    boolean not null default false,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.clinical_fields enable row level security;

drop policy if exists clinical_fields_public_select on public.clinical_fields;
create policy clinical_fields_public_select on public.clinical_fields
  for select using (is_active = true);

drop policy if exists clinical_fields_admin_all on public.clinical_fields;
create policy clinical_fields_admin_all on public.clinical_fields
  for all using (public.is_admin()) with check (public.is_admin());

-- Semilla: las 16 preguntas actuales
insert into public.clinical_fields
  (key, label, type, options, detail_when, placeholder, required, sort_order)
values
  (
    'tratamiento_dermatologico_previo',
    '¿Ha estado en algún tratamiento dermatológico anteriormente?',
    'select_text',
    '[{"value":"no","label":"No"},{"value":"otro","label":"Otros"}]',
    array['otro'],
    'Explique brevemente',
    true,
    1
  ),
  (
    'tratamiento_dermatologico_curso',
    '¿Tienes algún tratamiento dermatológico en curso?',
    'select_text',
    '[{"value":"no","label":"No"},{"value":"otro","label":"Otros"}]',
    array['otro'],
    'Explique brevemente',
    true,
    2
  ),
  (
    'condiciones',
    '¿Padece de alguna de las siguientes condiciones?',
    'multi',
    '[{"value":"tiroides","label":"Tiroides"},{"value":"ovarios_poliquisticos","label":"Ovarios poliquísticos"},{"value":"diabetes","label":"Diabetes"},{"value":"presion_arterial","label":"Presión arterial"},{"value":"dermatitis_atopica","label":"Dermatitis atópica"},{"value":"asma","label":"Asma"},{"value":"cancer","label":"Cáncer"},{"value":"rinitis_alergica","label":"Rinitis alérgica"},{"value":"otros","label":"Otros"}]',
    array[]::text[],
    null,
    false,
    3
  ),
  (
    'cirugia_estetica_reciente',
    '¿Se ha sometido a cirugía o procedimiento estético recientemente?',
    'select_text',
    '[{"value":"no","label":"No"},{"value":"otro","label":"Otros"}]',
    array['otro'],
    'Explique brevemente',
    true,
    4
  ),
  (
    'niveles_tiroideos',
    '¿Conoce sus niveles tiroideos?',
    'select',
    '[{"value":"menor_20","label":"Menor a 20 ng/ml"},{"value":"20_50","label":"Entre 20 y 50 ng/ml"},{"value":"50_100","label":"De 50 a 100 ng/ml"},{"value":"mayor_100","label":"Mayor a 100 ng/ml"},{"value":"desconozco","label":"Desconozco mis niveles"}]',
    array[]::text[],
    null,
    true,
    5
  ),
  (
    'niveles_vitamina_d',
    '¿Conoce sus niveles de vitamina D?',
    'select',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"},{"value":"na","label":"N/A"}]',
    array[]::text[],
    null,
    true,
    6
  ),
  (
    'medicamento_actual',
    '¿Está tomando algún medicamento actualmente?',
    'select_text',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"},{"value":"na","label":"N/A"}]',
    array['si'],
    '¿Cuál?',
    true,
    7
  ),
  (
    'lactando',
    '¿Está actualmente lactando?',
    'select',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"}]',
    array[]::text[],
    null,
    true,
    8
  ),
  (
    'embarazada',
    '¿Está embarazada?',
    'select',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"},{"value":"na","label":"N/A"}]',
    array[]::text[],
    null,
    true,
    9
  ),
  (
    'protesis_dental',
    '¿Tiene alguna prótesis dental?',
    'select',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"}]',
    array[]::text[],
    null,
    true,
    10
  ),
  (
    'periodo_regular',
    '¿Es su periodo regular?',
    'select',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"},{"value":"na","label":"N/A"}]',
    array[]::text[],
    null,
    true,
    11
  ),
  (
    'alcohol',
    '¿Consume alcohol regularmente?',
    'select',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"}]',
    array[]::text[],
    null,
    true,
    12
  ),
  (
    'alergias',
    '¿Presenta algún tipo de alergia?',
    'select_text',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"}]',
    array['si'],
    '¿Cuál?',
    true,
    13
  ),
  (
    'puede_tomar_ainees',
    '¿Puede tomar Aspirina, diclofenac o Ibuprofeno?',
    'select',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"}]',
    array[]::text[],
    null,
    true,
    14
  ),
  (
    'rutina_facial',
    '¿Tiene alguna rutina facial?',
    'select_text',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"}]',
    array['si'],
    'Descríbala',
    true,
    15
  ),
  (
    'tratamiento_facial_previo',
    '¿Se ha realizado algún tratamiento facial con un profesional antes?',
    'select',
    '[{"value":"si","label":"Sí"},{"value":"no","label":"No"}]',
    array[]::text[],
    null,
    true,
    16
  )
on conflict (key) do nothing;
