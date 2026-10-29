---
name: team-flow
description: Flujo de trabajo colaborativo en GitHub y despliegue a producción (Frontend, n8n y Amexzone RPA Bot) usando el programa npm run flow. Úsalo cuando el usuario pida empezar una tarea, sincronizar cambios con su compañero, subir cambios a GitHub o desplegar a clinicflow.dev.
---

# Skill: Flujo de Trabajo Colaborativo (`team-flow`)

## Cuándo usar este Skill
Usa este skill cada vez que el usuario te pida:
- Sincronizar o descargar los cambios que hizo su compañero en GitHub.
- Empezar una nueva funcionalidad o arreglo en una rama limpia.
- Guardar, verificar y subir cambios a GitHub.
- Desplegar cambios al servidor de producción (`clinicflow.dev`).

## Comandos del Programa (`scripts/flow.cjs`)

### 1. Ver estado del proyecto
```bash
npm run flow -- status
```
Muestra la rama actual, cuántos commits está adelante/atrás respecto a `origin/main` y qué archivos están modificados.

### 2. Sincronizar con el equipo (`sync`)
```bash
npm run flow -- sync
```
Descarga los últimos cambios de `origin/main` para mantener el entorno al día con el compañero.

### 3. Empezar una nueva tarea (`start`)
```bash
npm run flow -- start <nombre-corto-tarea>
```
Crea y cambia automáticamente a una rama limpia `feat/<nombre-corto-tarea>` basada en `origin/main`.

### 4. Guardar y subir a GitHub (`save`)
```bash
npm run flow -- save "feat: descripción clara del cambio"
```
1. Ejecuta `npm run build` (`tsc -b && vite build`) para asegurar que no hay errores de TypeScript.
2. Hace `git add -A` y `git commit`.
3. Hace `git push -u origin <rama>` y entrega el enlace directo para crear/fusionar el Pull Request en GitHub.

### 5. Desplegar a producción (`deploy`)
```bash
# Desplegar todo (Frontend + n8n + RPA Bot)
npm run flow -- deploy all

# Desplegar solo Frontend web a https://notes.clinicflow.dev
npm run flow -- deploy web

# Desplegar solo workflows de n8n
npm run flow -- deploy n8n

# Desplegar solo el RPA Bot de Amexzone
npm run flow -- deploy bot
```
