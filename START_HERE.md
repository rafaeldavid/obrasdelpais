# 👋 Bienvenido, Isaak — Start Here

Esta guía te lleva paso a paso desde una computadora vacía hasta tener el nuevo sitio web de **Obras del País** corriendo en tu cuenta de Ghost. La hizo Rafael trabajando con un asistente llamado Claude Code; tu Claude Code va a continuar el trabajo desde donde lo dejamos.

> **Idioma:** podés leer estas instrucciones y hablar con Claude Code en español o inglés indistintamente. El asistente cambia de idioma sin que lo pidas.

> **Sistema operativo:** estos pasos funcionan en **Mac** y **Windows**. Donde haya diferencias, te las marco con 🍎 (Mac) y 🪟 (Windows).

---

## Lo que vas a lograr

1. Instalar Claude Code en tu computadora.
2. Conectarlo a tu cuenta de GitHub.
3. Bajar este repositorio a tu máquina.
4. Dejar que Claude Code lea la documentación y termine el sitio (subirlo como tema de Ghost a `obrasdelpais.com`).

Tiempo aproximado: **30–60 minutos** la primera vez. Después se vuelve rápido.

---

## Paso 1 — Instala Claude Code

Claude Code es un asistente que vive en tu Terminal y puede leer/escribir archivos, correr comandos, y trabajar con tu repositorio. Es lo que vas a usar para terminar el sitio.

### 🍎 En Mac

Abre la app **Terminal** (Aplicaciones → Utilidades → Terminal) y pega esto:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Cuando termine, cierra la Terminal y ábrela de nuevo. Después escribe:

```bash
claude --version
```

Si te da un número de versión, listo.

### 🪟 En Windows

Tienes dos caminos. El más fácil:

**Opción A — Instalador directo (recomendado)**
1. Abre **PowerShell** (busca "PowerShell" en el menú Inicio).
2. Pega esto:
   ```powershell
   irm https://claude.ai/install.ps1 | iex
   ```
3. Cierra PowerShell y ábrelo de nuevo.
4. Verifica con: `claude --version`

**Opción B — WSL** (Subsistema de Windows para Linux). Más potente pero requiere paso extra:
1. En PowerShell con permisos de administrador: `wsl --install`
2. Reinicia la computadora.
3. Abre "Ubuntu" del menú Inicio y dentro: `curl -fsSL https://claude.ai/install.sh | bash`

Si no estás seguro, ve con la **Opción A**.

> Si la URL del instalador no funciona, la guía oficial está en **https://www.claude.com/claude-code**. Cualquier cosa que indique esa página es la fuente de verdad — esta sección puede quedar desactualizada.

---

## Paso 2 — Inicia sesión en Claude

Vuelve a la Terminal (o PowerShell) y escribe:

```bash
claude
```

La primera vez te va a pedir que entres con tu cuenta de Anthropic. Sigue el link que aparece en pantalla — abre el navegador, te logueas, y vuelves a la Terminal. Listo.

> **¿Qué cuenta uso?** Si Rafael te invitó a su organización en Anthropic, entra con tu correo y selecciona esa organización. Si no, regístrate gratis en https://console.anthropic.com — Claude Code funciona con cuenta personal también.

---

## Paso 3 — Conecta GitHub

GitHub es donde está guardado el código del sitio. Para que Claude Code pueda bajarlo y subir tus cambios, necesitas dos cosas:

### 3a) Instala `git` y `gh` (la herramienta de GitHub)

Dile a Claude Code que los instale por ti:

1. Con `claude` corriendo en la Terminal, escribe (en lenguaje natural):
   > **"Instala git y la herramienta gh de GitHub si no las tengo, y verifica las versiones"**

Claude Code va a correr los comandos correctos según tu sistema (`brew install` en Mac, `winget install` en Windows, etc.). Te va a pedir permiso antes de cada paso — solo dile "sí" o "yes".

### 3b) Inicia sesión en GitHub

Cuando tengas `gh` instalado, dile a Claude:

> **"Inicia sesión en GitHub con `gh auth login`"**

Sigue las instrucciones — vas a copiar un código de la Terminal, pegarlo en una página de GitHub, y autorizar. Una sola vez por máquina.

### 3c) Asegúrate de tener acceso al repo

El repositorio público es **https://github.com/rafaeldavid/obrasdelpais**. Como es público, no necesitas permisos especiales para *leerlo*. Para *escribir* (subir cambios) necesitas que Rafael te dé permiso de "collaborator" en GitHub. Pídele que te invite — recibirás un email.

---

## Paso 4 — Baja el proyecto

Decide en qué carpeta quieres tener el proyecto. Una sugerencia:

🍎 Mac: `~/Documents/obrasdelpais`
🪟 Windows: `C:\Users\TuUsuario\Documents\obrasdelpais`

Dile a Claude Code:

> **"Clona https://github.com/rafaeldavid/obrasdelpais.git en mi carpeta de Documentos y entra a esa carpeta"**

Si todo sale bien, ahora tienes el proyecto completo en tu máquina.

---

## Paso 5 — Deja que Claude Code lea el manual y siga el trabajo

**Este es el paso clave.** Una vez que estés dentro de la carpeta `obrasdelpais`, dile a Claude Code exactamente esto:

> **"Lee `README.md` y `HANDOVER.md` completos. Resume en 5 puntos dónde estamos en el proyecto, qué decisiones ya tomamos, y qué falta. No empieces a programar todavía — quiero entender el estado primero."**

Claude Code va a leer los dos documentos (son extensos pero claros) y te va a explicar:

- Qué se construyó hasta ahora (el sitio entero, en dos versiones: una estática que ya está en vivo, y un tema de Ghost listo para subir)
- Qué servicios están conectados (PayPal, ATH Móvil, Ghost Members, YouTube)
- Qué decisiones ya están tomadas (no las re-litiguen, son de diseño/voz de la organización)
- Qué falta para terminar (8 ítems concretos)

---

## Paso 6 — Lo que tu trabajo concreto incluye

Tu meta es **finalizar el sitio y subirlo como tema de Ghost** a tu cuenta de Ghost(Pro) en `obrasdelpais.com`. Aquí los pendientes que requieren *tu* input (nadie más los puede contestar):

| # | Decisión / dato necesario |
|---|---|
| 1 | **EIN del 501(c)(3)** — el número aparece en los recibos pero algunos donantes lo quieren visible. ¿Lo ponemos público en la página de donaciones? |
| 2 | **Nombre exacto en ATH Móvil** — los donantes en PR buscan a "Obras del País" en pagos comerciales. ¿Es ese el nombre exacto registrado, o varía? |
| 3 | **Stripe** — la página de donar tiene tres rieles: PayPal, Padrino mensual, ATH Móvil. ¿Quieres añadir Stripe Checkout como cuarto riel, o PayPal cubre tarjetas suficientemente? |
| 4 | **Boletín en el preview estático** — la versión en vivo (`steady-glacier-drz3.here.now`) no manda emails todavía. Cuando subas el tema a Ghost real, el formulario funciona automáticamente con Ghost Members. ¿Mantenemos el preview como visual nada más, o lo conectamos a Ghost? |
| 5 | **Subir el tema a Ghost** — este es el deliverable principal. Yo te explico abajo cómo hacerlo. |

Para cada pendiente, dile a Claude Code algo como:

> **"Quiero hacer la decisión #1 del HANDOVER: el EIN es 12-3456789 y queremos mostrarlo público. Aplica el cambio donde corresponda y publica el preview de nuevo."**

Claude Code edita los archivos correctos, hace una commit con el mensaje correcto, y publica.

---

## Paso 7 — Subir el tema a Ghost

Este es el momento clave. Tienes dos formas:

### Opción rápida — pídele a Claude

> **"Empaqueta el tema de Ghost como un .zip listo para subir, y dame instrucciones paso a paso para subirlo a Ghost(Pro) admin."**

Claude Code va a:
1. Hacer `zip` de la carpeta `obras-del-pais-theme/`
2. Decirte exactamente dónde clickear en `obrasdelpais.com/ghost/` para subirlo
3. Decirte qué páginas crear con qué slugs

### Lo que vas a hacer en Ghost(Pro) admin

1. Login en `https://obrasdelpais.com/ghost/` (tu admin de Ghost).
2. Ve a **Settings → Design → Themes**.
3. Click **Upload theme** → selecciona el `obras-del-pais-theme.zip`.
4. Click **Activate** una vez subido.
5. Ve a **Pages**. Crea estas páginas (vacías está bien — el tema rellena el contenido):
   - slug: `donar` → título "Donar"
   - slug: `documentales` → título "Documentales"
   - slug: `directorio` → título "Directorio"
   - slug: `quienes-somos` → título "Quiénes somos"
   - slug: `contactanos` → título "Contáctanos"
   - slug: `lengua-de-senas` → título "Lengua de señas"
   - slug: `preguntas-frecuentes` → título "Preguntas frecuentes"
6. Ve a **Settings → Design → Customize**. Vas a ver opciones nuevas:
   - **Homepage hero image** — sube una foto de manos sobre fondo negro (las del brochure son ideales)
   - **PayPal donate URL** — ya tiene un default, déjalo o ajusta
   - **ATH Móvil business name** — pon el nombre exacto
   - **EIN visible** y **EIN value** — si decidiste mostrarlo público
   - **YouTube channel handle** — debería decir `@obrasdelpais`
7. Guarda y abre `obrasdelpais.com` en otra pestaña. Deberías ver el sitio nuevo.

### Antes de activar el tema en producción

Si te preocupa romper el sitio en vivo, Ghost te deja **subir el tema sin activarlo**. Puedes previsualizarlo en `Settings → Design → Themes → (tu tema) → Preview`. Si todo se ve bien, activas. Si algo está raro, vuelves al tema anterior con un click.

---

## Cosas útiles para pedirle a Claude Code

- **"Corre el preview localmente y dame el link"** → arranca un servidor en tu computadora para ver el sitio sin tocar nada en producción.
- **"Refresca los datos de YouTube"** → vuelve a leer los videos del canal `@obrasdelpais` y actualiza títulos/descripciones.
- **"Añade un nuevo artesano: nombre X, oficio Y, municipio Z"** → modifica el JSON correcto y publica.
- **"Cambia el color clay a un tono más rojizo"** → toca un solo token en `style.css`.
- **"Algo se rompió, ayúdame a debuggear"** → muéstrale el síntoma (un screenshot o el mensaje de error). Claude lee el código y arregla.
- **"Sube los cambios a GitHub"** → hace commit + push con un mensaje que describe qué cambió y por qué.

---

## Si algo sale mal

### Claude Code no responde
Cierra con `Ctrl+C`, vuelve a abrir con `claude`, y describe qué estabas haciendo.

### "Permission denied" cuando subes a GitHub
No tienes acceso de "collaborator". Pídele a Rafael que te invite en GitHub (Settings → Collaborators).

### El preview en here.now muestra el contenido viejo
Tu navegador tiene caché. Recarga con `Cmd+Shift+R` (Mac) o `Ctrl+F5` (Windows).

### "git push" falla con "rejected"
Alguien hizo un cambio en GitHub que no tienes localmente. Pídele a Claude:
> **"Trae los últimos cambios de GitHub y vuelve a intentar el push"**

### El tema no se sube a Ghost porque "the theme is invalid"
Ghost a veces da errores específicos. Copia el mensaje completo y mándaselo a Claude:
> **"Ghost rechazó el tema con este error: [pega aquí]. ¿Qué falta?"**

### No sé qué hacer ahora
Pídele a Claude:
> **"Muéstrame qué archivos cambiaron desde el último push y resume qué hice hoy"**

---

## Recursos clave

| Qué | Dónde |
|---|---|
| **Sitio en vivo (preview)** | https://steady-glacier-drz3.here.now/ |
| **Repositorio en GitHub** | https://github.com/rafaeldavid/obrasdelpais |
| **Manual técnico** (en este repo) | `HANDOVER.md` |
| **README** (en este repo) | `README.md` |
| **Brochure de marca** | `Obras del Pais. The Beauty of Puerto Rican Folklore.pdf` |
| **Documentación oficial de Claude Code** | https://www.claude.com/claude-code |
| **Tu admin de Ghost** | https://obrasdelpais.com/ghost/ |
| **Pagos en PayPal** | https://www.paypal.com/donate/?hosted_button_id=97XWVQV6YQT6C |

---

## Una nota sobre filosofía

El sitio fue diseñado con un panel de personas (artesano, fotógrafa, videógrafo, maestro artesano, narradora, mecenas, ingeniera, recaudadora de fondos) que llegaron a una conclusión clara: **la sobriedad es la marca**. Obras del País no compite con plataformas de contenido — compite con el olvido.

Cada decisión hace que el visitante baje la velocidad: hero único en lugar de carrusel, español primero, índice editorial en lugar de cuadrícula tipo YouTube, el CTA de donar aparece *después* de la línea final manuscrita. El negro no es un fondo — es una pausa, un respiro contenido.

Si Claude Code te sugiere algo que rompe esa sensación (carruseles, popups, autoplay, banners blink), recuérdale el principio: **restraint is the brand**. Está documentado en `HANDOVER.md` bajo "Decision log" y debería respetarlo.

---

## ¿Listo?

```
claude
```

Y di: **"Lee `README.md` y `HANDOVER.md` completos. Resume en 5 puntos dónde estamos en el proyecto, qué decisiones ya tomamos, y qué falta. No empieces a programar todavía — quiero entender el estado primero."**

Bienvenido al equipo, Isaak. ✊
