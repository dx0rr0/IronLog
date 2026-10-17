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

La meta semanal y los mensajes se calculan en `domain/training/motivation.js`. `domain/training/records.js` compara cada serie completada con el historial del mismo ejercicio; la interfaz muestra el aviso y guarda la marca junto a la serie. Ninguna de estas reglas depende de React.

## Desarrollo y despliegue

`npm ci`, `npm run build` y `npm test` son las comprobaciones de referencia. Las pruebas de interfaz usan el bundle de `dist/`, por lo que el build debe ejecutarse antes de `npm test`. La rama `main` debe pasar estas comprobaciones antes de publicarse.

El aviso de descanso utiliza `showNotification` del service worker. El permiso y el resultado de envío se muestran por separado; la espera de activación tiene un límite y las operaciones se serializan para evitar que una petición de cierre antigua borre un descanso nuevo. `public/rest-notification-worker.js` se carga con `workbox.importScripts` y atiende el toque en la notificación. El aviso contiene la hora de fin, no una cuenta atrás nativa: la PWA no puede mantener un temporizador de sistema ni garantizar una alarma al vencer mientras Android suspende su ejecución.

Las claves de IndexedDB y el formato de exportación JSON son compatibilidad de datos. Si se modifica su esquema, añade una migración y una prueba que cubra datos de versiones anteriores.

## Superseries y compatibilidad

`domain/training/supersets.js` gestiona bloques contiguos de dos o más ejercicios, su orden y la finalización de cada ronda. Una ronda usa el mismo índice de serie de cada miembro; los miembros sin esa serie se omiten. La interfaz mantiene las tarjetas y los resultados individuales: el volumen y los récords siguen contando cada serie una sola vez.

Los ejercicios de rutinas y sesiones pueden incluir el campo opcional `supersetId`. La ausencia del campo conserva el comportamiento anterior, por lo que las copias v1–v4 existentes no necesitan cambios ni nuevas claves de almacenamiento. El formato de copia sigue siendo v4 y serializa el campo cuando existe. La normalización elimina grupos con menos de dos miembros o separados por otros ejercicios al filtrar o eliminar entradas. El primer miembro define `restSeconds`, compartido por todos; al agrupar se elige el mayor descanso previo y al editarlo se actualiza el bloque completo. `test-supersets.mjs` verifica compatibilidad, rondas, reordenación y persistencia; `test-supersets-runtime.mjs` verifica el flujo de la interfaz, la recarga y el historial.

## Historial y conservación de ejercicios

La búsqueda incluye la clave y etiqueta del grupo muscular. exerciseHistory recoge todas las entradas completadas del ejercicio y ordena por fecha; la interfaz conserva el índice original de cada serie y su RIR. matchingSet compara exclusivamente el mismo índice completado: no sustituye una serie ausente por otra. setProgress calcula la mejora de esa referencia; detectSetRecords mantiene el récord de todo el historial. Se muestra la fecha real de referencia, priorizando la misma rutina, sin asumir que fue la semana pasada. DEFAULT_REST_SECONDS (120) se aplica a entradas nuevas o valores ausentes, sin reemplazar un 0 explícito.

storage migra claves de localStorage cuando falta su valor en IndexedDB. custom-exercises usa mergeCustomExercises por ID estable y updatedAt; los archivados sin versión ganan los empates antiguos para evitar resurrecciones. Las altas y los cambios de archivo/restauración llevan versión. La lectura y escritura del catálogo se hacen en una transacción readwrite, se fusionan con la copia local y solo se escribe tras leer correctamente. Una lista vacía no borra el catálogo. storage.del es la vía explícita para resetearlo y elimina la copia local. Esta protección no es sincronización en servidor: los almacenes siguen aislados por origen y navegador.

## Navegación y gesto Atrás

infrastructure/navigation/navigation-history.js mantiene una pila de pantallas y paneles en memoria, coordinada con pushState, replaceState y popstate. history.state solo contiene identificadores de navegación; las series y los datos de usuario siguen en el almacenamiento existente. BrowserNavigation.jsx expone el estado de pestaña/pantalla y los hooks useBackLayer y useBackGuard mediante un contexto.

Las pantallas añaden una entrada al navegar. Los botones de retorno consumen una entrada previa cuando existe. Los paneles consumen su propia entrada tanto al cerrarse por interfaz como por el sistema; los pasos inactivos se omiten. Las operaciones durante una transición asíncrona se encolan. Un guard restaura el editor antes de mostrar la confirmación, ya que popstate no puede cancelarse; la salida confirmada por la interfaz omite el guard. Atrás desde una sesión activa no llama a descartar ni elimina current-session/restTimer. Terminar sustituye la pantalla activa por el resumen. No se añade una barrera al inicio: el sistema puede salir desde la raíz. La inicialización soporta el montaje doble de StrictMode y vuelve al inicio si después de recargar encuentra entradas antiguas sin rutas en memoria.

Las pruebas test-navigation-history.mjs y test-navigation-runtime.mjs cubren historial real, botones y gestos, paneles anidados, confirmaciones, navegación rápida, resumen, StrictMode y conservación del entrenamiento y descanso activos.
