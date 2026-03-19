# gw – Git Workspace CLI

**gw** es una interfaz de línea de comandos que se comporta como **git**, pero añade **workspaces**: perfiles con nombre, email de commit y **clave SSH propia**. Así puedes trabajar en el mismo ordenador con varias identidades (cliente, empresa personal, cuenta secundaria, open source, etc.) sin estar cambiando a mano `git config` global ni confundir qué clave usa cada repositorio.

---

## El problema que resuelve

Si tienes **más de un contexto** en Git (dos cuentas de GitHub/GitLab, trabajo y personal, varios clientes…), suele pasar esto:

| Situación | Dolor habitual |
|-----------|----------------|
| Varios usuarios en el mismo PC | `git config user.name` / `user.email` global solo admite **una** identidad; los commits salen con el autor equivocado. |
| Varias claves SSH | Sin reglas claras en `~/.ssh/config`, **SSH elige la clave incorrecta** y falla el push o accedes con la cuenta que no toca. |
| Cambiar de repo | Tienes que acordarte de reconfigurar el repo o exportar `GIT_SSH_COMMAND`… fácil de olvidar y poco reproducible. |
| Clonar con la identidad correcta | Clonas con HTTPS o una URL genérica y luego arreglas a mano remotes y credenciales. |

**gw** automatiza eso: cada **workspace** guarda *quién eres en git* y *qué clave SSH usar*; al clonar o enlazar un repo, gw escribe la configuración local del repositorio y crea **alias SSH** del tipo `miempresa.github.com` que apuntan al host real con la clave adecuada.

---

## La solución en una frase

> **Un workspace = una identidad git + una clave SSH.** Los repos que creas o enlazas con `-w <workspace>` quedan configurados para usar solo esa identidad y esa clave, sin tocar tu configuración global de git.

---

## Qué obtienes con gw

- **Identidades aisladas**: `user.name` y `user.email` por repositorio cuando usas clone/init/repo link con workspace.
- **SSH predecible**: entradas en `~/.ssh/config` (`Host <workspace>.<servidor>`) para que cada URL use la clave del workspace correcto.
- **Menos comandos repetidos**: `gw push`, `gw pull` y `gw fetch` pueden usar el workspace y los remotes ya marcados en `.git/config` (sin repetir `origin` si no quieres).
- **Compatibilidad con git**: cualquier comando que **no** sea propio de gw se ejecuta como **`git …`**. Puedes sustituir `git` por `gw` en el día a día y seguir usando `gw status`, `gw commit`, `gw log`, etc.
- **Varios remotes / mirrors**: puedes asociar remotes a un workspace y usar `--all-remotes` en push/fetch cuando lo necesites.

---

## Para quién es

- Desarrolladores con **cuenta personal y de trabajo** (o varios clientes) en el mismo equipo.
- Equipos que quieren **documentar y repetir** cómo se configura la identidad por proyecto sin scripts ad hoc.
- Quien ya usa SSH con git y quiere **dejar de pelear** con `IdentityFile` y commits con el autor incorrecto.

---

## Requisitos

- **Node.js** >= 18
- **git** instalado y en PATH
- **OpenSSH** (ssh-keygen) para generar claves

## Instalación

El paquete en npm es **[@draweb/gw](https://www.npmjs.com/package/@draweb/gw)** (scope `@draweb`). El ejecutable global sigue llamándose **`gw`**.

```bash
npm install -g @draweb/gw
```

Comprueba la instalación:

```bash
gw --version
gw --help
```

**Ejecutar sin instalar globalmente** (usa la última versión publicada al vuelo):

```bash
npx @draweb/gw --help
```

### Desarrollo (desde el repositorio clonado)

```bash
cd git_workspace
npm install
npm link
```

Tras `npm link`, el comando `gw` apunta al código local del repo.

Si `npm install -g @draweb/gw` responde **404**, la versión aún no está publicada en el registro: publica con `npm publish` desde este repo (cuenta npm con acceso al scope **@draweb** y 2FA/token según política de npm).

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
# Imprimir la clave pública en consola (para pegar en GitHub/GitLab):
gw workspace pubkey draweb
# En Windows, copiar al portapapeles:
gw workspace pubkey draweb | clip
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

## Ayuda en consola

- `gw -h` / `gw --help` — visión general del CLI.
- `gw workspace --help` — subcomandos de workspace (`add`, `list`, `show`, `pubkey`, `current`, `edit`, `remove`, …).

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
