# Especificación técnica – gw (Git Workspace CLI)

Documento de especificación técnica del proyecto **gw**: CLI que extiende git con el concepto de **workspaces** (identidad git + clave SSH por contexto) y reenvía el resto de comandos a git.

---

## 1. Objetivos y alcance

- **Objetivo**: Permitir usar varias identidades git (name, email) y claves SSH distintas según el “workspace” (proyecto/empresa), sin tocar la config global de git.
- **Invocación**: Comando único `gw`; cualquier comando no propio se reenvía a `git`.
- **Alcance**: Gestión de workspaces, clone con workspace, remotes con workspace (mirrors), push/pull/fetch simplificados, init y asociación de repos existentes, diagnóstico (doctor).

---

## 2. Requisitos del sistema

| Requisito        | Versión / Notas                          |
|------------------|------------------------------------------|
| Node.js          | >= 18.0.0                                |
| git              | Instalado y en PATH                      |
| OpenSSH          | `ssh-keygen` en PATH (generación claves) |
| Sistema de archivos | Acceso lectura/escritura a homedir y `~/.ssh` |

---

## 3. Arquitectura

### 3.1 Puntos de entrada

- **Ejecutable**: `bin/gw.js` (shebang `#!/usr/bin/env node`) carga `src/cli.js`.
- **CLI**: `src/cli.js` parsea `process.argv`, delega en comandos propios o llama a `runGit(argv)` para passthrough a git.

### 3.2 Orden de resolución de comandos (cli.js)

1. `--version` / `-V` → imprime versión, exit 0.
2. `--help` / `-h` o sin argumentos → ayuda con Commander más bloques `addHelpText` (cabecera opcional, secciones y guía de ayuda anidada), exit 0.
3. **Clone con workspace**: `clone -w <ws> <url>` o `clone --workspace <ws> <url>` → `commands/clone`.
4. **workspace** → subcomandos: add, list, remove, show, pubkey, current, edit, key rotate.
5. **remote**: `-v` / `list` → remote-list; `add <name> -w <ws> <url>` → remote-add; `set-url <name> -w <ws> <url>` → remote-set-url.
6. **init** con `-w` / `--workspace` → commands/init.
7. **repo link** con `-w` / `--workspace` → commands/repo-link.
8. **doctor** / **check** → commands/doctor.
9. **push** → commands/push (si aplica workspace) o passthrough git.
10. **pull** → commands/pull (si aplica) o passthrough.
11. **fetch** → commands/fetch (si aplica) o passthrough.
12. Cualquier otro argumento → `runGit(argv)` (git).

### 3.3 Módulos y dependencias

```
bin/gw.js
  └── src/cli.js
        ├── constants.js      (rutas, códigos salida, regex, nombres git config)
        ├── term-style.js     (colores ANSI opcionales: NO_COLOR, GW_COLOR, TTY)
        ├── term-ui.js        (iconos GW_ICONS; spinner GW_SPINNER / stderr TTY)
        ├── help-format.js    (cabecera GW_BANNER, taglines, bloques post-ayuda)
        ├── config.js         (config gw: getWorkspaces, addWorkspace, …)
        ├── ssh-config.js     (parse/escritura ~/.ssh/config)
        ├── url-utils.js      (parseSshUrl, isSshUrl, buildAliasedUrl)
        ├── git-context.js    (findGitRoot, getCurrentWorkspace, remotes, git config)
        ├── utils/validate.js (validateWorkspaceName, validateEmail)
        └── commands/*.js     (clone, workspace-add, workspace-list, …)
```

- **Comander**: definición de subcomandos y opciones (workspace add/list/…).
- **prompts**: entradas interactivas en `workspace add` cuando faltan name/email o clave.

### 3.4 Ayuda CLI y presentación

- **Ayuda raíz** (`gw -h`): `help-format.helpBannerBefore('root')` + salida estándar de Commander + `rootHelpAfter(pkg)` (inicio rápido, comandos agrupados, rutas de config, enlaces a ayuda anidada).
- **Ayuda workspace** (`gw workspace --help`): banner contextual `workspace`, bloque explícito para `gw workspace key rotate` y `gw workspace key --help`.
- **Ayuda workspace key** (`gw workspace key --help`): banner contextual `key`, nota sobre rotación y backup.
- **Cabecera / tagline**: varias frases fijas en código; rotación ligera (hash de `cwd` + día UTC). Marco ASCII corto solo en TTY con política `GW_BANNER` auto; `GW_BANNER=0` la omite; `GW_BANNER=1` fuerza al menos título + tagline sin depender del TTY.
- **ssh-keygen** (desde `cli.js`): se invoca con `-q` y `stdio: 'ignore'` mientras `term-ui.withSpinner` muestra progreso en stderr si aplica; los tests pueden inyectar `runSshKeygen` mock sin pasar por el CLI.

| Variable | Comportamiento |
|----------|----------------|
| `NO_COLOR` | Sin secuencias de color. |
| `GW_COLOR` | `0` sin color; `1` fuerza color (con `FORCE_COLOR` / reglas TTY en term-style). |
| `GW_ICONS` | `0` prefijos ASCII; `1` Unicode en TTY. |
| `GW_SPINNER` | `0` sin animación; `1` fuerza spinner si hay TTY en stderr. |
| `GW_BANNER` | `0` sin cabecera divertida en ayudas; `1` fuerza cabecera. |

El comando **`gw workspace pubkey`** no debe añadir iconos ni texto extra en stdout (solo la clave pública).

---

## 4. Configuración y formatos de datos

### 4.1 Config de gw

- **Ruta** (constants.js):
  - Windows: `%USERPROFILE%\.gw\config.json`
  - Unix: `~/.config/gw/config.json`
- **Estructura**:
  ```json
  {
    "workspaces": {
      "<nombre>": {
        "name": "Nombre para git",
        "email": "email@ejemplo.com",
        "identityFile": "/ruta/absoluta/a/clave_privada"
      }
    }
  }
  ```
- **Validación** (config.loadRaw): cada workspace debe ser objeto con `name`, `email` e `identityFile` (strings); entradas inválidas se descartan al cargar.
- **Escritura**: atómica vía archivo temporal `config.json.tmp.<pid>` y `fs.renameSync`. En Unix se intenta `chmod 0o700` en el directorio y `0o600` en el temporal.

### 4.2 SSH config (~/.ssh/config)

- **Ruta**: `~/.ssh/config` (os.homedir() + `.ssh/config`).
- **Bloques que escribe gw**: por cada uso de un workspace con un host (p. ej. github.com), se asegura un bloque:
  ```
  # gw workspace alias for <workspace>.<host>
  Host <workspace>.<host>
    HostName <host>
    User git
    IdentityFile <ruta_absoluta_clave>
  ```
- **Ejemplo**: workspace `draweb`, URL `git@github.com:user/repo.git` → Host `draweb.github.com`, HostName `github.com`, IdentityFile la del workspace.
- **Eliminación**: `removeHostBlocksByWorkspace(workspaceName)` elimina todos los Host cuyo nombre comienza con `<workspace>.` (case-insensitive).

### 4.3 Config de repositorio (.git/config)

- **Sección [gw]**:
  - `workspace = <nombre>` — workspace asociado al repo (usado por push/pull/fetch simplificados y `gw workspace current`).
- **Sección [remote "<nombre>"]**:
  - `url` — URL del remote (gw puede escribir la URL aliada `git@<workspace>.<host>:path`).
  - `gwWorkspace = <nombre>` — indica que ese remote usa la identidad de ese workspace (para push --all-remotes, fetch --all-remotes, remote list).

Constantes en constants.js: `GIT_CONFIG_GW_SECTION = 'gw'`, `GIT_CONFIG_GW_WORKSPACE = 'workspace'`, `GIT_CONFIG_REMOTE_GW_WORKSPACE = 'gwWorkspace'`.

---

## 5. URLs SSH

- **Formatos soportados** (url-utils.js):
  - `git@host:path` (ej. `git@github.com:user/repo.git`)
  - `ssh://git@host/path`
- **parseSshUrl(url)**: devuelve `{ host, pathPart, isSsh }` o `null` si no es SSH válida.
- **isSshUrl(url)**: `true` si parseSshUrl no es null.
- **buildAliasedUrl(originalUrl, aliasHost)**: sustituye el host por `aliasHost` en la URL (para usar el alias de ~/.ssh/config). Devuelve `null` si la URL no es válida.

---

## 6. Comandos propios – especificación

### 6.1 workspace add \<nombre\>

- **Descripción**: Añade un workspace (name, email, clave SSH).
- **Opciones**: `--name`, `--email`, `--identity-file <path>`, `--new-key`.
- **Validación**: nombre según `WORKSPACE_NAME_REGEX` (`^[a-zA-Z0-9_-]+$`); email debe contener `@`. No puede existir ya un workspace con ese nombre.
- **Flujo**:
  - Si faltan name/email y no se pasan por opciones → prompts.
  - Clave: si `--identity-file` → comprobar que existe; si `--new-key` → generar RSA 4096 en `~/.ssh/id_rsa_<nombre>`; si no → listar claves existentes (ssh-config.listIdentityFiles) y permitir elegir o generar nueva.
  - Regla de clave pública: el archivo `.pub` asociado debe iniciar con `ssh-rsa`.
  - config.addWorkspace(nombre, { name, email, identityFile }).
- **Salida**: mensaje "Workspace \"nombre\" añadido." o error; códigos USAGE/ENV/EXTERNAL.

### 6.2 workspace list

- **Descripción**: Lista nombres de workspaces en la config.
- **Implementación**: config.getWorkspaces(), imprimir claves (una por línea o formato definido en workspace-list.js).

### 6.3 workspace remove \<nombre\> [--clean-ssh]

- **Descripción**: Elimina el workspace de la config de gw.
- **--clean-ssh**: además elimina de ~/.ssh/config todos los bloques Host que empiecen por `<nombre>.`.
- **Salida**: mensaje de éxito o error (workspace no existente, etc.).

### 6.4 workspace show \<nombre\>

- **Descripción**: Muestra name, email e identityFile del workspace.
- **Error**: si el workspace no existe.

### 6.5 workspace current

- **Descripción**: Muestra el workspace asociado al repo actual (lectura de [gw] workspace en .git/config).
- **Contexto**: debe ejecutarse dentro de un repo; usa git-context.findGitRoot y getCurrentWorkspace.

### 6.6 workspace edit \<nombre\> [--name] [--email] [--identity-file]

- **Descripción**: Actualiza name, email o identityFile del workspace (solo los indicados).
- **Implementación**: config.updateWorkspace(nombre, { name?, email?, identityFile? }).

### 6.6.1 workspace pubkey \<nombre\>

- **Descripción**: Imprime en stdout la clave pública (`.pub`) del workspace.
- **Validación**: la clave pública debe comenzar con `ssh-rsa`; si no cumple, retorna error de uso.
- **Errores**: si no existe `.pub`, retorna error; si no puede leerse, error de entorno.

### 6.6.2 workspace key rotate \<nombre\>

- **Descripción**: Regenera la clave RSA del workspace con confirmación previa del usuario.
- **Flujo**:
  - Muestra un resumen de la operación y solicita confirmación explícita.
  - Realiza backup de la clave actual (privada y `.pub`) con sufijo `.bak-YYYYMMDD-HHmmss`.
  - Genera una nueva clave RSA 4096 en `~/.ssh/id_rsa_<workspace>`.
  - Actualiza `identityFile` en la configuración del workspace.
- **Errores**: si el usuario cancela, retorna error de uso; si falla backup o `ssh-keygen`, retorna error externo.

### 6.7 clone -w \<workspace\> \<url\> [args...]

- **Descripción**: Clona con identidad del workspace. Crea alias SSH, clona, configura user.name/user.email en el repo y escribe [gw] workspace y gwWorkspace en origin.
- **Opciones**: `-w` / `--workspace`; resto de argumentos se pasan a `git clone` (incl. `--dry-run`; --dry-run no se pasa a git pero se usa para solo imprimir qué se haría).
- **Validación**: workspace existente, URL SSH (si es HTTPS se avisa y sale con error), y clave pública del workspace con prefijo `ssh-rsa`.
- **Flujo**:
  - Obtener workspace; parseSshUrl(url); aliasHost = workspace + '.' + host; buildAliasedUrl; ensureHostAlias en ~/.ssh/config; git clone con URL aliada; en el directorio clonado: git config user.name, user.email; escribir/actualizar .git/config con [gw] workspace y gwWorkspace en remote "origin".

### 6.8 remote add \<name\> -w \<workspace\> \<url\>

- **Descripción**: Añade un remote con URL aliada y guarda gwWorkspace en ese remote.
- **Requisitos**: estar en un repo; URL SSH; workspace existente.
- **Validación adicional**: la clave pública del workspace (`.pub`) debe existir e iniciar con `ssh-rsa`.
- **Flujo**: ensureHostAlias; git remote add \<name\> \<aliasedUrl\>; writeGitConfigSection para remote "\<name\>" con gwWorkspace = workspace.

### 6.9 remote set-url \<name\> -w \<workspace\> \<url\>

- **Descripción**: Cambia la URL del remote a la aliada y asocia el remote al workspace (gwWorkspace).
- **Flujo**: ensureHostAlias; setRemoteUrl(root, name, aliasedUrl); writeGitConfigSection para [gw] y remote "\<name\>" (workspace y gwWorkspace).
- **Validación adicional**: la clave pública del workspace (`.pub`) debe existir e iniciar con `ssh-rsa`.

### 6.10 remote -v / remote list

- **Descripción**: Lista remotes mostrando URL y workspace (gwWorkspace) si existe.
- **Implementación**: git-context.getRemotesWithWorkspace; imprimir nombre, url, gwWorkspace.

### 6.11 push [remote | --all-remotes] [args...]

- **Lógica**:
  - Si el primer argumento es un nombre de remote existente (no opción) → passthrough a git push.
  - Si no: si hay --all-remotes → push a todos los remotes que tengan gwWorkspace; si no, push a los remotes del workspace actual ([gw] workspace). Si no hay workspace o no hay remotes asociados → error USAGE; si no está en repo → passthrough.
- **Ejecución**: secuencial de `git push <remote> ...` por cada remote elegido.

### 6.12 pull [args...]

- **Lógica**: Si el primer argumento es un remote explícito → passthrough. Si no, usa workspace actual y el primer remote asociado a ese workspace; hace `git pull <remote> ...`. Sin workspace o sin remotes asociados → error.

### 6.13 fetch [remote | --all-remotes] [args...]

- **Lógica**: Igual que push respecto a remote explícito vs --all-remotes vs workspace actual. Secuencial `git fetch <remote> ...`.

### 6.14 init -w \<workspace\> [args...]

- **Descripción**: git init con argumentos extra; luego configura user.name, user.email y [gw] workspace en el repo.
- **Requisitos**: workspace existente.

### 6.15 repo link -w \<workspace\>

- **Descripción**: Asocia un repo ya clonado al workspace: configura user.name, user.email, [gw] workspace, cambia origin a URL aliada y pone gwWorkspace en origin.
- **Requisitos**: estar en repo; existir remote origin con URL SSH; workspace existente.
- **Validación adicional**: la clave pública del workspace (`.pub`) debe existir e iniciar con `ssh-rsa`.

### 6.16 doctor

- **Descripción**: Comprueba que cada workspace tenga identityFile existente y que ~/.ssh/config exista y sea escribible; opcionalmente muestra el workspace del repo actual.
- **Código salida**: ENV si hay algún error; SUCCESS si todo OK.

---

## 7. APIs de módulos (referencia)

### 7.1 constants.js

- `CONFIG_DIR`, `CONFIG_FILE`, `GW_CONFIG_PATH`: rutas de config gw.
- `GIT_CONFIG_GW_SECTION`, `GIT_CONFIG_GW_WORKSPACE`, `GIT_CONFIG_REMOTE_GW_WORKSPACE`: nombres en .git/config.
- `WORKSPACE_NAME_REGEX`: /^[a-zA-Z0-9_-]+$/.
- `EXIT_CODES`: SUCCESS 0, USAGE 1, ENV 2, EXTERNAL 3.

### 7.2 config.js

- `getConfigPath()` → ruta del archivo config.
- `ensureConfigDir()` → crea directorio de config si no existe.
- `loadRaw()` → objeto `{ workspaces: { ... } }` validado (workspaces inválidos eliminados); lanza si JSON corrupto.
- `getWorkspaces()` → objeto nombre → { name, email, identityFile }.
- `getWorkspace(name)` → objeto o null.
- `addWorkspace(name, data)` → escribe workspace (data: name, email, identityFile).
- `removeWorkspace(name)` → elimina; devuelve true/false.
- `updateWorkspace(name, data)` → actualiza solo name/email/identityFile presentes en data; devuelve true/false.
- `writeRaw(raw)` → escritura atómica del objeto raw.

### 7.3 ssh-config.js

- `getSshConfigPath()` → ruta ~/.ssh/config.
- `readSshConfig()` → contenido del archivo.
- `parseSshConfig(content)` → array de bloques { host, options: { hostname, identityFile, user }, raw: [] }.
- `findHostBlock(blocks, hostAlias)` → bloque con ese Host (case-insensitive) o undefined.
- `listIdentityFiles()` → lista de { path, host } (claves existentes en config y en ~/.ssh).
- `ensureHostAlias(aliasHost, hostName, identityFile)` → añade o actualiza bloque Host en ~/.ssh/config; escritura atómica con .gw.tmp.<pid>.
- `removeHostBlocksByWorkspace(workspaceName)` → elimina Host que empiecen por `<workspace>.`; devuelve número eliminado.
- `getHostsForIdentityFile(identityFile)` → array de nombres Host que usan esa clave.

### 7.4 ssh-key-utils.js

- `publicKeyPath(identityFile)` → resuelve ruta `.pub` asociada.
- `readPublicKey(identityFile)` → lee clave pública y devuelve estado de error/éxito.
- `ensureSshRsaPublicKey(identityFile)` → valida existencia/lectura y prefijo `ssh-rsa`.
- `buildBackupSuffix(date?)` → genera sufijo `.bak-YYYYMMDD-HHmmss`.
- `moveIfExists(sourcePath, targetPath)` → mueve un archivo si existe.
- `backupIdentityFiles(identityFile, suffix?)` → crea backup de privada y `.pub`.

### 7.5 url-utils.js

- `parseSshUrl(url)` → { host, pathPart, isSsh } o null.
- `isSshUrl(url)` → boolean.
- `buildAliasedUrl(originalUrl, aliasHost)` → string URL o null.

### 7.6 git-context.js

- `findGitRoot(cwd)` → directorio raíz del repo o null (busca .git hacia arriba).
- `parseGitConfig(content)` → { sections: { "[section]": { key: value } } }.
- `readRepoConfig(cwd)` → { root, parsed } o null.
- `getCurrentWorkspace(cwd)` → nombre workspace del repo o null.
- `getRemotesWithWorkspace(cwd)` → { remoteName: { url, gwWorkspace } }.
- `getRemotesByWorkspace(cwd)` → { workspaceName: [ remoteNames ] }.
- `getRemoteNames(cwd)` → Promise<string[]> (git remote).
- `setGitConfig(cwd, key, value)` → Promise.
- `setRemoteUrl(cwd, remoteName, url)` → Promise.
- `addRemote(cwd, name, url)` → Promise.
- `writeGitConfigSection(cwd, section, key, value)` → añade o actualiza clave en sección; devuelve true/false.

### 7.7 utils/validate.js

- `validateWorkspaceName(name)` → { valid: boolean, message?: string }.
- `validateEmail(email)` → { valid: boolean, message?: string }.

---

## 8. Códigos de salida

| Código | Constante | Significado |
|--------|-----------|-------------|
| 0      | SUCCESS   | Éxito |
| 1      | USAGE     | Error de uso (argumentos, validación) |
| 2      | ENV       | Error de entorno (config corrupta, git no encontrado) |
| 3      | EXTERNAL  | Error en operación externa (ssh-keygen, git clone, etc.) |

---

## 9. Tests

- **Runner**: Node.js `node --test` (test runner nativo).
- **Script npm**: `npm test` ejecuta los archivos en `test/*.test.js` (lista explícita en package.json por compatibilidad Windows).
- **Archivos**:
  - `test/config.test.js`: getWorkspaces, addWorkspace, getWorkspace, removeWorkspace, loadRaw (validación de forma de workspace); usa directorio temporal y mock de homedir.
  - `test/constants.test.js`: EXIT_CODES, WORKSPACE_NAME_REGEX, constantes git config.
  - `test/git-context.test.js`: parseGitConfig, getCurrentWorkspace, getRemotesWithWorkspace, findGitRoot (con .git/config temporal).
  - `test/ssh-config.test.js`: parseSshConfig, findHostBlock (contenido mock).
  - `test/url-utils.test.js`: parseSshUrl, isSshUrl, buildAliasedUrl (formatos git@host:path y ssh://).
  - `test/validate.test.js`: validateWorkspaceName, validateEmail.
  - `test/ssh-key-utils.test.js`: validación de prefijo `ssh-rsa` y casos de `.pub` inexistente/inválido.
  - `test/workspace-key-rotate.test.js`: flujo de rotación (`cancelación`, `backup`, `actualización de identityFile`, error de `ssh-keygen`).

---

## 10. Dependencias y distribución npm

### Dependencias (package.json)

- **commander**: ^12.0.0 — CLI y subcomandos.
- **prompts**: ^2.4.2 — entradas interactivas en workspace add.
- **Engines**: node >= 18.0.0.

### Paquete en el registro npm

- **Nombre**: `@draweb/gw` (paquete con **scope** `@draweb`). No confundir con el nombre corto del binario en consola.
- **Binario global**: sigue siendo **`gw`** (`bin.gw` → `bin/gw.js` en el tarball).
- **Instalación para usuarios**: `npm install -g @draweb/gw`. Alternativa sin instalar globalmente: `npx @draweb/gw <argumentos>`.
- **Archivos publicados** (`files` en package.json): `bin/`, `src/`, `README.md`, `docs/` (los tests no se incluyen en el paquete publicado).
- **publishConfig**: `access: "public"` — el scope se publica como paquete **público** (sin esto, los paquetes scoped serían privados por defecto en npm).
- **Validación local del tarball**: `npm pack --dry-run` debe listar `bin/gw.js`, `package.json` con `bin` intacto y sin advertencias de bin inválido.

---

## 11. Flujos principales (resumen)

1. **Añadir workspace**: validar nombre → pedir/elegir name, email, clave → config.addWorkspace.
2. **Clone con workspace**: validar workspace y URL SSH → aliasHost → ensureHostAlias → git clone (URL aliada) → config local user.name/user.email y [gw] + gwWorkspace en origin.
3. **Push simplificado**: findGitRoot → getCurrentWorkspace → getRemotesByWorkspace → git push a los remotes del workspace (o todos con gwWorkspace si --all-remotes).
4. **Remote con workspace**: ensureHostAlias → git remote add/set-url con URL aliada → writeGitConfigSection gwWorkspace.
5. **Repo link**: mismo flujo que configurar origin con URL aliada + user.name/user.email + [gw] workspace + gwWorkspace en origin.

---

*Documento generado a partir del código fuente del proyecto gw. Versión del documento: 1.0. Creador del proyecto: `draweb.cloud`.*
