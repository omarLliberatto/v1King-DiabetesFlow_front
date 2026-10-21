# v1King DiabetesFlow

Calculadora de bolo de insulina rápida con conteo de hidratos, instalable como PWA y sin backend: los datos viven en IndexedDB (Dexie) en cada dispositivo.

## Funciones

- Dosis sugerida = hidratos / ICR + corrección desde un umbral hasta el objetivo, descontando la insulina activa (IOB, decaimiento lineal) sólo de la corrección.
- Armador de platos sobre la tabla de hidratos de `src/data/foods.json`, en gramos o por unidad.
- Registro local de glucemias, dosis aplicadas, platos y actividad.
- Respaldo: exportar e importar un JSON desde Ajustes.

## Desarrollo

```bash
npm install
npm run dev
```

## Publicación

`main` se publica en GitHub Pages con `.github/workflows/deploy.yml` (export estático con `basePath` igual al nombre del repo). En el iPad: abrir la URL en Safari → Compartir → «Agregar a pantalla de inicio».
