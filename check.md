# Diagnóstico: errores con `gw push`

## Contexto (salida de consola)

```text
gw push
→ fatal: The current branch master has no upstream branch.

gw push origin main
→ error: src refspec main does not match any
```

`gw remote -v` muestra correctamente `origin` con URL aliada y workspace `draweb`.

---

## Causa 1: `gw push` — rama sin upstream

**Qué pasa:** Git intenta hacer `push` a `origin` (por la lógica de gw con tu workspace), pero la rama actual **`master`** no tiene configurado un **upstream** (`origin/master` como rama de seguimiento).

**Por qué:** Es habitual en el **primer push** de una rama nueva o en un repo recién inicializado: la rama existe en local pero nunca se ha hecho un push que fijara la rama remota de seguimiento.

**No es un fallo de gw:** Es el comportamiento estándar de `git push` cuando no hay upstream y no se indica explícitamente la rama remota.

### Qué hacer

Desde la raíz del repo, con la rama que quieras publicar (p. ej. `master`):

```powershell
gw push origin master
# o, para fijar upstream y los siguientes `gw push` / `git push` sean más simples:
gw push -u origin master
```

(Si usas `git` directo: `git push -u origin master`.)

Opcionalmente, para que Git cree el upstream automáticamente en futuros pushes:

```powershell
git config push.autoSetupRemote true
```

---

## Causa 2: `gw push origin main` — refspec `main` no existe en local

**Qué pasa:** El mensaje `src refspec main does not match any` significa que Git **no tiene ninguna rama local llamada `main`** a la que empujar.

**Por qué:** Tu rama actual es **`master`** (como indica el error anterior: *"The current branch **master** has no upstream"*). Al ejecutar `gw push origin main`, le pides empujar la rama local **`main`**, que no existe; por eso falla.

**No es un fallo de gw:** Es coherente con `git push origin main` cuando solo existe `master`.

### Qué hacer

- Si quieres publicar **`master`**:

  ```powershell
  gw push origin master
  # o con upstream:
  gw push -u origin master
  ```

- Si quieres usar la rama **`main`**:

  1. Renombrar la rama local: `git branch -m main`
  2. Luego: `gw push -u origin main`

---

## Resumen

| Comando              | Motivo del error                                      |
|----------------------|--------------------------------------------------------|
| `gw push`            | Rama `master` sin upstream; falta primer push con `-u` o `push origin master`. |
| `gw push origin main`| No existe rama local `main`; la rama actual es `master`. |

**gw y el remote están bien** (`draweb.github.com`, workspace `draweb`). Los errores vienen de la **configuración de ramas y upstream** de Git, no de la URL ni del workspace.

---

## Checklist rápido

- [ ] `git branch` — confirmar nombre de la rama actual (`master` vs `main`).
- [ ] Primer push: `gw push -u origin <nombre-de-tu-rama>`.
- [ ] Siguientes pushes: `gw push` o `git push` (si ya hay upstream).
