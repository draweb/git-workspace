# Análisis de gaps: plan vs implementación (gw CLI)

Referencia: [plan](.cursor/plans/cli_gw_git_workspace_459cc119.plan.md).

## 1. Resumen ejecutivo

| Área | Estado | Gap |
|------|--------|-----|
| Núcleo (workspace add/list/remove, clone -w, passthrough) | Implementado | Pequeños ajustes |
| Help por comando | Parcial | Completar ejemplos y notas en subcomandos |
| Remotes con workspace | No implementado | gw remote add/set-url/list con -w |
| Push/pull/fetch simplificados | No implementado | Interceptar según [gw] workspace y remotes |
| Comandos adicionales (init -w, repo link, doctor) | No implementado | Opcional según plan |
| workspace show / current / edit / remove --clean-ssh | No implementado | Áreas de oportunidad |
| Robustez (códigos salida, stdout/stderr, validación) | Parcial | Revisar consistencia |
| README y tests | No existe | test/manual.js y README |

---

## 2. Lo que el plan exige (núcleo)

| Requisito | Implementado | Notas |
|-----------|--------------|-------|
| `gw --version` / `-V` | Sí | cli.js |
| `gw --help` / `-h` y ayuda general | Sí | Con ejemplos breves |
| `gw workspace add <nombre>` (interactivo + clave existente/nueva) | Sí | workspace-add.js con prompts, ssh-keygen Ed25519/RSA fallback |
| `gw workspace list` | Sí | workspace-list.js |
| `gw workspace remove <nombre>` | Sí | workspace-remove.js (--clean-ssh no implementado) |
| `gw clone -w <nombre> <url-ssh>` (alias SSH + git clone + user/email + [gw] + gwWorkspace en origin) | Sí | clone.js, ssh-config.js, url-utils.js |
| Passthrough de todo lo demás a `git` | Sí | runGit(argv) al final de cli.js |
| Config gw en `~/.gw/config.json` (Windows: `%USERPROFILE%\.gw`) | Sí | constants.js usa .gw en home (plan dice opcionalmente ~/.config/gw en Unix; actualmente .gw en todos) |
| SSH config: bloques Host, escritura atómica | Sí | ensureHostAlias + tmp + rename en ssh-config.js |
| Estándar GitHub ssh-keygen (Ed25519, -C email, path id_ed25519_<workspace>) | Sí | workspace-add.js |
| Validar identityFile al usar (clone) | Sí | clone.js comprueba fs.existsSync(workspace.identityFile) |

---

## 3. Gaps del plan principal (no implementados)

### 3.1 Remotes con workspace (plan: "Múltiples remotes con un workspace por remote")

- **`gw remote add <name> -w <workspace> <url-ssh>`**  
  Añadir remote con URL aliada y `remote.<name>.gwWorkspace` en `.git/config`. Reutilizar ensureHostAlias y buildAliasedUrl.
- **`gw remote set-url <name> -w <workspace> <url-ssh>`**  
  Reescribir URL a forma aliada y actualizar SSH config y gwWorkspace.
- **`gw remote -v` / `gw remote list` (como comando gw)**  
  Listar remotes leyendo `.git/config` y mostrar URL + workspace (gwWorkspace). Si no hay -w en la invocación, hoy se hace passthrough a `git remote -v`; haría falta detectar y ofrecer la variante “con workspace”.

### 3.2 Push / pull / fetch simplificados (plan: "Comandos simplificados")

- **`gw push`** (sin remote explícito): si existe `[gw] workspace` en el repo, resolver remotes con ese gwWorkspace y ejecutar `git push <remote> [branch]` (o varios en secuencia). Si el primer argumento es un remote conocido → passthrough.
- **`gw pull`** (sin remote explícito): mismo criterio; pull desde el remote del workspace actual.
- **`gw fetch`** (sin remote explícito): fetch desde los remotes del workspace actual.
- **`gw push --all-remotes`** y **`gw fetch --all-remotes`**: usar todos los remotes con gwWorkspace.

Requisitos de implementación:

- Módulo **git-context** (o equivalente): leer `.git/config` en cwd y devolver `currentWorkspace` ([gw] workspace) y `remotesByWorkspace` (remote.*.gwWorkspace).
- Comandos **push.js**, **pull.js**, **fetch.js** que resuelvan remotes y llamen a `git` con los argumentos adecuados.
- En **cli.js**: tratar `push`, `pull`, `fetch` como comandos conocidos; si hay remote explícito (nombre conocido) → passthrough; si no, ejecutar lógica simplificada.

### 3.3 Help robusto (plan: sección 8.1)

- **Por comando**: Usage, descripción, opciones, 2–4 ejemplos, notas. Parcialmente cubierto con Commander; faltan ejemplos y notas en `workspace add`, `workspace remove`, `clone`.
- **`gw <comando> --help`** para comandos git: reenviar a `git <comando> --help`. Hoy no se intercepta; `gw commit --help` ya hace passthrough a git, por lo que git muestra su ayuda. Verificar que no se consuma `--help` en gw antes del passthrough (actualmente no se consume, correcto).

---

## 4. Áreas de oportunidad (plan) no implementadas

- **`gw workspace show <nombre>`**: detalle del workspace (name, email, identityFile, hosts en SSH config).
- **`gw workspace current`**: leer [gw] workspace del repo actual y mostrarlo.
- **`gw workspace edit <nombre>`**: cambiar name, email o identityFile.
- **`gw workspace remove --clean-ssh`**: quitar del `~/.ssh/config` los Host que usan la clave del workspace (hoy solo mensaje "no implementado").
- **`gw init -w <workspace>`**: `git init` + configurar user.name y user.email del workspace.
- **`gw repo link -w <nombre>`**: en el repo actual, configurar user.name, user.email y remote origin con URL aliada + gwWorkspace.
- **`gw doctor`** / **`gw check`**: diagnóstico (claves existentes, SSH config escribible, repos con [gw] workspace).
- **URLs HTTPS** en clone: detectar y advertir que -w solo aplica a SSH (o sugerir URL SSH).
- **Modo no interactivo** de `workspace add`: ya hay flags --name, --email, --identity-file, --new-key; validar que con todos los obligatorios no se pidan prompts.

---

## 5. Robustez y estructura (plan: "CLI robusta")

| Punto | Estado | Gap |
|-------|--------|-----|
| Códigos de salida 0/1/2/3 | Sí (constants.js EXIT_CODES) | Comprobar que todos los comandos los usen |
| try/catch en entrypoint | Sí en cli.js | — |
| stdout vs stderr | Parcial | Errores con console.error (stderr); listados con console.log (stdout). Documentar y ser estricto |
| Validación config (schema) | No | Validar estructura al cargar config (workspaces objeto, cada uno con name, email, identityFile) |
| Escritura atómica config gw | Sí | config.js writeRaw con .tmp y rename |
| Escritura atómica SSH config | Sí | ssh-config.js tmp + rename |
| Permisos 0700/0600 en Unix | Parcial | config.js ensureConfigDir y writeRaw intentan chmod; ssh-config no toca permisos |
| Reenvío de `gw <git-cmd> --help` a git | Implícito | Passthrough correcto; no hace falta cambio |

---

## 6. Documentación y tests (plan: punto 8)

- **README**: no existe. Incluir instalación, requisitos Node, uso básico (workspace add, clone -w), ejemplos, troubleshooting, códigos de salida.
- **Tests**: el plan sugiere "tests manuales o con script de prueba"; package.json referencia `test/manual.js` que no existe. Gap: crear al menos un script de prueba manual o un test básico.

---

## 7. Ruta de directorio de config (plan vs implementación)

- **Plan**: "en Windows el directorio de config puede ser `path.join(os.homedir(), '.gw')` o `process.env.APPDATA + '\\gw'` según preferencia (`.gw` en home es más portable)". En Unix menciona `~/.config/gw`.
- **Implementación**: constants.js usa `~/.gw` en Windows y `~/.config/gw` en Unix. Si se quiere alinear 100% al plan “.gw en home es más portable”, en Unix podría usarse también `~/.gw`; es una decisión de producto, no un bug.

---

## 8. Priorización sugerida para cubrir el gap

1. **Alta prioridad (núcleo del plan)**  
   - Implementar **gw remote add/set-url** con -w y **gw remote -v** mostrando workspace.  
   - Implementar **push/pull/fetch** simplificados (git-context + push.js, pull.js, fetch.js + detección en cli.js).  

2. **Media prioridad (robustez y uso)**  
   - README con instalación, uso y ejemplos.  
   - Help con ejemplos en workspace add, clone, remove (addHelpText).  
   - Validación de schema al cargar config.  
   - workspace remove --clean-ssh (o mensaje claro si no se implementa).  

3. **Prioridad menor (oportunidades)**  
   - workspace show, workspace current, init -w, repo link, doctor.  
   - Detección de URL HTTPS en clone con advertencia.

Con esto, el plan queda validado y el gap a cubrir queda determinado y priorizado.
