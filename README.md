# IronLog

App personal para registrar entrenamientos: rutinas, series con RIR, autorrelleno desde la última sesión, calculadora de discos, 1RM estimado, peso corporal, descansos, progreso y calendario. Funciona offline en el móvil como PWA, los datos se guardan en tu propio dispositivo.

## Estructura del proyecto

- `src/app/`: arranque y coordinación del estado de la aplicación.
- `src/domain/`: catálogo, cálculos y reglas de entrenamiento, sin interfaz ni acceso al almacenamiento.
- `src/infrastructure/`: almacenamiento local y persistencia.
- `src/presentation/features/`: pantallas organizadas por función; `src/presentation/shared/` contiene componentes reutilizables.
- `public/`: iconos y archivos estáticos; `scripts/`: pruebas y utilidades de desarrollo.

Consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para las dependencias entre capas y el flujo de datos. `dist/` y `node_modules/` son archivos generados y no se versionan.

## Cambios de la versión 1.9.0

- Los ejercicios se reordenan manteniendo pulsada su cabecera y arrastrando. Las superseries se mueven como un bloque.
- Nuevo botón para cambiar un ejercicio por otro sin perder su posición, descanso ni número de series.
- Las notas de cada ejercicio empiezan vacías en cada sesión. Las notas de días anteriores aparecen en el historial de series; la nota de la rutina se muestra como referencia.
- Al terminar el descanso suena un aviso de tres notas, también con la app en segundo plano mientras el navegador mantenga el audio activo.
- Si una serie mejora la misma serie de la sesión anterior, el temporizador de descanso lo indica en una franja encima del contador.

## Cambios de la versión 1.8.1 (publicada el 4 de octubre de 2026)

- El gesto o botón Atrás de Android recorre las pantallas visitadas dentro de IronLog. Las flechas de la app consumen el mismo historial; no añaden pasos vacíos.
- Atrás cierra primero el buscador, la creación de ejercicios dentro del entrenamiento, el historial de series y los diálogos. También cierra los editores de discos y peso corporal y los avisos de récord.
- Volver desde un entrenamiento activo conserva la sesión, las series y la fecha de fin del descanso; se puede continuar desde el menú.
- Los editores de rutinas con cambios y de entrenamientos terminados piden confirmación antes de descartarse. Guardar o descartar una edición de entrenamiento regresa a su detalle.
- El resumen sustituye al entrenamiento terminado en el historial. En el inicio, Atrás conserva el comportamiento normal del sistema para salir.

## Cambios de la versión 1.8.0 (publicada el 4 de octubre de 2026)

- Buscar por nombre, material, alias o grupo muscular; cada resultado muestra su grupo.
- Historial de series desde la tarjeta del entrenamiento, con fecha, número original de serie, peso/reps y RIR. Solo incluye series completadas y no interrumpe el entrenamiento.
- Descanso inicial de 2 minutos en nuevos ejercicios y plantillas sin tiempo guardado. Un descanso configurado, incluido 0, se conserva.
- Comparación estricta por posición (serie 2 con serie 2), con resultado real y fecha de referencia. Ghost sigue siendo una propuesta separada y no usa otra posición cuando falta esa serie.
- Se distingue superar la serie anterior de un récord del historial: mayor peso, repeticiones con el mismo peso o mejor 1RM estimado. La primera marca se identifica por separado.
- Migración de datos del antiguo localStorage a IndexedDB cuando falta la clave. Los ejercicios personalizados se fusionan por ID al leer y guardar, conservando altas y archivados; los cambios nuevos llevan updatedAt. Una transacción evita sobrescrituras entre pestañas y se mantiene una segunda copia local de ejercicios. Importar JSON también fusiona por ID y versión. El borrado explícito elimina ambos almacenes.
- La conservación es local y requiere usar el mismo dominio y navegador. No recupera datos eliminados ni transfiere automáticamente datos desde una URL de preview: para cambiar de dominio se necesita exportar/importar una copia.

## Cambios de la versión 1.7.0 (incluidos en 1.8.0)

- Superseries en rutinas y entrenamientos: añade al menos dos ejercicios y pulsa **Superserie con siguiente**. Puedes añadir más ejercicios consecutivos, deshacer la agrupación y moverla como bloque. Cada tarjeta muestra su posición en la superserie; durante el entrenamiento se indica el siguiente ejercicio y serie de la ronda. El descanso compartido se inicia solo cuando se completa la ronda, incluso si marcas sus series en otro orden o hay distintos números de series. Las superseries se conservan en el historial, al repetir, al crear una rutina desde una sesión y en las copias JSON.
- El aviso de inicio de descanso respeta los ajustes de sonido y vibración del móvil, en lugar de forzarse como silencioso. Las actualizaciones del mismo descanso siguen siendo silenciosas. Ya no se borra desde la limpieza de la pantalla: se cierra al saltar el descanso, al terminarlo con la app visible o al guardar/descartar la sesión. Al tocarlo se abre o enfoca IronLog. La interfaz distingue permiso concedido de envío correcto y permite reintentar si falla.

## Cambios de la versión 1.6.0
- El entrenamiento vuelve a mostrar todos los ejercicios y series a la vez. Ghost y récords siguen disponibles en cada serie.
- El buscador de ejercicios permite crear uno desde una sesión activa o el editor de rutinas. Se guarda en el catálogo local y se añade a la sesión o plantilla.
- El descanso guarda su hora de finalización con la sesión. Al volver a la app, el contador refleja el tiempo transcurrido. Si el sistema permite notificaciones y el usuario concede permiso, muestra un aviso con la hora de fin. Una PWA no puede garantizar un aviso justo al terminar si el sistema la suspende o cierra.
- La primera serie completada de un ejercicio sin historial se celebra como **Primera marca**. Las series posteriores siguen detectando mejoras de peso, repeticiones y otras métricas.

## Cambios de la versión 1.5.0

- Meta semanal de 1 a 7 días distintos, con elección inicial y edición posterior en Ajustes. La semana va de lunes a domingo; solo cuentan entrenamientos con series completadas.
- Ocho mensajes de celebración que rotan al alcanzar la meta semanal.
- Resumen con volumen total y una equivalencia de masa ilustrativa calculada a partir de las series completadas.
- Aviso animado al confirmar una serie que supera una marca anterior de peso, repeticiones con el mismo peso o 1RM estimado. También se reconocen marcas de repeticiones, duración y distancia cuando el tipo de ejercicio corresponde.
- La meta semanal se incluye en la exportación JSON (formato v4). Las copias anteriores siguen pudiendo importarse.

La versión 1.6.0 está desplegada en Vercel. Los cambios posteriores se desplegarán solo cuando lo solicites.

## Cambios de la versión 1.4.0

- Propuesta **Ghost** antes de cada serie de fuerza. Usa series completadas del mismo ejercicio y prefiere la misma rutina. Si se alcanza el tope de repeticiones con el RIR previsto, propone un pequeño aumento de peso; en otros casos propone una repetición más o consolidar. Tiene en cuenta errores de ghosts anteriores y la serie previa del día. Siempre es una sugerencia: al marcar la serie se guarda el resultado real, no el ghost.
- Comparación con la última sesión de la misma rutina y consulta de la última general cuando difieren.
- Resumen tras guardar, con lo realizado y una propuesta inicial para la próxima vez.
- Botón **Repetir entrenamiento** en el detalle de cada sesión pasada.
- 85 ejercicios nuevos, para un catálogo de 165. El buscador acepta nombres, material y algunos alias, y permite filtrar por grupo muscular.

## Cambios de la versión 1.3.3

- Si falla la lectura del almacenamiento, la app se detiene y permite reintentar sin sobrescribir datos.
- Si falla una escritura, muestra un aviso para reintentar o exportar una copia JSON. Una sesión terminada solo se confirma después de guardarse.
- El volumen y las series por grupo muscular cuentan únicamente las series marcadas como completadas.
- El cambio de peso corporal de 7/30 días usa la medición más próxima anterior al periodo; si no existe, muestra un guion.
- Los ejercicios personalizados se archivan en lugar de borrarse. Siguen visibles en el historial y pueden recuperarse desde el catálogo.
- Las copias JSON incluyen también la sesión en curso.

---

## Qué necesitas

Una sola cosa: **Node.js** instalado en tu portátil. Si no lo tienes, descárgalo de [nodejs.org](https://nodejs.org/) (versión LTS, instalador estándar, dos clicks). Sólo lo necesitas para construir y desplegar la app la primera vez. Después puedes desinstalarlo si quieres.

> Para comprobar que está bien instalado, abre la terminal y escribe `node --version`. Debería responder algo como `v20.x.x` o `v22.x.x`.

---

## Pasos para tener la app corriendo

### 1) Instala las dependencias

Abre la terminal en la carpeta de este proyecto y ejecuta:

```bash
npm install
```

Tarda 30-60 segundos. Se descargan React, Tailwind y demás librerías a una carpeta `node_modules/`.

### 2) Pruébala en local (opcional, pero recomendado)

```bash
npm run dev
```

Verás algo como `Local: http://localhost:5173/`. Abre esa URL en el navegador y juega con la app. Cualquier cambio que hagas en el código se refleja al instante. Para parar el servidor: Ctrl+C en la terminal.

Si tienes GNU Make, también puedes ejecutar `make serve` desde la raíz del proyecto. Instala las dependencias con `npm ci` si faltan y arranca Vite en `http://localhost:5173/`. Para abrirlo desde el móvil conectado a la misma red, usa `make serve HOST=0.0.0.0` y visita la dirección de red que muestre Vite. `make test` y `make build` ejecutan las pruebas y la compilación, respectivamente; ninguno despliega la app.

### 3) Construye la versión final

```bash
npm run build
```

Esto genera la carpeta `dist/`, que contiene la app entera comprimida en HTML/CSS/JS plano. Es lo que vas a subir a internet.

### 4) Despliega gratis a Vercel

Vercel es el más sencillo de los servicios gratis. Tiene plan gratis sin caducidad y reparte tu app por todo el mundo desde sus servidores.

**4.1.** Crea cuenta en [vercel.com](https://vercel.com/signup). Lo más cómodo es entrar con GitHub o con tu correo. Es gratis, no piden tarjeta.

**4.2.** Instala la herramienta de Vercel desde la terminal:

```bash
npm install -g vercel
```

**4.3.** Despliega. En la carpeta del proyecto:

```bash
vercel
```

La primera vez te hará varias preguntas. Las respuestas que tienes que dar:
- *Set up and deploy?* → **Y** (sí)
- *Which scope?* → tu cuenta personal (le das a Enter)
- *Link to existing project?* → **N** (no)
- *Project name?* → `ironlog` (o lo que quieras, será parte de tu URL)
- *In which directory is your code located?* → `.` (Enter, es el directorio actual)
- Detectará Vite automáticamente y te ofrecerá la configuración por defecto, le das a **Enter** a todo

Al terminar te suelta una URL del tipo `https://ironlog-tunombre.vercel.app`. Esa es tu app. Cópiala.

**Esa URL es la que se la pasas a tus amigos**, cada uno se la abre en su móvil y tiene su propia copia con sus propios datos.

> Si más adelante haces cambios al código, ejecuta `vercel --prod` desde la misma carpeta y se actualiza al instante en la misma URL. Tus datos en el móvil no se pierden cuando actualizas el código.

### Alternativa: Netlify

Si prefieres Netlify (es equivalente):

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

La primera vez te pedirá iniciar sesión y darle un nombre al sitio.

---

## Cómo "instalar" la app en tu Android (o iPhone)

Una vez tengas la URL del paso anterior:

**Android (Chrome):**
1. Abre la URL en Chrome.
2. Toca el menú de los 3 puntos arriba a la derecha.
3. Toca *"Instalar aplicación"* o *"Añadir a la pantalla de inicio"*.
4. Confirma. Te aparece un icono nuevo en el escritorio.
5. Ábrela desde ahí. Se abre a pantalla completa, sin barra de navegador, igualito que una app nativa.

**iPhone (Safari):**
1. Abre la URL en Safari.
2. Toca el botón de Compartir (el cuadrado con la flecha hacia arriba).
3. Baja y toca *"Añadir a pantalla de inicio"*.
4. Dale nombre y *"Añadir"*.
5. El icono aparece en el escritorio.

> **Importante**: Para que el almacenamiento sea robusto, **instala la app como PWA** (los pasos de arriba). En Android, una vez instalada, automáticamente se concede el permiso de almacenamiento persistente.

---

## Sobre tus datos

### Dónde se guardan
- **En el navegador de tu propio móvil**, en una base de datos llamada IndexedDB que el sistema reserva para esta web.
- **No salen de tu dispositivo nunca**. Vercel sólo sirve el código de la app; los entrenamientos viven sólo en tu teléfono.
- Cada usuario (tú, tus amigos) tiene su propio almacenamiento independiente.

### Persistencia
La primera vez que abres la app, ésta pide al navegador que marque tus datos como "persistentes". Eso significa que el navegador no los borrará automáticamente para liberar espacio. Puedes verificar el estado en *Ajustes → Almacenamiento*.

Eso protege contra borrados automáticos. **No protege** contra:
- Que tú elijas "borrar datos del navegador" manualmente.
- Que desinstales el navegador.
- Que pierdas o resetees el móvil.

Para esos casos: copias de seguridad.

### Copias de seguridad
- En *Ajustes → Exportar a JSON* descargas un archivo con todos tus datos.
- La app te recuerda hacer una copia cada 14 días.
- Recomendación: pon ese archivo en Google Drive / iCloud. Si algo va mal, importas y todo vuelve.
- El JSON pesa muy poco — un año entero de entrenos no llega a 1 MB.

### Restaurar
Si cambias de móvil o pierdes datos:
1. Despliega la app igual o ya la tienes desplegada.
2. Abre la URL en el nuevo móvil.
3. *Ajustes → Importar desde JSON* y selecciona la copia.

---

## Estructura del proyecto

```
ironlog/
├── src/
│   ├── App.jsx              ← componente principal
│   ├── main.jsx             ← punto de entrada
│   ├── index.css            ← estilos Tailwind
│   └── lib/
│       ├── storage.js       ← IndexedDB con fallback localStorage
│       └── persistence.js   ← persist API + recordatorio de backup
├── public/                  ← iconos PWA
├── scripts/
│   ├── make-icons.py        ← regenera iconos (necesita Python + Pillow)
│   ├── test-storage.mjs     ← test del storage layer
│   └── test-bundle.mjs      ← validación del bundle de producción
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Comandos útiles

```bash
npm install        # primera vez, instalar dependencias
npm run dev        # arrancar en local con recarga automática
npm run build      # construir versión final en dist/
npm run preview    # previsualizar el build local (http://localhost:4173)
npm test           # ejecutar tests del storage y bundle
npm run icons      # regenerar iconos PWA (requiere Python + Pillow)
vercel --prod      # publicar a producción en Vercel
```

---

## Resolución de problemas

**"Cuando abro la app desde el móvil aparece en blanco"**
Probablemente el navegador no terminó de descargar el service worker. Cierra y vuelve a abrir. Si persiste, en Chrome: *Ajustes → Privacidad → Borrar caché*, vuelve a abrir la URL e instala otra vez.

**"He hecho cambios en el código pero no veo nada nuevo en mi móvil"**
La app cachea agresivamente. Cierra del todo (deslizar fuera de las apps recientes) y vuelve a abrir. Si sigue igual, *Ajustes → Aplicaciones → IronLog → Almacenamiento → Borrar caché* (esto NO borra tus datos, solo el código antiguo).

**"Quiero pasar mis datos del navegador del portátil al móvil"**
*Ajustes → Exportar a JSON* en el portátil → mándatelo el archivo a ti mismo (correo, WhatsApp) → ábrelo desde el móvil → *Ajustes → Importar desde JSON*.

**"Quiero quitar la app del móvil"**
Mantén pulsado el icono → *Desinstalar* (Android) o *Eliminar* (iOS). Tus datos también se eliminan. **Exporta antes** si te interesan.

**"El servidor de Vercel está caído / quiero cambiar"**
Tu app es un montón de archivos estáticos en `dist/`. Cualquier servicio de hosting estático sirve: Netlify, Cloudflare Pages, GitHub Pages, Surge, hasta tu propio NAS. La app sigue funcionando con tus datos intactos.

---

## Qué se puede mejorar más adelante

- Sincronización entre dispositivos: requiere backend (Firebase, Supabase) y cuentas de usuario. Cambio grande.
- Backup automático real a Google Drive / Dropbox: requiere OAuth, también cambio grande.
- Estadísticas más finas: añadir gráficas, comparativas, predicciones.
- Modo claro: ahora mismo sólo hay tema oscuro.

Cualquiera de estas: si la abordas, pídele a Claude que te eche una mano partiendo de este código.

---

Hecho con cariño. A entrenar.
