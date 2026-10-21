# v1King DiabetesFlow

Calculadora de bolo de insulina rápida con conteo de hidratos, instalable como PWA y sin backend: los datos viven en IndexedDB (Dexie) en cada dispositivo.

## Funciones

- Dosis sugerida = hidratos / ICR + corrección desde un umbral hasta el objetivo, descontando la insulina activa (IOB, decaimiento lineal) sólo de la corrección.
- Armador de platos sobre la tabla de hidratos de `src/data/foods.json`, en gramos o por unidad.
- Registro local de glucemias, dosis aplicadas, platos y actividad.
- Respaldo: exportar e importar un JSON desde Ajustes.
- Sincronización opcional entre dispositivos con Supabase: los cambios se guardan primero en local y se suben y bajan al abrir la app, al volver la conexión y después de cada registro.

## Desarrollo

```bash
npm install
npm run dev
```

## Sincronización

La tabla `public.records` (migración en `supabase/migrations/`) guarda cada registro como JSON por usuario, con seguridad por fila. Para desarrollo local:

```bash
npx supabase start
npx supabase status -o env
```

y copiar `API_URL` y `PUBLISHABLE_KEY` a `.env.local` como `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. En GitHub van como variables del repo `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`.

## Publicación

`main` se publica en GitHub Pages con `.github/workflows/deploy.yml` (export estático con `basePath` igual al nombre del repo). En el iPad: abrir la URL en Safari → Compartir → «Agregar a pantalla de inicio».
