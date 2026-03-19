# gw – Git Workspace CLI

CLI tipo git que añade **workspaces**: cada workspace asocia un usuario git (name, email) y una clave SSH. Permite clonar y trabajar con varios repos usando distintas identidades sin cambiar la config global.

Cualquier comando que no sea propio de gw se reenvía a **git**; puedes usar `gw` en lugar de `git` en el día a día.

## Requisitos

- **Node.js** >= 18
- **git** instalado y en PATH
- **OpenSSH** (ssh-keygen) para generar claves

## Instalación

```bash
npm install -g gw
```

O desde el repo:

```bash
cd git_workspace
npm link
```

## Uso básico

### 1. Crear un workspace

```bash
gw workspace add draweb
```

Te pedirá nombre y email para git, y si usar una clave SSH existente o generar una nueva (estándar GitHub: Ed25519).

Modo no interactivo (scripts):

```bash
gw workspace add draweb --name "Tu Nombre" --email tu@email.com --new-key
# o con clave existente:
gw workspace add draweb --name "Tu Nombre" --email tu@email.com --identity-file ~/.ssh/id_ed25519_draweb
```

### 2. Clonar con un workspace

```bash
gw clone -w draweb git@github.com:usuario/repo.git
```

gw crea un alias SSH (`draweb.github.com`) en `~/.ssh/config` con la clave del workspace, clona el repo y configura `user.name` y `user.email` en el repo, y guarda el workspace asociado en `.git/config` para push/pull simplificados.

Argumentos extra de `git clone` se pasan igual:

```bash
gw clone -w draweb git@github.com:usuario/repo.git mi-carpeta --depth 1
```

### 3. Listar y gestionar workspaces

```bash
gw workspace list
gw workspace show draweb
gw workspace remove draweb
gw workspace remove draweb --clean-ssh   # y quitar hosts de ~/.ssh/config
gw workspace current   # dentro de un repo: workspace asociado
gw workspace edit draweb --email nuevo@email.com
```

### 4. Remotes con workspace (mirrors)

Añadir un remote con identidad de un workspace:

```bash
gw remote add origin -w draweb git@github.com:usuario/repo.git
gw remote set-url origin -w draweb git@github.com:usuario/repo.git
```

Listar remotes mostrando el workspace:

```bash
gw remote -v
# o
gw remote list
```

### 5. Push, pull y fetch simplificados

Dentro de un repo que tiene `[gw] workspace` y remotes con `gwWorkspace`:

- **`gw push`** – push al remote del workspace actual (p. ej. origin)
- **`gw pull`** – pull desde el remote del workspace actual
- **`gw fetch`** – fetch desde los remotes del workspace actual
- **`gw push --all-remotes`** – push a todos los remotes con workspace (mirrors)
- **`gw fetch --all-remotes`** – fetch de todos

Si indicas el remote explícitamente (`gw push origin`), se reenvía a git sin cambiar el comportamiento.

### 6. Init y asociar repo existente

```bash
gw init -w draweb
# o en un repo ya clonado (con origin SSH):
gw repo link -w draweb
```

### 7. Diagnóstico

```bash
gw doctor
```

Comprueba que las claves de los workspaces existan y que `~/.ssh/config` sea escribible.

## Passthrough a git

Cualquier comando que no sea los anteriores se ejecuta con git:

```bash
gw status
gw commit -m "mensaje"
gw branch -a
gw log --oneline
```

Para la ayuda de un comando de git: `gw commit --help` muestra la ayuda de `git commit`.

## Configuración

- **Config de gw**: `~/.gw/config.json` (Windows: `%USERPROFILE%\.gw\config.json`). Contiene la lista de workspaces (name, email, identityFile).
- **SSH**: gw escribe en `~/.ssh/config` bloques `Host <workspace>.<host>` para usar la clave correcta por workspace.
- **Repo**: en `.git/config` se guarda `[gw] workspace = <nombre>` y en cada remote `gwWorkspace = <nombre>` cuando usas gw para clonar o añadir remotes.

## Códigos de salida

- `0` – éxito
- `1` – error de uso (argumentos, validación)
- `2` – error de entorno (config corrupta, git no encontrado)
- `3` – error en operación externa (ssh-keygen, git clone, etc.)

## Documentación técnica

Especificación técnica completa (arquitectura, APIs, formatos de config, flujos y códigos de salida): **[docs/ESPECIFICACION_TECNICA.md](docs/ESPECIFICACION_TECNICA.md)**.

## Licencia

MIT
