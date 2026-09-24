# Arquitectura de IronLog

IronLog es una PWA local. El navegador guarda sesiones, rutinas, ejercicios personalizados y ajustes en IndexedDB. El código desplegado no incluye datos personales del usuario.

## Capas

```text
src/
  app/                     Composición, estado y navegación
  domain/
    exercises/             Catálogo, búsqueda y utilidades de ejercicios
    training/              Series, volumen y propuestas Ghost
  infrastructure/
    storage/               IndexedDB, persistencia y avisos de copia
  presentation/
    features/              Pantallas por función de producto
    shared/                Controles y formatos reutilizables
    shell/                 Navegación y diálogos globales
    components/            Visualizaciones compartidas
  main.jsx                 Entrada de React
```

La dependencia apunta hacia el dominio: `app` coordina la infraestructura y la presentación; `presentation` puede usar funciones puras de `domain`; `infrastructure` se ocupa del almacenamiento. `domain` no importa React ni IndexedDB. Los componentes reutilizados por varias pantallas viven en `presentation/shared`, para evitar dependencias entre funciones de producto.

## Flujo de un entrenamiento

1. `app/App.jsx` carga los datos y mantiene la sesión activa.
2. `presentation/features/workout/WorkoutViews.jsx` muestra la serie y recoge el resultado real.
3. `domain/training/workout-intelligence.js` calcula una propuesta Ghost con series completadas anteriores. Da prioridad a la misma rutina y adapta el siguiente paso según RIR y errores anteriores.
4. La propuesta se guarda junto a la serie completada para conservar lo que se mostró; el resultado real se guarda por separado.
5. `infrastructure/storage/storage.js` persiste el cambio. Al finalizar, el resumen utiliza únicamente series completadas.

## Desarrollo y despliegue

`npm ci`, `npm run build` y `npm test` son las comprobaciones de referencia. Las pruebas de interfaz usan el bundle de `dist/`, por lo que el build debe ejecutarse antes de `npm test`. La rama `main` debe pasar estas comprobaciones antes de publicarse.

Las claves de IndexedDB y el formato de exportación JSON son compatibilidad de datos. Si se modifica su esquema, añade una migración y una prueba que cubra datos de versiones anteriores.
