# Reportes de delivery · CD Callao

Tablero público (Ventas, Almacén y EDT) que se actualiza leyendo la bitácora compartida en Google Drive.

- `public/` — la página.
- `netlify/functions/data.mjs` — `/api/data`: lee el Excel de Drive (cada 15 min como máximo) y entrega los registros.
- `netlify/functions/refresh.mjs` — lectura programada cada hora.
- `netlify/functions/incumplimientos.mjs` — `/api/incumplimientos`: ver es público; registrar y eliminar solo con sesión de administrador.
- `netlify/functions/confirmaciones.mjs` — `/api/confirmaciones`: confirmación de reprogramaciones (ver público; registrar DEC o administrador).
- `netlify/functions/login.mjs` — `/api/login`.

Variables de entorno en Netlify (no en este repositorio): `ADMIN_USER`, `ADMIN_KEY`, `DEC_USER` (por defecto DEC), `DEC_KEY` y, opcional, `DRIVE_FILE_ID`.
