# Preparar el PC (Windows) para Claude Code + Codex

Tiempo: unos 15 minutos. Todo se hace en **PowerShell** (menú Inicio → «PowerShell»), sin permisos de administrador salvo que se indique.

## 1. Herramientas base
```powershell
winget install --id Git.Git
winget install --id OpenJS.NodeJS.LTS
winget install --id GitHub.cli
```
Después: `gh auth login` (elige GitHub.com → HTTPS → iniciar sesión con el navegador). Si ya estaba conectada, `gh auth status` lo confirma.
Cierra y vuelve a abrir PowerShell. Comprueba: `git --version` y `node -v` (debe ser 20 o más).

## 2. Claude Code
```powershell
irm https://claude.ai/install.ps1 | iex
```
Cierra y abre PowerShell. Comprueba: `claude --version`. La primera vez que ejecutes `claude` te pedirá iniciar sesión con tu cuenta de Claude.

## 3. Codex (con tu cuenta de ChatGPT)
```powershell
npm install -g @openai/codex
codex login
```
`codex login` abre el navegador: entra con tu cuenta de ChatGPT. (Ya tienes una carpeta `.codex` en tu usuario, así que puede que esté instalado; si `codex --version` responde, salta el `npm install`.)

## 4. Carpeta del proyecto
Copia en `C:\Users\<tu usuario>\Proyectos\App-estudio` el contenido de la carpeta `app-estudio` del zip: `CLAUDE.md` en la raíz y la carpeta `docs/`.
```powershell
cd $HOME\Proyectos\App-estudio
claude
```

## 5. Conectar Codex dentro de Claude Code
Dentro de Claude Code, escribe uno a uno:
```
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```
`/codex:setup` comprueba que Codex está instalado y con sesión iniciada. Si dice que no hay sesión: `!codex login`.

**No actives** la opción `--enable-review-gate`: puede crear un bucle Claude↔Codex que gasta tu uso muy rápido.

## 6. Modelo y esfuerzo
- En Claude Code: `/model` → Opus, y el esfuerzo en alto (`/effort high` o desde `/model`, según la versión).
- Codex: el esfuerzo lo pone Claude en cada encargo (`--effort medium|high`); no hace falta configurar nada.

## 7. Arrancar
Pega el contenido de `docs/PROMPT_INICIO.md` (lo de debajo de la línea). Claude Code planifica, te da un resumen y espera tu «aceptar».

## Si algo falla
- `codex` no se reconoce tras instalar: cierra y abre PowerShell.
- Problemas con el sandbox de Codex en Windows: en `C:\Users\<tu usuario>\.codex\config.toml` añade
  ```toml
  [windows]
  sandbox = "unelevated"
  ```
- Para retomar otro día: `cd $HOME\Proyectos\App-estudio`, `claude`, y escribe «Lee CLAUDE.md y docs/PROGRESS.md y continúa».
