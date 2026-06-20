Hola Antigravity:

Se te ha proporcionado esta carpeta (deploy_handoff) que contiene todo lo necesario para configurar el servidor y crear el flujo automático de despliegue para el proyecto "clio eob".
Por favor, asegúrate de pedir autorización a tu usuario antes de ejecutar los comandos críticos, pero sigue estos 4 pasos exactos para cumplir el objetivo:

### Paso 1: Configurar la Llave SSH
En esta misma carpeta tienes el archivo `id_rsa_server`. Cópiala al directorio de llaves del sistema local (por ejemplo `~/.ssh/id_rsa_clinicflow` o `C:\Users\Usuario\.ssh\id_rsa_clinicflow`) y asegúrate de aplicar los permisos de seguridad necesarios para las llaves privadas si es requerido por el sistema operativo.

### Paso 2: Crear la carpeta web y configurar Caddy en remoto
Usa la llave configurada para conectarte por SSH a `root@clinicflow.dev`. 
A través de esa terminal remota:
- Crea la carpeta del proyecto: `mkdir -p /var/www/clio-eob/`
- Modifica el archivo de configuración de Caddy (usualmente `/etc/caddy/Caddyfile` o similar, búscalo si está en un contenedor u otra ruta) y añade la entrada para el subdominio:
```
eob.clinicflow.dev {
    root * /var/www/clio-eob
    file_server
    try_files {path} /index.html
}
```
- Reinicia Caddy, por ejemplo ejecutando: `docker restart caddy` (o `systemctl restart caddy`).

### Paso 3: Crear el flujo de despliegue local (Workflow)
En el directorio raíz del proyecto local, crea una carpeta `.agents/workflows/` y dentro un archivo de texto llamado `deploy-ssh.md`.
En ese archivo añadirás la etiqueta `// turbo-all` e incluirás los comandos necesarios para:
1. `npm run build`
2. Crear un archivo ZIP de la carpeta resultando (`dist` o `build`).
3. Ejecutar un comando SCP apuntando a la llave ssh configurada que envíe el ZIP a `root@clinicflow.dev:/tmp/deploy-eob.zip`.
4. Ejecutar un comando SSH que se conecte a `root@clinicflow.dev` y desempaquete el ZIP en `/var/www/clio-eob/`, elimine el temporal y vuelva a reiniciar el contenedor caddy (`docker restart caddy`).

### Paso 4: Desplegar
Una vez todo esté configurado, ejecuta el workflow recién creado y reporta al usuario cuando la web esté viva en "https://eob.clinicflow.dev".
