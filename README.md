# workoutracker — registro de gimnasio

App personal para llevar el registro de tus entrenamientos. Funciona en el navegador del celular, se instala como una app y trabaja **sin internet**. Tus datos se guardan solo en tu teléfono.

## Qué hace

- **Entrenar**: empieza un entrenamiento vacío o desde una rutina. Anota kg y repeticiones y marca cada serie con ✓.
- **Valores anteriores**: cada serie muestra lo que hiciste la última vez. Si marcas ✓ con la serie vacía, se llena con esos valores.
- **Temporizador de descanso**: arranca solo al completar una serie (−15 / +15 / Saltar) y avisa con sonido y vibración.
- **Tipos de serie**: normal, calentamiento (C) o al fallo (F). Para cambiarlo, toca el número de la serie.
- **Rutinas**: puedes crearlas, editarlas, duplicarlas o guardar un entrenamiento terminado como rutina.
- **Historial**: duración, volumen, series y 🏆 récords nuevos (1RM estimado y peso máximo).
- **Progreso por ejercicio**: gráficas de 1RM estimado, peso máximo, volumen y repeticiones, además de tus mejores marcas.
- **Ejercicios**: más de 60 ejercicios en español, con búsqueda y filtro por músculo. También puedes crear los tuyos (peso y reps, o tiempo y distancia).
- **Perfil**: entrenamientos por semana, racha de semanas seguidas, series por músculo y volumen total.
- **Copia de seguridad**: exporta o importa tus datos en un archivo `.json`.

## Cómo ponerla en tu celular

1. Publícala con GitHub Pages (es gratis):
   - Fusiona este código en la rama `main`.
   - En GitHub, entra a **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**.
   - El flujo `.github/workflows/pages.yml` la publica en `https://<tu-usuario>.github.io/Hevy2/`.
2. Abre esa dirección en el celular:
   - **iPhone (Safari)**: toca Compartir → **Agregar a inicio**.
   - **Android (Chrome)**: toca el menú ⋮ → **Instalar app** o **Agregar a pantalla de inicio**.

> Haz una copia desde **Perfil → Exportar copia** de vez en cuando. Si borras los datos del navegador o cambias de teléfono, la necesitarás para recuperar tu historial.

## Probarla en la computadora

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

## Archivos

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Estructura de la página |
| `styles.css` | Diseño, con tema oscuro y claro automático |
| `app.js` | Toda la lógica de la app |
| `sw.js` | Guarda la app en caché para que funcione sin internet (sube `CACHE` al cambiar archivos) |
| `manifest.webmanifest`, `icons/` | Permiten instalarla como app |
